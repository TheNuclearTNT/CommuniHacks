'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, TypeChip } from '@/components/ui';
import { getIncident, openIncident, reviewIncident } from '@/lib/api-client';
import { getNeelMockIncident } from '@/lib/mock/neel';
import { requiredAcks } from '@/lib/workflow/rules';
import type { IncidentDetail, IncidentType, SupervisorReviewInput } from '@/lib/types';

type ActionOwnerRole = 'SUPERVISOR' | 'PRIVACY_OFFICER' | 'JOHSC_CHAIR' | 'IT_FACILITIES' | 'DIRECTOR_OPS';

const defaultReview: SupervisorReviewInput = {
  confirmedTypes: ['PRIVACY'],
  severity: 'Less Serious',
  seriousBehavioural: false,
  healthCareBeyondFirstAid: false,
  lostTime: false,
  criticalInjury: false,
  correctiveActions: [],
  footageHold: false,
  notes: '',
};

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (value == null) return 'Not answered';
  return String(value);
}

export default function SupervisorReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<IncidentType[]>(['PRIVACY']);
  const [form, setForm] = useState<SupervisorReviewInput>(defaultReview);

  useEffect(() => {
    if (!id) return;

    let active = true;

    async function load() {
      try {
        const base = await getIncident(id).catch(() => getNeelMockIncident(id) ?? null);
        if (!base || !active) return;
        if (['SUBMITTED', 'REOPENED'].includes(base.incident.status)) {
          await openIncident(id);
        }
        const refreshed = (await getIncident(id).catch(() => base)) ?? base;
        if (!active) return;
        const draft = refreshed.incident.ai?.draftReview ?? {};
        const nextTypes = draft.confirmedTypes ?? refreshed.incident.ai?.suggestedTypes ?? ['PRIVACY'];
        const nextForm: SupervisorReviewInput = {
          confirmedTypes: nextTypes,
          severity: draft.severity ?? 'Less Serious',
          seriousBehavioural: Boolean(draft.seriousBehavioural),
          healthCareBeyondFirstAid: Boolean(draft.healthCareBeyondFirstAid),
          lostTime: Boolean(draft.lostTime),
          criticalInjury: Boolean(draft.criticalInjury),
          correctiveActions: draft.correctiveActions ?? [],
          footageHold: Boolean(draft.footageHold ?? refreshed.incident.footageHoldRequested),
          notes: draft.notes ?? '',
        };
        setDetail(refreshed);
        setSelectedTypes(nextTypes);
        setForm(nextForm);
      } catch {
        if (active) {
          const fallback = getNeelMockIncident(id);
          if (fallback) {
            const nextTypes = fallback.incident.ai?.suggestedTypes ?? ['PRIVACY'];
            setDetail(fallback);
            setSelectedTypes(nextTypes);
            setForm({
              confirmedTypes: nextTypes,
              severity: 'Less Serious',
              seriousBehavioural: false,
              healthCareBeyondFirstAid: false,
              lostTime: false,
              criticalInjury: false,
              correctiveActions: [],
              footageHold: Boolean(fallback.incident.footageHoldRequested),
              notes: fallback.incident.ai?.draftReview?.notes ?? '',
            });
          }
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const routePreview = useMemo(
    () => requiredAcks({ confirmedTypes: selectedTypes, seriousBehavioural: form.seriousBehavioural }),
    [form.seriousBehavioural, selectedTypes],
  );

  const handleToggleType = (type: IncidentType) => {
    setSelectedTypes((current) => {
      const exists = current.includes(type);
      const next = exists ? current.filter((value) => value !== type) : [...current, type];
      setForm((prev) => ({ ...prev, confirmedTypes: next }));
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!id) return;
    await reviewIncident(id, { ...form, confirmedTypes: selectedTypes });
    router.push('/supervisor');
  };

  if (!detail) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <EmptyState title="Review is loading" description="Opening the incident and preparing the Supervisor Review form." />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Supervisor review</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{detail.incident.id}</h1>
        </div>
        <Link href="/supervisor" className="text-sm font-medium text-blue-700 underline-offset-2 hover:underline">
          Back to queue
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-slate-900">Report snapshot</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(detail.incident.answers ?? {}).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{key}</p>
                  <p className="mt-1 text-sm text-slate-700">{formatAnswer(value)}</p>
                </div>
              ))}
            </div>
          </Card>

          {detail.incident.transcript ? (
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-slate-900">Transcript</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">{detail.incident.transcript}</p>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {detail.incident.ai ? (
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-slate-900">AI summary</h2>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-700">
                  AI-generated — check
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {detail.incident.ai.summaryBullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {detail.incident.ai?.discrepancies?.length ? (
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-slate-900">Discrepancies</h2>
              <div className="mt-3 space-y-2">
                {detail.incident.ai.discrepancies.map((item, index) => (
                  <div key={`${item.field}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.field}</span>
                      <button type="button" className="text-xs font-semibold text-amber-700 underline-offset-2 hover:underline">
                        Dismiss
                      </button>
                    </div>
                    <p className="mt-1">{item.note}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="p-4">
            <h2 className="text-lg font-semibold text-slate-900">Supervisor Review — Proposed, Langs to confirm</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-800">Confirmed incident types</p>
                <div className="flex flex-wrap gap-2">
                  {(['PRIVACY', 'STAFF_INJURY', 'FACILITIES', 'IT_CYBER', 'BEHAVIOURAL', 'CID'] as IncidentType[]).map((type) => (
                    <label key={type} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => handleToggleType(type)}
                      />
                      <TypeChip type={type} />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800">Severity</label>
                <select
                  value={form.severity}
                  onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value as SupervisorReviewInput['severity'] }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="Critical">Critical</option>
                  <option value="Less Serious">Less Serious</option>
                  <option value="Unsure">Unsure</option>
                </select>
              </div>

              {selectedTypes.includes('BEHAVIOURAL') ? (
                <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <span>Serious behavioural?</span>
                  <input
                    type="checkbox"
                    checked={form.seriousBehavioural}
                    onChange={(event) => setForm((prev) => ({ ...prev, seriousBehavioural: event.target.checked }))}
                  />
                </label>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { key: 'healthCareBeyondFirstAid', label: 'Health care beyond first aid' },
                  { key: 'lostTime', label: 'Lost time' },
                  { key: 'criticalInjury', label: 'Critical injury' },
                ].map((item) => (
                  <label key={item.key} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(form[item.key as keyof SupervisorReviewInput])}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [item.key]: event.target.checked,
                        }))
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-800">Corrective actions</p>
                <div className="space-y-2">
                  {(form.correctiveActions.length ? form.correctiveActions : [{ title: '', ownerRole: 'SUPERVISOR', dueAt: '' }]).map((action, index) => (
                    <div key={`${action.title}-${index}`} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.6fr_1fr_1fr]">
                      <input
                        value={action.title}
                        onChange={(event) => {
                          const next = [...form.correctiveActions];
                          next[index] = { ...next[index], title: event.target.value };
                          setForm((prev) => ({ ...prev, correctiveActions: next }));
                        }}
                        placeholder="Action title"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      <select
                        value={action.ownerRole}
                        onChange={(event) => {
                          const next = [...form.correctiveActions];
                          const nextRole = event.target.value as ActionOwnerRole;
                          next[index] = { ...next[index], ownerRole: nextRole };
                          setForm((prev) => ({ ...prev, correctiveActions: next }));
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="SUPERVISOR">Supervisor</option>
                        <option value="PRIVACY_OFFICER">Privacy officer</option>
                        <option value="JOHSC_CHAIR">JOHSC chair</option>
                        <option value="IT_FACILITIES">IT / Facilities</option>
                        <option value="DIRECTOR_OPS">Director of operations</option>
                      </select>
                      <input
                        type="date"
                        value={action.dueAt ? new Date(action.dueAt).toISOString().slice(0, 10) : ''}
                        onChange={(event) => {
                          const next = [...form.correctiveActions];
                          next[index] = { ...next[index], dueAt: event.target.value };
                          setForm((prev) => ({ ...prev, correctiveActions: next }));
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <span>Request camera footage hold</span>
                <input
                  type="checkbox"
                  checked={form.footageHold}
                  onChange={(event) => setForm((prev) => ({ ...prev, footageHold: event.target.checked }))}
                />
              </label>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Will be sent to</p>
              {routePreview.length === 0 ? (
                <p className="mt-2 text-sm text-slate-700">No specialty review needed — goes to the Executive Assistant.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {routePreview.map((ack) => (
                    <li key={ack.role} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2">
                      <span>{ack.role}</span>
                      {ack.toConfirm ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">TO CONFIRM</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={handleSubmit}>Submit review</Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
