'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, SeverityDot, StatusPill, TypeChip } from '@/components/ui';
import { getIncident, openIncident, reviewIncident } from '@/lib/api-client';
import { getNeelMockIncident } from '@/lib/mock/neel';
import {
  formatAnswerValue,
  getQuestionLabel,
  getRoleLabel,
  getUserDisplayName,
} from '@/lib/question-labels';
import { deriveTypes, extractLocation, requiredAcks } from '@/lib/workflow/rules';
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

export default function SupervisorReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<IncidentType[]>(['PRIVACY']);
  const [form, setForm] = useState<SupervisorReviewInput>(defaultReview);
  const [dismissedIndices, setDismissedIndices] = useState<number[]>([]);
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let active = true;

    async function load() {
      try {
        const base = await getIncident(id).catch(() => getNeelMockIncident(id) ?? null);
        if (!base || !active) return;
        if (['SUBMITTED', 'REOPENED'].includes(base.incident.status)) {
          await openIncident(id).catch(() => null);
        }
        const refreshed = (await getIncident(id).catch(() => base)) ?? base;
        if (!active) return;
        const draft = refreshed.incident.ai?.draftReview ?? {};
        const fallbackTypes = deriveTypes(refreshed.incident.answers ?? {});
        const nextTypes =
          draft.confirmedTypes ??
          refreshed.incident.ai?.suggestedTypes ??
          (fallbackTypes.length ? fallbackTypes : ['PRIVACY']);
        const rawSev = refreshed.incident.answers?.q13;
        const fallbackSev: SupervisorReviewInput['severity'] =
          rawSev === 'Critical' || rawSev === 'Less Serious' || rawSev === 'Unsure'
            ? rawSev
            : 'Less Serious';
        const nextForm: SupervisorReviewInput = {
          confirmedTypes: nextTypes,
          severity: draft.severity ?? fallbackSev,
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

  const handleAddAction = () => {
    setForm((prev) => ({
      ...prev,
      correctiveActions: [
        ...prev.correctiveActions,
        { title: '', ownerRole: 'SUPERVISOR', dueAt: '' },
      ],
    }));
  };

  const handleRemoveAction = (index: number) => {
    setForm((prev) => ({
      ...prev,
      correctiveActions: prev.correctiveActions.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const cleanedActions = form.correctiveActions
        .filter((a) => a.title.trim().length > 0)
        .map((a) => ({
          title: a.title.trim(),
          ownerRole: a.ownerRole,
          dueAt: a.dueAt
            ? a.dueAt.includes('T')
              ? a.dueAt
              : new Date(`${a.dueAt}T17:00:00Z`).toISOString()
            : new Date(Date.now() + 7 * 86400000).toISOString(),
        }));
      await reviewIncident(id, {
        ...form,
        confirmedTypes: selectedTypes.length ? selectedTypes : ['PRIVACY'],
        correctiveActions: cleanedActions,
      });
      router.push(`/records/${id}`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not submit review. Check that your active role is Supervisor or Director of Operations.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!detail) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <EmptyState title="Review is loading" description="Opening the incident and preparing the Supervisor Review form." />
      </main>
    );
  }

  const answers = detail.incident.answers ?? {};
  const narrative = typeof answers.q32 === 'string' ? answers.q32 : '';
  const recommendations = typeof answers.q33 === 'string' ? answers.q33 : '';
  const answerEntries = Object.entries(answers).filter(([key, val]) => {
    if (key === 'q32' || key === 'q33') return false;
    if (showAllAnswers) return true;
    return formatAnswerValue(val) !== null;
  });

  const visibleDiscrepancies = (detail.incident.ai?.discrepancies ?? []).filter(
    (_, idx) => !dismissedIndices.includes(idx),
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/supervisor" className="font-medium text-blue-700 hover:underline">
              Supervisor queue
            </Link>
            <span>/</span>
            <Link href={`/records/${detail.incident.id}`} className="font-medium text-blue-700 hover:underline">
              {detail.incident.id}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">Supervisor Review</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <SeverityDot severity={form.severity} />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Review {detail.incident.id}
            </h1>
            <StatusPill status={detail.incident.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {extractLocation(detail.incident.answers ?? {})} · Reported by{' '}
            {getUserDisplayName(detail.incident.submittedBy)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/records/${detail.incident.id}`}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View full record
          </Link>
          <Link
            href="/supervisor"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Back to queue
          </Link>
        </div>
      </div>

      {errorMsg ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        {/* Left column: Incident narrative, AI brief, discrepancies, and structured answers */}
        <div className="space-y-6">
          {/* Narrative highlight card */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Incident Narrative &amp; Context</h2>
              <Badge tone="slate">Staff Intake</Badge>
            </div>

            {narrative ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Q32 · Description of Incident
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-900">{narrative}</p>
              </div>
            ) : null}

            {recommendations ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Q33 · Staff Recommendations
                </p>
                <p className="mt-1 text-sm text-slate-700">{recommendations}</p>
              </div>
            ) : null}

            {detail.incident.transcript ? (
              <div className="mt-3 rounded-xl border border-blue-200/70 bg-blue-50/30 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-700">
                  Voice Intake Transcript
                </p>
                <p className="mt-1 text-sm italic text-slate-700">&ldquo;{detail.incident.transcript}&rdquo;</p>
              </div>
            ) : null}
          </Card>

          {/* AI Clinical Brief & Discrepancies */}
          {detail.incident.ai ? (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">AI Clinical Brief</h2>
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-700">
                  AI-generated — check
                </span>
              </div>

              {detail.incident.ai.summaryBullets.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {detail.incident.ai.summaryBullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {visibleDiscrepancies.length > 0 ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-800">
                    Flagged Discrepancies ({visibleDiscrepancies.length})
                  </p>
                  <div className="mt-2.5 space-y-2">
                    {detail.incident.ai.discrepancies.map((item, index) => {
                      if (dismissedIndices.includes(index)) return null;
                      return (
                        <div
                          key={`${item.field}-${index}`}
                          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">
                              {getQuestionLabel(item.field)}{' '}
                              <span className="text-xs font-normal text-amber-700">
                                ({item.field.toUpperCase()})
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setDismissedIndices((prev) => [...prev, index])}
                              className="text-xs font-semibold text-amber-800 underline-offset-2 hover:underline"
                            >
                              Dismiss
                            </button>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-amber-900">{item.note}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}

          {/* Report snapshot with human-readable labels */}
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Structured Form Responses</h2>
                <p className="text-xs text-slate-500">
                  Questions from the Langs Incident Report Form
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllAnswers((prev) => !prev)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                {showAllAnswers ? 'Hide empty fields' : 'Show all fields'}
              </button>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {answerEntries.map(([key, value]) => {
                const formatted = formatAnswerValue(value);
                return (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700">{getQuestionLabel(key)}</p>
                      <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                        {key.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-900">
                      {formatted ?? <span className="font-normal italic text-slate-400">Not answered</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right column: Supervisor Review form */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Supervisor Review
                </h2>
                <p className="text-xs text-slate-500">
                  Proposed, Langs to confirm · Pre-filled by AI where available
                </p>
              </div>
              <Badge tone="blue">Stage 2 of 5</Badge>
            </div>

            <div className="mt-5 space-y-5">
              {/* Confirmed incident types */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Confirmed incident types</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(['PRIVACY', 'STAFF_INJURY', 'FACILITIES', 'IT_CYBER', 'BEHAVIOURAL', 'CID'] as IncidentType[]).map(
                    (type) => {
                      const active = selectedTypes.includes(type);
                      return (
                        <label
                          key={type}
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                            active
                              ? 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-500/20'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => handleToggleType(type)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-700"
                          />
                          <TypeChip type={type} />
                        </label>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Confirmed Severity
                </label>
                <select
                  value={form.severity}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      severity: event.target.value as SupervisorReviewInput['severity'],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800"
                >
                  <option value="Critical">Critical (triggers 1-hour notification clock)</option>
                  <option value="Less Serious">Less Serious</option>
                  <option value="Unsure">Unsure</option>
                </select>
              </div>

              {/* Serious behavioural */}
              {selectedTypes.includes('BEHAVIOURAL') ? (
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-sm font-medium text-slate-800">
                  <div>
                    <span>Serious behavioural incident?</span>
                    <p className="text-xs font-normal text-slate-600">
                      Routes to Director of Operations for acknowledgement
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.seriousBehavioural}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, seriousBehavioural: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-700"
                  />
                </label>
              ) : null}

              {/* Statutory OHSA / WSIB triggers */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">
                  Statutory Reporting Triggers (WSIB / JHSC / MOL)
                </p>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {[
                    {
                      key: 'healthCareBeyondFirstAid',
                      label: 'Health care beyond first aid',
                      sub: 'Starts 3-day WSIB Form 7 clock',
                    },
                    {
                      key: 'lostTime',
                      label: 'Lost time injury',
                      sub: 'Starts 3-day WSIB + 4-day JHSC clocks',
                    },
                    {
                      key: 'criticalInjury',
                      label: 'Critical injury (O. Reg. 834)',
                      sub: 'Starts 48-hour MOL + JHSC clocks',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-800 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(form[item.key as keyof SupervisorReviewInput])}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            [item.key]: event.target.checked,
                          }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700"
                      />
                      <div>
                        <span className="block font-medium leading-snug">{item.label}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">{item.sub}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Corrective actions */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Follow-up / Corrective actions</p>
                  <button
                    type="button"
                    onClick={handleAddAction}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    + Add action
                  </button>
                </div>

                {form.correctiveActions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center text-xs text-slate-500">
                    No follow-up actions added yet. Click <strong>+ Add action</strong> to assign a task.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {form.correctiveActions.map((action, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            value={action.title}
                            onChange={(event) => {
                              const next = [...form.correctiveActions];
                              next[index] = { ...next[index], title: event.target.value };
                              setForm((prev) => ({ ...prev, correctiveActions: next }));
                            }}
                            placeholder="Describe corrective action (e.g., Inspect stairwell lighting)"
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAction(index)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <select
                            value={action.ownerRole}
                            onChange={(event) => {
                              const next = [...form.correctiveActions];
                              const nextRole = event.target.value as ActionOwnerRole;
                              next[index] = { ...next[index], ownerRole: nextRole };
                              setForm((prev) => ({ ...prev, correctiveActions: next }));
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                          >
                            <option value="SUPERVISOR">Supervisor</option>
                            <option value="PRIVACY_OFFICER">Privacy Officer</option>
                            <option value="JOHSC_CHAIR">JOHSC Chair</option>
                            <option value="IT_FACILITIES">IT / Facilities</option>
                            <option value="DIRECTOR_OPS">Director of Operations</option>
                          </select>
                          <input
                            type="date"
                            value={action.dueAt ? new Date(action.dueAt).toISOString().slice(0, 10) : ''}
                            onChange={(event) => {
                              const next = [...form.correctiveActions];
                              next[index] = { ...next[index], dueAt: event.target.value };
                              setForm((prev) => ({ ...prev, correctiveActions: next }));
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Camera footage hold */}
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-sm font-medium text-slate-800">
                <div>
                  <span>Request security camera footage hold</span>
                  <p className="text-xs font-normal text-slate-500">
                    Notifies IT / Facilities to preserve footage before overwrite window
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.footageHold}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, footageHold: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                />
              </label>

              {/* Supervisor notes */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Supervisor Investigation &amp; Routing Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={4}
                  placeholder="Add root cause observations, immediate containment taken, or instructions for specialty leads..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800"
                />
              </div>
            </div>

            {/* Live Routing Preview */}
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-900">
                  Live Pathway Preview — Will be sent to
                </p>
                <span className="text-xs font-medium text-blue-700">
                  {routePreview.length === 0
                    ? 'Direct to EA'
                    : `${routePreview.length} specialty lead${routePreview.length === 1 ? '' : 's'}`}
                </span>
              </div>

              {routePreview.length === 0 ? (
                <p className="mt-2 text-sm text-slate-700">
                  No specialty review needed — routes directly to the <strong>Executive Assistant</strong> for receipt and filing.
                </p>
              ) : (
                <ul className="mt-2.5 space-y-2 text-sm text-slate-800">
                  {routePreview.map((ack) => (
                    <li
                      key={ack.role}
                      className="flex items-center justify-between gap-2 rounded-lg border border-blue-200/80 bg-white px-3 py-2 shadow-2xs"
                    >
                      <span className="font-semibold text-slate-900">{getRoleLabel(ack.role)}</span>
                      {ack.toConfirm ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-800">
                          TO CONFIRM
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-700">
                          Parallel Ack
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <Link
                href={`/records/${detail.incident.id}`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting & routing…' : 'Submit review & route'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
