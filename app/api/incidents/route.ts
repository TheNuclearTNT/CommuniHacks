import { asc, desc, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import type {
  IncidentListItem,
  IncidentType,
  Role,
  Status,
} from '@/lib/types';
import { getCurrentUser, handleApiError } from '@/lib/workflow/auth';
import { extractLocation } from '@/lib/workflow/rules';
import { submitNewIncident, WorkflowError } from '@/lib/workflow/transition';

function defaultScopeForRole(role: Role): 'mine' | 'queue' | 'inbox' | 'ea' | 'all' {
  switch (role) {
    case 'STAFF':
      return 'mine';
    case 'SUPERVISOR':
      return 'queue';
    case 'EXEC_ASSISTANT':
      return 'ea';
    case 'EXECUTIVE':
      return 'all';
    default:
      return 'inbox';
  }
}

export async function GET(req: Request) {
  try {
    const me = await getCurrentUser();
    const { searchParams } = new URL(req.url);

    const rawScope = searchParams.get('scope')?.trim() as
      | 'mine'
      | 'queue'
      | 'inbox'
      | 'ea'
      | 'all'
      | undefined;
    const scope = rawScope || defaultScopeForRole(me.role);
    const statusParam = searchParams.get('status')?.trim() as Status | undefined;
    const typeParam = searchParams.get('type')?.trim() as IncidentType | undefined;
    const siteParam = searchParams.get('site')?.trim();

    if (scope === 'all' && me.role !== 'EXECUTIVE') {
      throw new WorkflowError(
        `Role ${me.role} is not permitted to view scope=all (requires EXECUTIVE)`,
        403,
      );
    }

    const db = await getDb();

    const [incidentRows, unackedRows, unmetClockRows] = await Promise.all([
      db.select().from(schema.incidents).orderBy(desc(schema.incidents.createdAt)),
      db
        .select()
        .from(schema.acknowledgements)
        .where(isNull(schema.acknowledgements.ackedAt)),
      db
        .select()
        .from(schema.complianceClocks)
        .where(isNull(schema.complianceClocks.metAt))
        .orderBy(asc(schema.complianceClocks.dueAt)),
    ]);

    // Map earliest unmet clock per incidentId
    const nextClockByIncident = new Map<string, string>();
    for (const clk of unmetClockRows) {
      if (!nextClockByIncident.has(clk.incidentId)) {
        nextClockByIncident.set(clk.incidentId, new Date(clk.dueAt).toISOString());
      }
    }

    // Map unacked roles per (incidentId, cycle)
    const unackedRolesByIncidentCycle = new Map<string, Set<Role>>();
    for (const ack of unackedRows) {
      const key = `${ack.incidentId}:${ack.cycle}`;
      if (!unackedRolesByIncidentCycle.has(key)) {
        unackedRolesByIncidentCycle.set(key, new Set<Role>());
      }
      unackedRolesByIncidentCycle.get(key)!.add(ack.role);
    }

    let filtered = incidentRows.filter((inc) => {
      if (scope === 'mine') {
        return inc.submittedBy === me.id;
      }
      if (scope === 'queue') {
        return inc.supervisorId === me.id;
      }
      if (scope === 'inbox') {
        const unackedSet = unackedRolesByIncidentCycle.get(`${inc.id}:${inc.cycle}`);
        return Boolean(unackedSet && unackedSet.has(me.role));
      }
      if (scope === 'ea') {
        if (statusParam) {
          return inc.status === statusParam;
        }
        return inc.status === 'WITH_EA';
      }
      return true;
    });

    // Apply optional filters (status, type, site)
    if (statusParam) {
      filtered = filtered.filter((inc) => inc.status === statusParam);
    }
    if (typeParam) {
      filtered = filtered.filter((inc) =>
        (inc.types ?? []).includes(typeParam),
      );
    }
    if (siteParam) {
      const targetSite = siteParam.toLowerCase();
      filtered = filtered.filter(
        (inc) =>
          (inc.site || extractLocation(inc.answers ?? {})).toLowerCase() ===
          targetSite,
      );
    }

    const items: IncidentListItem[] = filtered.map((inc) => {
      const firstBullet = inc.ai?.summaryBullets?.[0]?.trim();
      const rawQ32 =
        typeof inc.answers?.q32 === 'string' ? inc.answers.q32.trim() : '';
      const oneLiner =
        firstBullet ||
        (rawQ32.length > 90 ? rawQ32.slice(0, 90) : rawQ32) ||
        `Incident ${inc.id}`;

      return {
        id: inc.id,
        status: inc.status,
        cycle: inc.cycle,
        createdAt: new Date(inc.createdAt).toISOString(),
        location: inc.site || extractLocation(inc.answers ?? {}),
        types: (inc.types ?? []) as IncidentType[],
        severity: inc.severity || 'Unsure',
        oneLiner,
        currentOwnerRoles: (inc.currentOwnerRoles ?? []) as Role[],
        nextClockDueAt: nextClockByIncident.get(inc.id) ?? null,
      };
    });

    // B8: For queue, sort Critical first, then soonest clock, then newest
    if (scope === 'queue') {
      items.sort((a, b) => {
        const aCrit = a.severity === 'Critical' ? 0 : 1;
        const bCrit = b.severity === 'Critical' ? 0 : 1;
        if (aCrit !== bCrit) return aCrit - bCrit;

        if (a.nextClockDueAt && b.nextClockDueAt) {
          const diff =
            new Date(a.nextClockDueAt).getTime() -
            new Date(b.nextClockDueAt).getTime();
          if (diff !== 0) return diff;
        } else if (a.nextClockDueAt && !b.nextClockDueAt) {
          return -1;
        } else if (!a.nextClockDueAt && b.nextClockDueAt) {
          return 1;
        }

        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    } else {
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return NextResponse.json(items);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const me = await getCurrentUser();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      throw new WorkflowError('Invalid JSON payload', 400, {
        body: 'Expected JSON object',
      });
    }

    const incident = await submitNewIncident(me, {
      answers: body.answers,
      transcript:
        typeof body.transcript === 'string' ? body.transcript : undefined,
      footageHoldRequested: Boolean(body.footageHoldRequested),
      anonymous: body.anonymous === true,
    });

    return NextResponse.json(incident);
  } catch (err) {
    return handleApiError(err);
  }
}

