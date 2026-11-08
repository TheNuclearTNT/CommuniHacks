// Runs Langs' 3 fictional test scenarios and 4 variations against the API
// (Ananya, B5), acting as each role in turn, and prints a pass/fail table
// for docs/testing.md.
//
//   npm run dev                                   # in one terminal
//   npx tsx scripts/scenarios.ts                  # in another (SCENARIO_BASE_URL to override)
//
// Adds ~7 fictional incidents to whatever database the app is using.

import type { IncidentDetail, IncidentListItem, Role, Status } from '@/lib/types';

const BASE = process.env.SCENARIO_BASE_URL ?? 'http://localhost:3000';

const ROLE_OF: Record<string, Role> = {
  u_staff_1: 'STAFF',
  u_sup_1: 'SUPERVISOR',
  u_priv: 'PRIVACY_OFFICER',
  u_johsc_2: 'JOHSC_CHAIR',
  u_itf: 'IT_FACILITIES',
  u_dops: 'DIRECTOR_OPS',
  u_ea: 'EXEC_ASSISTANT',
};

async function api<T>(userId: string, method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-user-id': userId, 'x-role': ROLE_OF[userId] },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json().catch(() => null)) as T };
}
async function ok<T>(userId: string, method: string, path: string, body?: unknown): Promise<T> {
  const r = await api<T>(userId, method, path, body);
  if (r.status >= 300) throw new Error(`${method} ${path} as ${userId} → ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
}

// ---------- results ----------
interface Check {
  label: string;
  pass: boolean;
  detail: string;
}
const results: { id: string; name: string; checks: Check[] }[] = [];
let current: Check[] = [];
function check(label: string, pass: boolean, detail = '') {
  current.push({ label, pass, detail });
}

// ---------- fictional answers (Langs' scenario sheet) ----------
const today = new Date();
const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const base = {
  q1: ymd, q2: '10:30AM', q3: 'Riley Chen', q4: '', q5: 'Main Site', q7: 'Community Services',
  q10: 'Not applicable', q11: 'Not applicable', q12: 'No', q13: 'Less Serious',
  q14: 'No', q16: 'No', q18: 'No', q20: 'No', q22: 'No', q23: 'No', q24: '', q28: 'No', q30: 'No',
  q33: '', q34: 'No', q35: 'Jordan Reyes',
};
const PRIVACY = {
  ...base, q9: 'Non Applicable', q18: 'Yes', q19: ['Privacy/Confidentiality'], q31: ['Supervisory Support'],
  q32: 'Staff member accidentally emailed a fictional community-program schedule to the wrong external email address, noticed, and told the supervisor. Attempted recall.',
};
const FACILITIES = {
  ...base, q9: 'Visitor', q18: 'Yes', q19: ['Property Damage'], q31: ['Other'],
  q32: 'A handrail on the back stairwell came loose. A fictional visitor nearly tripped but was not hurt. Area temporarily blocked off and supervisor informed.',
};
const INJURY = {
  ...base, q9: 'Staff/Volunteer', q11: 'Riley Chen', q14: 'Yes', q15: ['Impact (e.g. head injury, crushed finger etc.)'], q31: ['First Aid'],
  q32: 'Minor fictional hand injury while moving a sealed supply box in the storage room. First aid given.',
};
const review = (types: string[], extra: Record<string, unknown> = {}) => ({
  confirmedTypes: types, severity: 'Less Serious', seriousBehavioural: false, healthCareBeyondFirstAid: false,
  lostTime: false, criticalInjury: false, correctiveActions: [], footageHold: false, notes: 'Scenario test (fictional).', ...extra,
});

const pendingRoles = (d: IncidentDetail) =>
  d.acknowledgements.filter((a) => a.cycle === d.incident.cycle && !a.ackedBy).map((a) => a.role).sort();
const ackAs = (d: IncidentDetail, userId: string) => {
  const row = d.acknowledgements.find((a) => a.cycle === d.incident.cycle && a.role === ROLE_OF[userId] && !a.ackedBy);
  if (!row) throw new Error(`${d.incident.id}: no pending ${ROLE_OF[userId]} acknowledgement`);
  return ok<IncidentDetail>(userId, 'POST', `/api/incidents/${d.incident.id}/ack`, { ackId: row.id, comment: 'Acknowledged (scenario test).' });
};
const inEaQueue = async (id: string) =>
  (await ok<IncidentListItem[]>('u_ea', 'GET', '/api/incidents?scope=ea')).some((x) => x.id === id);
const same = (a: string[], b: string[]) => a.join(',') === [...b].sort().join(',');

/** Submit → open → review; returns the detail after review. */
async function toReview(answers: object, types: string[], extra?: Record<string, unknown>) {
  const inc = await ok<{ id: string }>('u_staff_1', 'POST', '/api/incidents', { answers, footageHoldRequested: false });
  await ok('u_sup_1', 'POST', `/api/incidents/${inc.id}/open`);
  return ok<IncidentDetail>('u_sup_1', 'POST', `/api/incidents/${inc.id}/review`, review(types, extra));
}
async function closeWithEa(d: IncidentDetail) {
  return ok<IncidentDetail>('u_ea', 'POST', `/api/incidents/${d.incident.id}/receive`);
}
function successChecks(d: IncidentDetail, expectStatus: Status) {
  check('Owner/stage shown', d.incident.status === expectStatus && Array.isArray(d.incident.currentOwnerRoles), `${d.incident.status} · owners [${d.incident.currentOwnerRoles.join(', ')}]`);
  const acked = d.acknowledgements.filter((a) => a.ackedBy);
  check('Completed acks recorded', acked.length > 0 && acked.every((a) => a.ackedAt), acked.map((a) => `${a.role} by ${a.ackedBy}`).join('; '));
  check('EA receipt recorded', d.events.some((e) => e.kind === 'EA_RECEIVED'), '');
  check('Open/closed status', expectStatus !== 'CLOSED' || !!d.incident.closedAt, `closedAt ${d.incident.closedAt ? 'set' : 'missing'}`);
}

async function scenario(id: string, name: string, fn: () => Promise<void>) {
  current = [];
  try {
    await fn();
  } catch (e) {
    check('Ran without errors', false, (e as Error).message.slice(0, 200));
  }
  results.push({ id, name, checks: current });
}

async function main() {
  await scenario('1', 'Privacy: wrong-address email', async () => {
    let d = await toReview(PRIVACY, ['PRIVACY']);
    check('Route = Privacy Officer only', same(pendingRoles(d), ['PRIVACY_OFFICER']), pendingRoles(d).join(', '));
    check('Status after review', d.incident.status === 'SPECIALTY_REVIEW', d.incident.status);
    const early = await api('u_ea', 'POST', `/api/incidents/${d.incident.id}/receive`);
    check('EA blocked before ack (409)', early.status === 409, `HTTP ${early.status}`);
    const wrong = await api('u_staff_1', 'POST', `/api/incidents/${d.incident.id}/ack`, { ackId: d.acknowledgements[0]?.id });
    check('Wrong role blocked (403)', wrong.status === 403, `HTTP ${wrong.status}`);
    d = await ackAs(d, 'u_priv');
    check('With EA after ack', d.incident.status === 'WITH_EA', d.incident.status);
    d = await closeWithEa(d);
    successChecks(d, 'CLOSED');
  });

  await scenario('2', 'Facilities near miss: loose handrail', async () => {
    let d = await toReview(FACILITIES, ['FACILITIES']);
    check('Route = IT/Facilities + Director of Ops', same(pendingRoles(d), ['DIRECTOR_OPS', 'IT_FACILITIES']), pendingRoles(d).join(', '));
    d = await ackAs(d, 'u_itf');
    d = await ackAs(d, 'u_dops');
    d = await closeWithEa(d);
    successChecks(d, 'CLOSED');
  });

  let injuryId = '';
  await scenario('3', 'Staff injury: hand, supply box, first aid', async () => {
    let d = await toReview(INJURY, ['STAFF_INJURY']);
    injuryId = d.incident.id;
    check('Route = one JOHSC Chair row', same(pendingRoles(d), ['JOHSC_CHAIR']), pendingRoles(d).join(', '));
    check('No WSIB clock (first aid only)', d.clocks.length === 0, `${d.clocks.length} clocks`);
    d = await ackAs(d, 'u_johsc_2');
    d = await closeWithEa(d);
    successChecks(d, 'CLOSED');
  });

  await scenario('V1', 'Scenario 1 changed to Facilities', async () => {
    const d = await toReview(PRIVACY, ['FACILITIES']);
    check('Route changed to IT/Facilities + Director of Ops', same(pendingRoles(d), ['DIRECTOR_OPS', 'IT_FACILITIES']), pendingRoles(d).join(', '));
    check('No Privacy Officer row', !d.acknowledgements.some((a) => a.role === 'PRIVACY_OFFICER'), '');
  });

  await scenario('V2', 'Scenario 2 kept open with a follow-up action', async () => {
    const due = new Date(Date.now() + 7 * 86400_000).toISOString();
    let d = await toReview(FACILITIES, ['FACILITIES'], { correctiveActions: [{ title: 'Replace handrail', ownerRole: 'IT_FACILITIES', dueAt: due }] });
    const action = d.actions.find((a) => a.kind === 'CORRECTIVE');
    check('Follow-up action created', !!action && action.status === 'NOT_STARTED', action ? `${action.title} · ${action.ownerRole}` : 'none');
    d = await ackAs(d, 'u_itf');
    d = await ackAs(d, 'u_dops');
    check('Still open while action outstanding', d.incident.status !== 'CLOSED', d.incident.status);
    const r = await api<IncidentDetail>('u_ea', 'POST', `/api/incidents/${d.incident.id}/receive`);
    check('Observed: EA can file with action open', r.status < 300, `HTTP ${r.status}${r.status < 300 ? ' — record closed with action still NOT_STARTED' : ''} (TO CONFIRM which Langs wants)`);
    if (action) {
      const a = await api<{ status: string }>('u_itf', 'PATCH', `/api/actions/${action.id}`, { status: 'DONE' });
      check('Action can be completed', a.status < 300 && a.data?.status === 'DONE', `HTTP ${a.status}`);
    }
  });

  await scenario('V3', 'Scenario 3 reopened with a note', async () => {
    if (!injuryId) throw new Error('Scenario 3 did not produce a record');
    const before = await ok<IncidentDetail>('u_ea', 'GET', `/api/incidents/${injuryId}`);
    const d = await ok<IncidentDetail>('u_ea', 'POST', `/api/incidents/${injuryId}/reopen`, { reason: 'Box storage still unsafe (scenario test).' });
    check('Same reference number', d.incident.id === injuryId, d.incident.id);
    check('Cycle 2', d.incident.cycle === 2, `cycle ${d.incident.cycle}`);
    check('Status Reopened', d.incident.status === 'REOPENED', d.incident.status);
    check('Cycle 1 history kept', d.events.filter((e) => e.cycle === 1).length === before.events.length, `${d.events.filter((e) => e.cycle === 1).length} cycle-1 events`);
    check('Reopen note recorded', d.actions.some((a) => a.kind === 'REOPEN_NOTE'), '');
    check('Back in supervisor queue', (await ok<IncidentListItem[]>('u_sup_1', 'GET', '/api/incidents?scope=queue')).some((x) => x.id === injuryId), '');
  });

  await scenario('V4', 'Two acknowledgements required', async () => {
    let d = await toReview(FACILITIES, ['FACILITIES']);
    d = await ackAs(d, 'u_itf');
    check('After 1 of 2 acks: still Specialty', d.incident.status === 'SPECIALTY_REVIEW', d.incident.status);
    check('After 1 of 2 acks: not in EA queue', !(await inEaQueue(d.incident.id)), '');
    d = await ackAs(d, 'u_dops');
    check('After both acks: in EA queue', await inEaQueue(d.incident.id), d.incident.status);
  });

  // ---------- report ----------
  let failed = 0;
  console.log(`\n| # | Scenario | Result | Checks |\n|---|---|---|---|`);
  for (const r of results) {
    const bad = r.checks.filter((c) => !c.pass);
    failed += bad.length;
    const summary = r.checks.map((c) => `${c.pass ? '✓' : '✗'} ${c.label}${c.detail ? ` (${c.detail})` : ''}`).join('<br>');
    console.log(`| ${r.id} | ${r.name} | ${bad.length ? `**FAIL** (${bad.length})` : 'PASS'} | ${summary} |`);
  }
  console.log(`\n${failed ? `${failed} check(s) failed` : 'All checks passed'} against ${BASE}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
