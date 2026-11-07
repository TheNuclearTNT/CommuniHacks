import type { ClockKind, IncidentType, Role, Status } from '@/lib/types';

export const STATUS_LABELS: Record<Status, string> = {
  SUBMITTED: 'Submitted',
  SUPERVISOR_REVIEW: 'Supervisor review',
  SPECIALTY_REVIEW: 'Specialty acknowledgement',
  WITH_EA: 'With Executive Assistant',
  CLOSED: 'Filed and closed',
  REOPENED: 'Reopened',
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  PRIVACY: 'Privacy',
  STAFF_INJURY: 'Staff injury',
  FACILITIES: 'Facilities',
  IT_CYBER: 'IT / Cybersecurity',
  BEHAVIOURAL: 'Behavioural',
  CID: 'Critical Incident Debrief',
};

export const ROLE_LABELS: Record<Role, string> = {
  STAFF: 'Staff',
  SUPERVISOR: 'Supervisor',
  PRIVACY_OFFICER: 'Privacy Officer',
  JOHSC_CHAIR: 'JOHSC Chairs',
  IT_FACILITIES: 'IT/Facilities',
  DIRECTOR_OPS: 'Director of Operations',
  CID_GROUP: 'Critical Incident Debrief Group',
  EXEC_ASSISTANT: 'Executive Assistant',
  EXECUTIVE: 'Executive',
};

export const CLOCK_LABELS: Record<ClockKind, string> = {
  WSIB_FORM7: 'WSIB Form 7 (3 business days)',
  MOL_CRITICAL_NOTICE: 'MOL Critical Injury Notice (immediate)',
  CRITICAL_WRITTEN_48H: 'MOL Written Report (48 hours)',
  JHSC_4DAY: 'JHSC Written Notice (4 calendar days)',
};

export interface RouteTarget {
  role: Role;
  toConfirm: boolean;
  onlyIfSeriousBehavioural?: boolean;
  note?: string;
}

export const ROUTING_BY_TYPE: Record<IncidentType, RouteTarget[]> = {
  PRIVACY: [{ role: 'PRIVACY_OFFICER', toConfirm: false }],
  STAFF_INJURY: [
    {
      role: 'JOHSC_CHAIR',
      toConfirm: true,
      note: 'One row; either JOHSC chair may complete it (TO CONFIRM whether both must)',
    },
  ],
  FACILITIES: [
    { role: 'IT_FACILITIES', toConfirm: false },
    { role: 'DIRECTOR_OPS', toConfirm: false },
  ],
  IT_CYBER: [
    { role: 'IT_FACILITIES', toConfirm: false },
    { role: 'DIRECTOR_OPS', toConfirm: false },
  ],
  BEHAVIOURAL: [
    {
      role: 'DIRECTOR_OPS',
      toConfirm: true,
      onlyIfSeriousBehavioural: true,
      note: 'Normally remains with supervisor unless considered serious (additional pathway TO CONFIRM)',
    },
  ],
  CID: [
    {
      role: 'CID_GROUP',
      toConfirm: true,
      note: 'Critical Incident Debrief distribution group (address TO CONFIRM)',
    },
  ],
};

