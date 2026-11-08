import type { IncidentType, Status } from '@/lib/types';

// Fixed order = stack order and colour slot. Never reorder by rank, so a type
// keeps its colour on every chart and filter. Red is reserved for Critical.
export const TYPE_ORDER: IncidentType[] = ['BEHAVIOURAL', 'FACILITIES', 'PRIVACY', 'STAFF_INJURY', 'IT_CYBER', 'CID'];

export const TYPE_COLOR: Record<IncidentType, string> = {
  BEHAVIOURAL: '#2a78d6',
  FACILITIES: '#eb6834',
  PRIVACY: '#1baf7a',
  STAFF_INJURY: '#eda100',
  IT_CYBER: '#e87ba4',
  CID: '#008300',
};

export const TYPE_LABEL: Record<IncidentType, string> = {
  BEHAVIOURAL: 'Behavioural',
  FACILITIES: 'Facilities',
  PRIVACY: 'Privacy',
  STAFF_INJURY: 'Staff injury',
  IT_CYBER: 'IT / cybersecurity',
  CID: 'Critical incident debrief',
};

export const STATUS_LABEL: Record<Status, string> = {
  SUBMITTED: 'Submitted',
  SUPERVISOR_REVIEW: 'Supervisor review',
  SPECIALTY_REVIEW: 'Specialty acknowledgement',
  WITH_EA: 'With Executive Assistant',
  CLOSED: 'Filed and closed',
  REOPENED: 'Reopened',
};

// Chart chrome
// Chart chrome uses the Langs palette: deep green highlight, Langs-brown axis text.
// (The six incident-type colours above stay as they are: they need six clearly
// different hues, and red is reserved for Critical.)
export const ACCENT = '#47711a';
export const MUTED_BAR = '#c3c2b7';
export const GRID = '#e1e0d9';
export const AXIS_TEXT = '#684420';

// Sequential Langs-green ramp for the heatmap (light → dark); index 0 = no reports.
// Cell text is dark up to step 4 and white from step 5 (see Heatmap.tsx); all
// steps keep at least 4.5:1 contrast with their text.
export const HEAT_STEPS = ['#f3f3f1', '#e4f0cc', '#cbe2a0', '#acd072', '#8ab947', '#55821f', '#38591a'];
