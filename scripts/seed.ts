// Seeds ~200 fictional demo incidents with planted patterns (Ananya, B3).
//
// Each record goes through Connan's workflow engine (`transition()`), so the
// rules create its acknowledgements, actions, clocks and events. The engine
// stamps everything "now", so afterwards the seed moves each record's
// timestamps onto its planned 12-week timeline.
//
// The workflow runs against a throwaway in-memory database, and the finished
// rows are then copied to the real one in a few bulk inserts: a hosted
// Postgres is far too slow for the ~8,000 small queries the workflow makes.
//
//   npx tsx --env-file=.env.local scripts/seed.ts   # DATABASE_URL from .env.local
//   npm run seed                                     # local PGlite (.pgdata); doesn't read .env.local
//   ... scripts/seed.ts --dry     # just print the plan
//
// Wipes all existing incidents first (users are kept). Stop `npm run dev`
// first when using local PGlite: only one process can open .pgdata.
// AI analysis runs in mock mode unless SEED_REAL_AI=true.
//
// FICTIONAL DEMO DATA ONLY.

import { and, eq, sql } from 'drizzle-orm';
import type { IncidentDetail, Status, User } from '@/lib/types';
import type { DemoPlan, PlanCycle } from '@/lib/mock/ananya';

const DRY = process.argv.includes('--dry');
const HOUR = 3_600_000;

if (process.env.SEED_REAL_AI !== 'true') process.env.USE_MOCK_AI = 'true';
// Don't let getDb() insert Connan's 5 baseline incidents; this seed replaces them.
process.env.SKIP_DEMO_SEED = 'true';

const plusMs = (iso: string, ms: number) => new Date(Date.parse(iso) + ms).toISOString();

function summarise(plans: DemoPlan[]) {
  const by = (f: (p: DemoPlan) => string) =>
    plans.reduce<Record<string, number>>((acc, p) => ((acc[f(p)] = (acc[f(p)] ?? 0) + 1), acc), {});
  console.log('Planned by status:', by((p) => p.status));
  console.log('Planned by first type:', by((p) => p.types[0]));
  console.log('Planted patterns:', by((p) => p.pattern ?? 'none'));
}

async function main() {
  // Imported after the env tweaks above, so getDb() and the AI client see them.
  const { getDb, resetTestDb, schema } = await import('@/lib/db');
  const { transition } = await import('@/lib/workflow/transition');
  const { buildComplianceClocks } = await import('@/lib/workflow/clocks');
  const { SEED_USERS } = await import('@/lib/mock/connan');
  const { generateDemoPlans } = await import('@/lib/mock/ananya');

  const now = Math.floor(Date.now() / HOUR) * HOUR;
  const plans = generateDemoPlans(now);
  summarise(plans);
  if (DRY) return;

  const target = await getDb(); // DATABASE_URL, or local PGlite in .pgdata
  const db = await resetTestDb(); // in-memory; transition() now uses this too
  const users = new Map(SEED_USERS.map((u) => [u.id, u]));
  const user = (id: string): User => {
    const u = users.get(id);
    if (!u) throw new Error(`Unknown seed user ${id}`);
    return u;
  };


  async function runCycle(id: string, plan: DemoPlan, c: PlanCycle) {
    const sup = user(plan.supervisorId);
    if (!c.openedAt) return;
    await transition(id, 'open', sup);
    if (!c.review) return;
    let detail: IncidentDetail = await transition(id, 'review', sup, c.review);
    for (const a of c.acks) {
      if (!a.at) continue;
      const row = detail.acknowledgements.find((x) => x.cycle === c.cycle && x.role === a.role && !x.ackedBy);
      if (!row) throw new Error(`${id}: engine created no ${a.role} acknowledgement in cycle ${c.cycle}`);
      detail = await transition(id, 'ack', user(a.userId), { ackId: row.id, comment: 'Acknowledged. Fictional demo record.' });
    }
    if (c.eaReceivedAt) await transition(id, 'receive', user('u_ea'));
  }

  // Moves every timestamp the engine wrote onto the plan's timeline.
  async function retime(id: string, plan: DemoPlan) {
    const cyc = (n: number) => plan.cycles.find((c) => c.cycle === n);
    const last = plan.cycles[plan.cycles.length - 1];

    await db
      .update(schema.incidents)
      .set({ createdAt: plan.createdAt, closedAt: plan.status === 'CLOSED' && last.eaReceivedAt ? plusMs(last.eaReceivedAt, 1) : null })
      .where(eq(schema.incidents.id, id));

    for (const c of plan.cycles) {
      if (c.reviewedAt) {
        await db
          .update(schema.supervisorReviews)
          .set({ submittedAt: c.reviewedAt })
          .where(and(eq(schema.supervisorReviews.incidentId, id), eq(schema.supervisorReviews.cycle, c.cycle)));
      }
      for (const a of c.acks) {
        if (!a.at) continue;
        await db
          .update(schema.acknowledgements)
          .set({ ackedAt: a.at })
          .where(and(eq(schema.acknowledgements.incidentId, id), eq(schema.acknowledgements.cycle, c.cycle), eq(schema.acknowledgements.role, a.role)));
      }
    }

    // Events: delete and re-insert (the time column can't always be updated in place on a Timescale hypertable).
    const evs = await db.select().from(schema.events).where(eq(schema.events.incidentId, id));
    const timeFor = (e: (typeof evs)[number]): string | null | undefined => {
      const c = cyc(e.cycle);
      switch (e.kind) {
        case 'SUBMITTED':
          return plan.createdAt;
        case 'REOPENED':
          return plan.reopen?.at;
        case 'OPENED':
          return c?.openedAt;
        case 'REVIEW_SUBMITTED':
          return c?.reviewedAt;
        case 'ROUTED':
          return c?.reviewedAt && plusMs(c.reviewedAt, 1);
        case 'ACKNOWLEDGED':
          return c?.acks.find((a) => a.userId === e.actorId)?.at;
        case 'EA_RECEIVED':
          return c?.eaReceivedAt;
        case 'CLOSED':
          return c?.eaReceivedAt && plusMs(c.eaReceivedAt, 1);
        default:
          return null;
      }
    };
    const retimed = evs.map((e) => {
      const t = timeFor(e);
      if (!t) throw new Error(`${id}: no planned time for ${e.kind} event in cycle ${e.cycle}`);
      return { ...e, time: t };
    });
    await db.delete(schema.events).where(eq(schema.events.incidentId, id));
    if (retimed.length) await db.insert(schema.events).values(retimed);

    // Follow-up actions: due dates relative to the planned review, and DONE where the plan says so.
    const actions = await db.select().from(schema.followUpActions).where(eq(schema.followUpActions.incidentId, id));
    let markedInProgress = false;
    for (const a of actions) {
      const cycleNo =
        a.kind === 'REOPEN_NOTE'
          ? 2
          : a.kind === 'FOOTAGE_HOLD'
            ? Number(/_c(\d+)$/.exec(a.id)?.[1] ?? 1)
            : (plan.cycles.find((c) => c.review?.correctiveActions.some((ca) => ca.dueAt === new Date(a.dueAt).toISOString()))?.cycle ?? 1);
      const c = cyc(cycleNo);
      let dueAt = a.dueAt;
      if (a.kind === 'FOOTAGE_HOLD' && c?.reviewedAt) dueAt = plusMs(c.reviewedAt, 24 * HOUR);
      if (a.kind === 'REOPEN_NOTE' && plan.reopen) dueAt = plusMs(plan.reopen.at, 7 * 24 * HOUR);
      const doneAt = c?.actionsDoneAt ?? null;
      const inProgress: boolean = !doneAt && !markedInProgress && a.kind === 'CORRECTIVE' && plan.status !== 'CLOSED';
      markedInProgress ||= inProgress;
      await db
        .update(schema.followUpActions)
        .set({ dueAt, status: doneAt ? 'DONE' : inProgress ? 'IN_PROGRESS' : 'NOT_STARTED', completedAt: doneAt })
        .where(eq(schema.followUpActions.id, a.id));
    }

    // Compliance clocks: restart from the planned review time using Connan's rules; met times from the plan.
    const clocks = await db.select().from(schema.complianceClocks).where(eq(schema.complianceClocks.incidentId, id));
    for (const k of clocks) {
      const c = cyc(Number(/_c(\d+)_/.exec(k.id)?.[1] ?? 1));
      if (!c?.review || !c.reviewedAt) continue;
      const spec = buildComplianceClocks(c.review, c.reviewedAt).find((s) => s.kind === k.kind);
      if (!spec) continue;
      const planned = c.cycle === 1 ? plan.clocks.find((p) => p.kind === k.kind) : undefined;
      const fallbackMet = plusMs(c.reviewedAt, 20 * HOUR);
      const metAt = planned ? planned.metAt : Date.parse(fallbackMet) < now ? fallbackMet : null;
      await db
        .update(schema.complianceClocks)
        .set({ startedAt: spec.startedAt, dueAt: spec.dueAt, metAt })
        .where(eq(schema.complianceClocks.id, k.id));
    }
  }

  const actual: Record<string, number> = {};
  for (const [i, plan] of plans.entries()) {
    const created = await transition('', 'submit', user(plan.submittedBy), {
      answers: plan.answers,
      footageHoldRequested: plan.footageHoldRequested,
    });
    const id = created.incident.id;
    for (const c of plan.cycles) {
      if (c.cycle > 1 && plan.reopen) await transition(id, 'reopen', user('u_ea'), { reason: plan.reopen.reason });
      await runCycle(id, plan, c);
    }
    await retime(id, plan);

    const [row] = await db.select({ status: schema.incidents.status }).from(schema.incidents).where(eq(schema.incidents.id, id));
    const status: Status = row.status;
    actual[status] = (actual[status] ?? 0) + 1;
    if (status !== plan.status) console.warn(`! ${id}: planned ${plan.status}, engine ended at ${status}`);
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${plans.length}`);
  }

  // ----- copy to the real database -----
  const [incidents, reviews, acks, actions, clocks, events] = await Promise.all([
    db.select().from(schema.incidents),
    db.select().from(schema.supervisorReviews),
    db.select().from(schema.acknowledgements),
    db.select().from(schema.followUpActions),
    db.select().from(schema.complianceClocks),
    db.select().from(schema.events),
  ]);
  const chunks = <T,>(xs: T[], n = 250) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
  await target.transaction(async (tx) => {
    await tx.delete(schema.incidents); // reviews, acks, actions, clocks and events cascade
    for (const c of chunks(incidents)) await tx.insert(schema.incidents).values(c);
    for (const c of chunks(reviews)) await tx.insert(schema.supervisorReviews).values(c);
    for (const c of chunks(acks)) await tx.insert(schema.acknowledgements).values(c);
    for (const c of chunks(actions)) await tx.insert(schema.followUpActions).values(c);
    for (const c of chunks(clocks)) await tx.insert(schema.complianceClocks).values(c);
    for (const c of chunks(events)) await tx.insert(schema.events).values(c);
    await tx.execute(sql`SELECT setval('incident_id_seq', ${incidents.length})`);
  });
  console.log(`Replaced all incidents in the target database (${incidents.length} incidents, ${events.length} events).`);

  console.log('Seeded by status:', actual);
  console.log(`Done: ${plans.length} fictional incidents.`);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.stack ?? e.message : e);
    process.exit(1);
  });
