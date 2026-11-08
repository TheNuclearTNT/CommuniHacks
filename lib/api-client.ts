import type {
  Answers,
  ComplianceClock,
  FollowUpAction,
  Incident,
  IncidentDetail,
  IncidentListItem,
  IncidentType,
  InsightsResponse,
  IntakeExtractRequest,
  IntakeExtractResponse,
  Role,
  Status,
  SupervisorReviewInput,
  TrendsResponse,
  User,
} from './types';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string | string[]>;

  constructor(message: string, status: number, fields?: Record<string, string | string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let fields: Record<string, string | string[]> | undefined;
    try {
      const body = (await res.json()) as {
        error?: string;
         fields?: Record<string, string | string[]>;
      };
      if (body?.error) message = body.error;
      if (body?.fields) fields = body.fields;
    } catch {
      // Ignore JSON parse errors on error responses
    }
    throw new ApiError(message, res.status, fields);
  }

  return (await res.json()) as T;
}

function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, value);
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// --- Current User / Role Switcher ---

export async function getMe(): Promise<User> {
  return request<User>('/api/me');
}

export async function setMe(
  input: string | { userId: string; role?: Role },
): Promise<User> {
  const userId = typeof input === 'string' ? input : input.userId;
  return request<User>('/api/me', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export const switchUser = setMe;

export async function getUsers(role?: Role): Promise<User[]> {
  return request<User[]>(`/api/users${buildQuery({ role })}`);
}

// --- Incidents ---

export interface CreateIncidentInput {
  answers: Answers;
  transcript?: string;
  footageHoldRequested: boolean;
  anonymous?: boolean;
}

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  return request<Incident>('/api/incidents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export const submitIncident = createIncident;

export interface ListIncidentsParams {
  scope?: 'mine' | 'queue' | 'inbox' | 'ea' | 'all';
  status?: Status;
  type?: IncidentType;
  site?: string;
}

export async function getIncidents(params?: ListIncidentsParams): Promise<IncidentListItem[]> {
  return request<IncidentListItem[]>(
    `/api/incidents${buildQuery({
      scope: params?.scope,
      status: params?.status,
      type: params?.type,
      site: params?.site,
    })}`,
  );
}

export const listIncidents = getIncidents;

export async function getIncident(id: string): Promise<IncidentDetail> {
  return request<IncidentDetail>(`/api/incidents/${encodeURIComponent(id)}`);
}

export async function openIncident(id: string): Promise<IncidentDetail> {
  return request<IncidentDetail>(`/api/incidents/${encodeURIComponent(id)}/open`, {
    method: 'POST',
  });
}

export async function reviewIncident(
  id: string,
  input: SupervisorReviewInput,
): Promise<IncidentDetail> {
  return request<IncidentDetail>(`/api/incidents/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export const submitReview = reviewIncident;

export async function ackIncident(
  id: string,
  input: { ackId: string; comment?: string },
): Promise<IncidentDetail> {
  return request<IncidentDetail>(`/api/incidents/${encodeURIComponent(id)}/ack`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export const acknowledgeIncident = ackIncident;

export async function receiveIncident(id: string): Promise<IncidentDetail> {
  return request<IncidentDetail>(`/api/incidents/${encodeURIComponent(id)}/receive`, {
    method: 'POST',
  });
}

export async function reopenIncident(
  id: string,
  input: { reason: string } | string,
): Promise<IncidentDetail> {
  const payload = typeof input === 'string' ? { reason: input } : input;
  return request<IncidentDetail>(`/api/incidents/${encodeURIComponent(id)}/reopen`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// --- Actions & Clocks ---

export async function updateAction(
  id: string,
  input: { status: FollowUpAction['status'] } | FollowUpAction['status'],
): Promise<FollowUpAction> {
  const payload = typeof input === 'string' ? { status: input } : input;
  return request<FollowUpAction>(`/api/actions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function markClockMet(id: string): Promise<ComplianceClock> {
  return request<ComplianceClock>(`/api/clocks/${encodeURIComponent(id)}/met`, {
    method: 'POST',
  });
}

// --- Intake (owned by Mathew) ---

export async function extractIntake(
  input: IntakeExtractRequest,
): Promise<IntakeExtractResponse> {
  return request<IntakeExtractResponse>('/api/intake/extract', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function transcribeIntake(
  audio: Blob | File | FormData,
): Promise<{ transcript: string }> {
  const formData =
    audio instanceof FormData
      ? audio
      : (() => {
          const fd = new FormData();
          fd.append('audio', audio);
          return fd;
        })();
  return request<{ transcript: string }>('/api/intake/transcribe', {
    method: 'POST',
    body: formData,
  });
}

// --- Executive Dashboard (consumed by Ananya) ---

export async function getTrends(params?: {
  from?: string;
  to?: string;
  site?: string;
}): Promise<TrendsResponse> {
  return request<TrendsResponse>(`/api/trends${buildQuery(params)}`);
}

export async function getInsights(params?: {
  from?: string;
  to?: string;
}): Promise<InsightsResponse> {
  return request<InsightsResponse>(`/api/insights${buildQuery(params)}`);
}

// --- Dev / Seeding Helpers ---

export async function resetDemo(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/dev/reset-demo', {
    method: 'POST',
  });
}

