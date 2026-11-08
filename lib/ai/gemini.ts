import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { z } from 'zod';
import type {
  AiAnalysis,
  Answers,
  IncidentType,
  InsightsResponse,
  SupervisorReviewInput,
} from '@/lib/types';
import {
  buildMockAiAnalysis,
  detectRuleDiscrepancies,
  MOCK_INSIGHTS,
} from '@/lib/mock/connan';
import { deriveTypes } from '@/lib/workflow/rules';
import { demoAnalysis } from '@/lib/ai/demo-fixtures';

const INCIDENT_TYPE_ENUM = [
  'PRIVACY',
  'STAFF_INJURY',
  'FACILITIES',
  'IT_CYBER',
  'BEHAVIOURAL',
  'CID',
] as const;

const SEVERITY_ENUM = ['Critical', 'Less Serious', 'Unsure'] as const;

export const AiAnalysisModelSchema = z.object({
  summaryBullets: z.array(z.string()).min(3).max(6),
  additionalTypes: z.array(z.enum(INCIDENT_TYPE_ENUM)).default([]),
  discrepancies: z
    .array(
      z.object({
        field: z.string(),
        note: z.string(),
      }),
    )
    .default([]),
  draftReview: z
    .object({
      severity: z.enum(SEVERITY_ENUM).optional(),
      seriousBehavioural: z.boolean().optional(),
      healthCareBeyondFirstAid: z.boolean().optional(),
      lostTime: z.boolean().optional(),
      criticalInjury: z.boolean().optional(),
      footageHold: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .default({}),
});

const AI_ANALYSIS_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summaryBullets: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 to 6 concise, factual, non-blaming summary bullets of the incident.',
    },
    additionalTypes: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        enum: [...INCIDENT_TYPE_ENUM],
      },
      description:
        'Additional incident types clearly implied by the narrative beyond the rule-derived types.',
    },
    discrepancies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          field: { type: Type.STRING },
          note: { type: Type.STRING },
        },
        required: ['field', 'note'],
      },
      description:
        'Discrepancies between the free-text narrative and structured form answers (e.g. q14, q18, q23, q13).',
    },
    draftReview: {
      type: Type.OBJECT,
      properties: {
        severity: { type: Type.STRING, enum: [...SEVERITY_ENUM] },
        seriousBehavioural: { type: Type.BOOLEAN },
        healthCareBeyondFirstAid: { type: Type.BOOLEAN },
        lostTime: { type: Type.BOOLEAN },
        criticalInjury: { type: Type.BOOLEAN },
        footageHold: { type: Type.BOOLEAN },
        notes: { type: Type.STRING },
      },
    },
  },
  required: ['summaryBullets', 'additionalTypes', 'discrepancies', 'draftReview'],
};

function isZodSchema<T>(schema: unknown): schema is z.ZodType<T> {
  return Boolean(
    schema &&
      typeof schema === 'object' &&
      'safeParse' in schema &&
      typeof (schema as z.ZodType<T>).safeParse === 'function',
  );
}

export function isMockAiEnabled(): boolean {
  return String(process.env.USE_MOCK_AI ?? '').toLowerCase() === 'true';
}

function getGenAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey });
}

function getModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
}

/**
 * Reusable structured JSON generation helper for Gemini (shared with Mathew's intake extractor).
 * Accepts either a Zod schema or a @google/genai responseSchema object.
 */
export async function generateJson<T>(
  prompt: string,
  schema?: z.ZodType<T> | Schema | Record<string, unknown>,
  options?: {
    responseSchema?: Schema;
    systemInstruction?: string;
  },
): Promise<T> {
  const ai = getGenAiClient();
  const model = getModelName();

  const responseSchema: Schema | undefined =
    options?.responseSchema ??
    (!isZodSchema<T>(schema) && schema ? (schema as Schema) : undefined);

  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      ...(responseSchema ? { responseSchema } : {}),
      ...(options?.systemInstruction
        ? { systemInstruction: options.systemInstruction }
        : {}),
    },
  });

  const rawText = res.text ?? '{}';
  const parsed: unknown = JSON.parse(rawText);

  if (isZodSchema<T>(schema)) {
    return schema.parse(parsed);
  }
  return parsed as T;
}

/**
 * Rule-based fallback when Gemini fails or is unavailable (B6: never block submission).
 */
export function buildRuleFallbackAiAnalysis(
  answers: Answers,
  transcript?: string,
): AiAnalysis {
  const baseTypes = deriveTypes(answers);
  const ruleDiscrepancies = detectRuleDiscrepancies(answers, transcript);
  const suggestedTypes = Array.from(
    new Set<IncidentType>([
      ...baseTypes,
      ...ruleDiscrepancies
        .map((d) => d.impliedType)
        .filter((t): t is IncidentType => Boolean(t)),
    ]),
  );

  const severityRaw = answers.q13;
  const severity: SupervisorReviewInput['severity'] =
    severityRaw === 'Critical' || severityRaw === 'Less Serious' || severityRaw === 'Unsure'
      ? severityRaw
      : 'Unsure';

  return {
    summaryBullets: [],
    suggestedTypes,
    discrepancies: ruleDiscrepancies.map(({ field, note }) => ({ field, note })),
    draftReview: {
      confirmedTypes: suggestedTypes,
      severity,
      seriousBehavioural: false,
      healthCareBeyondFirstAid: false,
      lostTime: false,
      criticalInjury: severity === 'Critical',
      correctiveActions: [],
      footageHold: false,
      notes: '',
    },
    generatedAt: new Date().toISOString(),
    mock: false,
  };
}

/**
 * Analyses an incident on submission (B6).
 * - With USE_MOCK_AI=true, returns deterministic scenario-aware mock analysis.
 * - Otherwise calls Gemini with structured JSON output + Zod validation.
 * - On any failure, returns rule-based fallback (deriveTypes + empty bullets) and never blocks submission.
 */
export async function analyseIncident(
  answers: Answers,
  transcript?: string,
): Promise<AiAnalysis> {
  // Demo stories have a pre-written summary: no Gemini call (saves quota).
  const demo = demoAnalysis(answers, transcript);
  if (demo) return demo;

  if (isMockAiEnabled()) {
    return buildMockAiAnalysis(answers, transcript, true);
  }

  const baseTypes = deriveTypes(answers);
  const ruleDiscrepancies = detectRuleDiscrepancies(answers, transcript);

  try {
    const prompt = [
      'You are an incident-reporting clinical risk assistant for Langs Community Health Centre (Ontario, Canada).',
      'Analyse the following fictional workplace incident intake submission.',
      'Rules:',
      '1. Produce 3 to 6 concise, factual, non-blaming summaryBullets.',
      '2. Rule-derived types are already: ' + JSON.stringify(baseTypes) + '.',
      '   Only add an IncidentType in additionalTypes if the narrative clearly indicates one that the checkboxes missed, and add a corresponding discrepancy note.',
      '3. Compare the narrative/transcript against the form answers for discrepancies (e.g., injury mentioned in text but q14="No"; police/911 mentioned but q23="No"; q13="Less Serious" when an emergency code was called in q20="Yes"; privacy breach described in text but q18="No").',
      '4. Pre-fill draftReview fields conservatively.',
      '',
      `Form Answers (JSON): ${JSON.stringify(answers)}`,
      `Voice Transcript: ${transcript ? JSON.stringify(transcript) : 'none'}`,
    ].join('\n');

    const modelResult = await generateJson(prompt, AiAnalysisModelSchema, {
      responseSchema: AI_ANALYSIS_RESPONSE_SCHEMA,
    });

    const suggestedTypes = Array.from(
      new Set<IncidentType>([
        ...baseTypes,
        ...modelResult.additionalTypes,
        ...ruleDiscrepancies
          .map((d) => d.impliedType)
          .filter((t): t is IncidentType => Boolean(t)),
      ]),
    );

    // Merge rule discrepancies + model discrepancies without duplicate field+note pairs
    const discrepancyMap = new Map<string, { field: string; note: string }>();
    for (const d of ruleDiscrepancies) {
      discrepancyMap.set(`${d.field}:${d.note}`, { field: d.field, note: d.note });
    }
    for (const d of modelResult.discrepancies) {
      discrepancyMap.set(`${d.field}:${d.note}`, { field: d.field, note: d.note });
    }

    const severityRaw = modelResult.draftReview.severity ?? answers.q13;
    const severity: SupervisorReviewInput['severity'] =
      severityRaw === 'Critical' || severityRaw === 'Less Serious' || severityRaw === 'Unsure'
        ? severityRaw
        : 'Unsure';

    return {
      summaryBullets: modelResult.summaryBullets.slice(0, 6),
      suggestedTypes,
      discrepancies: Array.from(discrepancyMap.values()),
      draftReview: {
        confirmedTypes: suggestedTypes,
        severity,
        seriousBehavioural: modelResult.draftReview.seriousBehavioural ?? false,
        healthCareBeyondFirstAid:
          modelResult.draftReview.healthCareBeyondFirstAid ?? false,
        lostTime: modelResult.draftReview.lostTime ?? false,
        criticalInjury:
          modelResult.draftReview.criticalInjury ?? severity === 'Critical',
        correctiveActions: [],
        footageHold: modelResult.draftReview.footageHold ?? false,
        notes: modelResult.draftReview.notes ?? '',
      },
      generatedAt: new Date().toISOString(),
      mock: false,
    };
  } catch (err) {
    console.warn(
      '[ai] Gemini analyseIncident failed; using rule-based fallback:',
      err instanceof Error ? err.message : err,
    );
    return buildRuleFallbackAiAnalysis(answers, transcript);
  }
}

const InsightsModelSchema = z.object({
  bullets: z
    .array(
      z.object({
        text: z.string(),
        incidentIds: z.array(z.string()),
      }),
    )
    .min(3)
    .max(5),
  focus: z.string(),
});

const INSIGHTS_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    bullets: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          incidentIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['text', 'incidentIds'],
      },
    },
    focus: { type: Type.STRING },
  },
  required: ['bullets', 'focus'],
};

export interface ExecutiveAggregatesPayload {
  byType: { type: string; count: number; sampleIncidentIds: string[] }[];
  bySite: { site: string; count: number; sampleIncidentIds: string[] }[];
  awaitingAckIds?: string[];
  overdueClockIds?: string[];
  reopenedIds?: string[];
  allowedIncidentIds: string[];
  ruleBullets?: { text: string; incidentIds: string[] }[];
  ruleFocus?: string;
}

const HUMAN_TYPE_LABEL: Record<string, string> = {
  PRIVACY: 'Privacy',
  STAFF_INJURY: 'Staff injury',
  FACILITIES: 'Facilities',
  IT_CYBER: 'IT / Cyber',
  BEHAVIOURAL: 'Behavioural',
  CID: 'Critical incident debrief',
};

/**
 * Data-driven deterministic insights computation over the database aggregates (used in mock mode and as no-AI fallback).
 */
export function computeDeterministicInsights(
  payload: ExecutiveAggregatesPayload,
  mockFlag: boolean,
): InsightsResponse {
  if (payload.allowedIncidentIds.length === 0) {
    return {
      ...MOCK_INSIGHTS,
      generatedAt: new Date().toISOString(),
      mock: mockFlag,
    };
  }

  if (payload.ruleBullets && payload.ruleBullets.length >= 3) {
    return {
      bullets: payload.ruleBullets.slice(0, 5),
      focus:
        payload.ruleFocus ||
        'Follow up specialty acknowledgements that have waited more than 3 days.',
      generatedAt: new Date().toISOString(),
      mock: mockFlag,
    };
  }

  const sortedSites = [...payload.bySite].sort((a, b) => b.count - a.count);
  const sortedTypes = [...payload.byType].sort((a, b) => b.count - a.count);
  const bullets: { text: string; incidentIds: string[] }[] = [
    ...(payload.ruleBullets ?? []),
  ];

  if (sortedSites.length > 0 && bullets.length < 5) {
    const topSite = sortedSites[0];
    bullets.push({
      text: `${topSite.site} accounts for the highest volume of reported incidents (${topSite.count} of ${payload.allowedIncidentIds.length} records in the selected window).`,
      incidentIds: topSite.sampleIncidentIds.slice(0, 4),
    });
  }

  if (sortedTypes.length > 0 && bullets.length < 5) {
    const topType = sortedTypes[0];
    const label = HUMAN_TYPE_LABEL[topType.type] ?? topType.type.replace('_', ' ');
    bullets.push({
      text: `${label} is the most frequent incident category (${topType.count} reports), requiring targeted preventive follow-up.`,
      incidentIds: topType.sampleIncidentIds.slice(0, 4),
    });
  }

  if (sortedTypes.length > 1 && bullets.length < 5) {
    const secondType = sortedTypes[1];
    const label = HUMAN_TYPE_LABEL[secondType.type] ?? secondType.type.replace('_', ' ');
    bullets.push({
      text: `${label} represents the second largest routing pathway (${secondType.count} reports) across Langs sites.`,
      incidentIds: secondType.sampleIncidentIds.slice(0, 4),
    });
  }

  if (payload.overdueClockIds && payload.overdueClockIds.length > 0 && bullets.length < 5) {
    bullets.push({
      text: `${payload.overdueClockIds.length} records have an overdue reporting clock.`,
      incidentIds: payload.overdueClockIds.slice(0, 4),
    });
  } else if (payload.awaitingAckIds && payload.awaitingAckIds.length > 0 && bullets.length < 5) {
    bullets.push({
      text: `${payload.awaitingAckIds.length} incident(s) are currently in specialty acknowledgement awaiting sign-off before Executive Assistant filing.`,
      incidentIds: payload.awaitingAckIds.slice(0, 4),
    });
  } else if (payload.reopenedIds && payload.reopenedIds.length > 0 && bullets.length < 5) {
    bullets.push({
      text: `${payload.reopenedIds.length} closed record(s) were reopened for additional follow-up on the same incident ID without creating duplicate records.`,
      incidentIds: payload.reopenedIds.slice(0, 4),
    });
  }

  // Ensure at least 3 bullets
  while (bullets.length < 3) {
    bullets.push({
      text: 'All submitted incidents in the window were routed through supervisor review with full audit logging.',
      incidentIds: payload.allowedIncidentIds.slice(0, 3),
    });
  }

  const topSiteName = sortedSites[0]?.site ?? 'Main Site';
  const topTypeRaw = sortedTypes[0]?.type ?? 'FACILITIES';
  const topTypeName = HUMAN_TYPE_LABEL[topTypeRaw]?.toLowerCase() ?? topTypeRaw.toLowerCase();

  return {
    bullets: bullets.slice(0, 5),
    focus:
      payload.ruleFocus ||
      `Prioritize preventive controls and timely specialty acknowledgements for ${topTypeName} incidents at ${topSiteName}.`,
    generatedAt: new Date().toISOString(),
    mock: mockFlag,
  };
}

/**
 * Generates executive insights over aggregate statistics and top-N incident IDs only (never raw answers) (B9).
 */
export async function generateExecutiveInsights(
  aggregatesPayload: ExecutiveAggregatesPayload,
): Promise<InsightsResponse> {
  const allowedSet = new Set(aggregatesPayload.allowedIncidentIds);

  if (isMockAiEnabled()) {
    return computeDeterministicInsights(aggregatesPayload, true);
  }

  // The briefing only changes when the records do: reuse it for 10 minutes
  // instead of calling Gemini on every dashboard load.
  const cacheKey = JSON.stringify(aggregatesPayload);
  const cached = insightsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.value;

  const result = await generateExecutiveInsightsUncached(aggregatesPayload, allowedSet);
  if (!result.mock) {
    if (insightsCache.size > 50) insightsCache.clear();
    insightsCache.set(cacheKey, { at: Date.now(), value: result });
  }
  return result;
}

const insightsCache = new Map<string, { at: number; value: InsightsResponse }>();

async function generateExecutiveInsightsUncached(
  aggregatesPayload: ExecutiveAggregatesPayload,
  allowedSet: Set<string>,
): Promise<InsightsResponse> {
  try {
    const prompt = [
      'You are an executive quality & safety analyst for Langs Community Health Centre.',
      'Given ONLY the following aggregate incident counts and incident IDs per group (no raw answers), produce 3 to 5 concise trend bullets and 1 actionable focus sentence.',
      'IMPORTANT: Every incidentId in your response MUST come strictly from allowedIncidentIds.',
      JSON.stringify(aggregatesPayload),
    ].join('\n');

    const res = await generateJson(prompt, InsightsModelSchema, {
      responseSchema: INSIGHTS_RESPONSE_SCHEMA,
    });

    return {
      bullets: res.bullets.slice(0, 5).map((b) => ({
        text: b.text,
        incidentIds: b.incidentIds.filter((id) => allowedSet.has(id)),
      })),
      focus: res.focus,
      generatedAt: new Date().toISOString(),
      mock: false,
    };
  } catch (err) {
    console.warn(
      '[ai] Gemini generateExecutiveInsights failed; using deterministic computeInsights fallback:',
      err instanceof Error ? err.message : err,
    );
    return computeDeterministicInsights(aggregatesPayload, false);
  }
}

