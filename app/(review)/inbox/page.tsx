'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, ClockChip, SeverityDot, StatusPill, TypeChip } from '@/components/ui';
import { ackIncident, getIncidents, getMe } from '@/lib/api-client';
import { MOCK_NEEL_LIST } from '@/lib/mock/neel';
import { getRoleLabel } from '@/lib/question-labels';
import type { IncidentListItem, Role } from '@/lib/types';

export default function SpecialtyInboxPage() {
  const [items, setItems] = useState<IncidentListItem[]>([]);
  const [role, setRole] = useState<Role>('PRIVACY_OFFICER');
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [expandedAckId, setExpandedAckId] = useState<string | null>(null);

  const loadInbox = useCallback(() => {
    Promise.all([
      getMe().catch(() => ({ id: 'u-privacy', name: 'Priya Nair', role: 'PRIVACY_OFFICER' as Role })),
      getIncidents({ scope: 'inbox' }).catch(() => MOCK_NEEL_LIST),
    ])
      .then(([me, data]) => {
        setRole(me.role);
        setUserName(me.name);
        setItems(
          data.filter(
            (item) => item.currentOwnerRoles.includes(me.role) || item.status === 'SPECIALTY_REVIEW',
          ),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadInbox();
    const handleRoleChanged = () => loadInbox();
    window.addEventListener('langs:role-changed', handleRoleChanged);
    return () => window.removeEventListener('langs:role-changed', handleRoleChanged);
  }, [loadInbox]);

  const handleQuickAck = async (incidentId: string) => {
    setAckingId(incidentId);
    try {
      const comment = commentMap[incidentId]?.trim() || `Reviewed and acknowledged by ${getRoleLabel(role)}.`;
      await ackIncident(incidentId, { ackId: role, comment });
      setExpandedAckId(null);
      loadInbox();
    } finally {
      setAckingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
            Stage 3 · Parallel Specialty Acknowledgement
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Specialty Role Inbox
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review routed incidents requiring sign-off from your specialty office before Executive Assistant filing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {userName ? <span className="text-xs font-medium text-slate-500">{userName}</span> : null}
          <Badge tone="blue">{getRoleLabel(role)}</Badge>
        </div>
      </div>

      {loading ? <p className="text-slate-500">Loading your inbox…</p> : null}

      {!loading && items.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm font-medium text-slate-800">
            No incidents are currently waiting for acknowledgement from <strong>{getRoleLabel(role)}</strong>.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tip: Use the Persona Switcher in the top right header to switch between Privacy Officer, JOHSC Chair, IT / Facilities, CID Group, or Director of Operations.
          </p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const isRolePending = item.currentOwnerRoles.includes(role);
          const isExpanded = expandedAckId === item.id;
          return (
            <Card key={item.id} className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <SeverityDot severity={item.severity} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/records/${item.id}`}
                        className="font-mono text-base font-bold text-slate-900 hover:text-blue-700"
                      >
                        {item.id}
                      </Link>
                      <StatusPill status={item.status} />
                      {isRolePending ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          Awaiting your sign-off
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-800">{item.oneLiner}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {item.types.map((type) => (
                        <TypeChip key={`${item.id}-${type}`} type={type} />
                      ))}
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-medium text-slate-600">{item.location}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString('en-CA')}
                      </span>
                      {item.currentOwnerRoles.length > 0 ? (
                        <>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500">
                            Pending: {item.currentOwnerRoles.map(getRoleLabel).join(', ')}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <ClockChip dueAt={item.nextClockDueAt} />
                  <Link
                    href={`/records/${item.id}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    View record
                  </Link>
                  <Button
                    variant="primary"
                    onClick={() =>
                      setExpandedAckId((prev) => (prev === item.id ? null : item.id))
                    }
                  >
                    Acknowledge
                  </Button>
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-3.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Acknowledgement note ({getRoleLabel(role)})
                  </label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={commentMap[item.id] ?? ''}
                      onChange={(e) =>
                        setCommentMap((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Add optional review note or compliance confirmation..."
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setExpandedAckId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        disabled={ackingId === item.id}
                        onClick={() => handleQuickAck(item.id)}
                      >
                        {ackingId === item.id ? 'Signing off…' : 'Confirm sign-off'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
