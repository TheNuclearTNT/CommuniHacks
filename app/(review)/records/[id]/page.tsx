'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PathwayTracker } from '@/components/tracker/PathwayTracker';
import {
  AiLabel,
  Badge,
  Button,
  Card,
  ClockChip,
  EmptyState,
  SeverityDot,
  StatusPill,
  TypeChip,
} from '@/components/ui';
import {
  ackIncident,
  getIncident,
  getMe,
  markClockMet,
  receiveIncident,
  reopenIncident,
  updateAction,
} from '@/lib/api-client';
import { getNeelMockIncident } from '@/lib/mock/neel';
import {
  formatAnswerValue,
  getClockLabel,
  getQuestionLabel,
  getQuestionSection,
  getRoleLabel,
  getUserDisplayName,
  SECTION_DISPLAY_NAMES,
} from '@/lib/question-labels';
import { canConfirmReceipt } from '@/lib/workflow/receipt-roles';
import { deriveTypes, extractLocation } from '@/lib/workflow/rules';
import type { FollowUpAction, IncidentDetail, Role } from '@/lib/types';

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function RecordDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [viewerRole, setViewerRole] = useState<Role>('SUPERVISOR');
  const [loading, setLoading] = useState(true);
  const [showAllFields, setShowAllFields] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [ackComment, setAckComment] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenBox, setShowReopenBox] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadRecord = useCallback(async () => {
    if (!id) return;
    try {
      const [me, loaded] = await Promise.all([
        getMe().catch(() => ({ id: 'u_sup_1', name: 'Jordan Reyes', role: 'SUPERVISOR' as Role })),
        getIncident(id).catch(() => getNeelMockIncident(id) ?? null),
      ]);
      setViewerRole(me.role);
      setDetail(loaded);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRecord();
    const handleRoleChanged = () => void loadRecord();
    window.addEventListener('langs:role-changed', handleRoleChanged);
    return () => window.removeEventListener('langs:role-changed', handleRoleChanged);
  }, [loadRecord]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-slate-500">Loading incident record…</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <EmptyState
          title="Incident not found"
          description="We could not find a record with this reference number."
        />
      </main>
    );
  }

  const { incident, reviews, acknowledgements, actions, clocks } = detail;
  const answers = incident.answers ?? {};
  const latestReview = reviews[reviews.length - 1] ?? null;
  const confirmedOrDerivedTypes =
    latestReview?.confirmedTypes ??
    incident.ai?.suggestedTypes ??
    deriveTypes(answers);
  const severity =
    latestReview?.severity ??
    (typeof answers.q13 === 'string' ? answers.q13 : 'Less Serious');
  const location = extractLocation(answers);
  const incidentDate = formatAnswerValue(answers.q1) ?? formatDateTime(incident.createdAt);
  const incidentTime = formatAnswerValue(answers.q2) ?? '';
  const narrative = formatAnswerValue(answers.q32) ?? 'No narrative summary provided.';
  const recommendations = formatAnswerValue(answers.q33);

  // Group structured form answers by section
  const sectionsOrder = ['incident details', 'type of incident', 'summary', 'other'];
  const groupedAnswers: Record<string, [string, unknown][]> = {
    'incident details': [],
    'type of incident': [],
    summary: [],
    other: [],
  };

  for (const [key, val] of Object.entries(answers)) {
    if (!showAllFields && formatAnswerValue(val) === null) continue;
    const sec = getQuestionSection(key);
    if (!groupedAnswers[sec]) groupedAnswers[sec] = [];
    groupedAnswers[sec].push([key, val]);
  }

  // Role-aware capabilities on this record
  const canSupervisorReview =
    ['SUBMITTED', 'REOPENED', 'SUPERVISOR_REVIEW'].includes(incident.status) &&
    (viewerRole === 'SUPERVISOR' || viewerRole === 'DIRECTOR_OPS');

  const currentCycleAcks = acknowledgements.filter((a) => a.cycle === incident.cycle);
  const activeAcks = currentCycleAcks.length > 0 ? currentCycleAcks : acknowledgements;

  const pendingAckForViewer = activeAcks.find(
    (a) => a.role === viewerRole && !a.ackedAt,
  );

  const handleAcknowledge = async (ackIdToUse: string, roleLabelToUse: Role) => {
    setBusyAction(true);
    setFeedbackMsg(null);
    try {
      await ackIncident(incident.id, {
        ackId: ackIdToUse,
        comment: ackComment.trim() || `Reviewed and acknowledged by ${getRoleLabel(roleLabelToUse)}.`,
      });
      setAckComment('');
      setFeedbackMsg(`Acknowledged as ${getRoleLabel(roleLabelToUse)}.`);
      await loadRecord();
    } catch (err) {
      setFeedbackMsg(
        err instanceof Error ? err.message : 'Switch to the matching specialty persona in the header to acknowledge.',
      );
    } finally {
      setBusyAction(false);
    }
  };

  const handleReceive = async () => {
    setBusyAction(true);
    setFeedbackMsg(null);
    try {
      await receiveIncident(incident.id);
      setFeedbackMsg('Record received and filed. It is now under Completed receipts and files on the EA filing page.');
      await loadRecord();
    } catch (err) {
      setFeedbackMsg(
        err instanceof Error ? err.message : 'Only executives can confirm receipt and file.',
      );
    } finally {
      setBusyAction(false);
    }
  };

  const handleReopen = async () => {
    setBusyAction(true);
    setFeedbackMsg(null);
    try {
      await reopenIncident(incident.id, {
        reason: reopenReason.trim() || 'Additional follow-up details received.',
      });
      setShowReopenBox(false);
      setReopenReason('');
      setFeedbackMsg('Record reopened on the same Incident ID.');
      await loadRecord();
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : 'Could not reopen record.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleActionStatusChange = async (actionId: string, status: FollowUpAction['status']) => {
    try {
      await updateAction(actionId, { status });
      await loadRecord();
    } catch {
      // Ignore if unauthorized
    }
  };

  const handleMarkClockMet = async (clockId: string) => {
    try {
      await markClockMet(clockId);
      await loadRecord();
    } catch {
      // Ignore if unauthorized
    }
  };

  // Only the specialty area itself can acknowledge (the backend refuses anyone else).
  const targetAck = pendingAckForViewer;

  // Reviewers can nudge a specialty area whose acknowledgement is still waiting.
  const waitingAcks = acknowledgements.filter((a) => a.cycle === incident.cycle && !a.ackedAt);
  const canRemind =
    incident.status === 'SPECIALTY_REVIEW' &&
    (viewerRole === 'SUPERVISOR' || viewerRole === 'EXEC_ASSISTANT' || viewerRole === 'EXECUTIVE');
  const handleRemind = async (role: Role) => {
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incident.id)}/remind`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toRole: role, about: 'Acknowledgement waiting' }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setFeedbackMsg(`Reminder logged for ${getRoleLabel(role)} (prototype: no email is sent).`);
      await loadRecord();
    } catch {
      setFeedbackMsg('Could not send the reminder. Try again.');
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Top Record Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link href="/supervisor" className="font-semibold text-accent hover:underline">
              ← Back to queues
            </Link>
            <span>·</span>
            <span>Viewing as {getRoleLabel(viewerRole)}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <SeverityDot severity={severity} />
            <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {incident.id}
            </h1>
            <StatusPill status={incident.status} />
            {confirmedOrDerivedTypes.map((type) => (
              <TypeChip key={type} type={type} />
            ))}
          </div>

          <p className="mt-2 text-sm text-slate-600">
            <strong className="font-semibold text-slate-800">{location}</strong> · Incident date:{' '}
            {incidentDate}
            {incidentTime ? ` at ${incidentTime}` : ''} · Reported by{' '}
            <strong className="font-medium text-slate-800">
              {getUserDisplayName(incident.submittedBy)}
            </strong>
          </p>
        </div>

        {/* Sticky Role-Aware Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}>
            Save as PDF
          </Button>
          {canRemind &&
            waitingAcks.map((ack) => (
              <Button key={ack.id} variant="secondary" onClick={() => handleRemind(ack.role)}>
                Remind {getRoleLabel(ack.role)}
              </Button>
            ))}
          {['SUBMITTED', 'REOPENED', 'SUPERVISOR_REVIEW'].includes(incident.status) && (
            <Link
              href={`/supervisor/review/${incident.id}`}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-800"
            >
              {canSupervisorReview ? 'Complete Supervisor Review →' : 'Open Supervisor Review Form →'}
            </Link>
          )}

          {incident.status === 'SPECIALTY_REVIEW' && targetAck && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={ackComment}
                onChange={(e) => setAckComment(e.target.value)}
                placeholder="Optional sign-off note…"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
              />
              <Button
                variant="primary"
                disabled={busyAction}
                onClick={() => handleAcknowledge(targetAck.id, targetAck.role)}
              >
                {busyAction
                  ? 'Signing off…'
                  : `Acknowledge (${getRoleLabel(targetAck.role)})`}
              </Button>
            </div>
          )}

          {incident.status === 'WITH_EA' && canConfirmReceipt(viewerRole) && (
            <Button
              variant="primary"
              disabled={busyAction}
              onClick={handleReceive}
            >
              {busyAction ? 'Filing…' : 'Confirm receipt & file'}
            </Button>
          )}

          {incident.status === 'CLOSED' &&
            (viewerRole === 'SUPERVISOR' || viewerRole === 'EXEC_ASSISTANT') && (
            <Button
              variant="secondary"
              onClick={() => setShowReopenBox((v) => !v)}
            >
              Reopen Record
            </Button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
          {feedbackMsg}
        </div>
      )}

      {showReopenBox && (
        <Card className="border-amber-200 bg-amber-50/60 p-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-amber-900">
            Reopen {incident.id} (increments cycle on the same Incident ID)
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Enter reason for reopening (e.g., WSIB healthcare follow-up received)…"
              className="flex-1 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm text-slate-900"
            />
            <Button variant="secondary" onClick={() => setShowReopenBox(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={busyAction} onClick={handleReopen}>
              Confirm Reopen
            </Button>
          </div>
        </Card>
      )}

      {/* 5-Stage Pathway Tracker */}
      <PathwayTracker detail={detail} />

      {/* Main Two-Column Content */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Left column: Narrative Highlight + Sectioned Form Responses */}
        <div className="space-y-6">
          {/* Narrative & Key Highlights Card */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Incident Summary &amp; Narrative</h2>
              <Badge tone="slate">Q32 &amp; Q33</Badge>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Description of Incident (Q32)
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-900">{narrative}</p>
            </div>

            {recommendations && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Staff Recommendations for Prevention (Q33)
                </p>
                <p className="mt-1 text-sm text-slate-700">{recommendations}</p>
              </div>
            )}

            {incident.transcript && (
              <div className="mt-3 rounded-xl border border-blue-200/80 bg-blue-50/30 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                  Voice Intake Transcript
                </p>
                <p className="mt-1 text-sm italic text-slate-700">&ldquo;{incident.transcript}&rdquo;</p>
              </div>
            )}
          </Card>

          {/* Structured 35-Question Form Responses by Section */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Langs Incident Report Form Responses
                </h2>
                <p className="text-xs text-slate-500">
                  Human-readable labels mapped from the 35-question Langs form
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllFields((v) => !v)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {showAllFields ? 'Hide blank optional fields' : 'Show all 35 fields'}
              </button>
            </div>

            <div className="mt-4 space-y-6">
              {sectionsOrder.map((sec) => {
                const entries = groupedAnswers[sec] ?? [];
                if (entries.length === 0) return null;
                return (
                  <div key={sec}>
                    <h3 className="mb-2.5 text-xs font-bold uppercase tracking-[0.08em] text-blue-800">
                      {SECTION_DISPLAY_NAMES[sec] ?? sec}
                    </h3>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {entries.map(([key, value]) => {
                        const formatted = formatAnswerValue(value);
                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-700">
                                {getQuestionLabel(key)}
                              </p>
                              <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                                {key.toUpperCase()}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm font-medium text-slate-900">
                              {formatted ?? (
                                <span className="font-normal italic text-slate-400">
                                  Not answered
                                </span>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right column: AI Brief, Supervisor Review, Follow-up Actions, and Compliance Clocks */}
        <div className="space-y-6">
          {/* AI Summary & Discrepancies */}
          {incident.ai && (
            <Card className="p-5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">AI Clinical Triage Brief</h2>
                <AiLabel />
              </div>

              {incident.ai.summaryBullets.length > 0 && (
                <ul className="mt-3.5 space-y-2 text-sm text-slate-700">
                  {incident.ai.summaryBullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              {incident.ai.discrepancies.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3.5">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-amber-800">
                    Discrepancy Checks ({incident.ai.discrepancies.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {incident.ai.discrepancies.map((d, idx) => (
                      <div
                        key={`${d.field}-${idx}`}
                        className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"
                      >
                        <p className="font-bold">
                          {getQuestionLabel(d.field)} ({d.field.toUpperCase()})
                        </p>
                        <p className="mt-0.5 text-amber-900">{d.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Supervisor Review Card */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Supervisor Review Record</h2>
              <Badge tone={latestReview ? 'green' : 'amber'}>
                {latestReview ? 'Completed' : 'Pending'}
              </Badge>
            </div>

            {latestReview ? (
              <div className="mt-3.5 space-y-3 text-sm text-slate-700">
                <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50 p-3 text-xs">
                  <div>
                    <span className="text-slate-500">Reviewed by</span>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      {getUserDisplayName(latestReview.reviewerId)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Reviewed at</span>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      {formatDateTime(latestReview.submittedAt)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Confirmed severity</span>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      {latestReview.severity}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Footage hold</span>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      {latestReview.footageHold ? 'Requested ✓' : 'No'}
                    </p>
                  </div>
                </div>

                {latestReview.notes && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Supervisor Investigation Notes
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {latestReview.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3.5">
                <p className="text-sm text-slate-600">
                  Supervisor review has not been submitted yet.
                </p>
                <Link
                  href={`/supervisor/review/${incident.id}`}
                  className="mt-3 inline-flex rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Open Supervisor Review Form →
                </Link>
              </div>
            )}
          </Card>

          {/* Follow-up Corrective Actions */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Follow-up Actions ({actions.length})
              </h2>
              <Badge tone="slate">Corrective tasks</Badge>
            </div>

            {actions.length === 0 ? (
              <p className="mt-3.5 text-sm text-slate-500">
                No follow-up corrective actions assigned to this record.
              </p>
            ) : (
              <div className="mt-3.5 space-y-2.5">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                      <select
                        aria-label={`Status for ${action.title}`}
                        value={action.status}
                        onChange={(e) =>
                          handleActionStatusChange(
                            action.id,
                            e.target.value as FollowUpAction['status'],
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        <option value="NOT_STARTED">NOT STARTED</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="DONE">DONE ✓</option>
                      </select>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Owner: <strong className="text-slate-700">{getRoleLabel(action.ownerRole)}</strong> · Due:{' '}
                      {formatDateTime(action.dueAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Statutory & Internal Compliance Clocks */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Compliance &amp; SLA Clocks ({clocks.length})
              </h2>
              <Badge tone="blue">WSIB / OHSA / Internal</Badge>
            </div>

            {clocks.length === 0 ? (
              <p className="mt-3.5 text-sm text-slate-500">
                No active compliance clocks on this record.
              </p>
            ) : (
              <div className="mt-3.5 space-y-2.5">
                {clocks.map((clock) => {
                  const isMet = Boolean(clock.metAt);
                  return (
                    <div
                      key={clock.id}
                      className={`rounded-xl border p-3 ${
                        isMet
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {getClockLabel(clock.kind)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Deadline: {formatDateTime(clock.dueAt)}
                          </p>
                        </div>

                        {isMet ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Met ✓ ({formatDateTime(clock.metAt)})
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <ClockChip dueAt={clock.dueAt} />
                            <button
                              type="button"
                              onClick={() => handleMarkClockMet(clock.id)}
                              className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-accent hover:bg-blue-50"
                            >
                              Mark met
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
