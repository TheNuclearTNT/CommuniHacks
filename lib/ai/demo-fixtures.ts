// Pre-written answers for the demo stories, so the live demo doesn't spend
// Gemini quota (the free tier runs out after a few dozen calls). When a
// reporter tells one of these stories — typed, tapped from the example chips,
// or spoken (wording can differ a little) — the form filler and the
// supervisor summary use these instead of calling Gemini.
//
// Fictional data only. Pure data + matching: safe to import on the client.

import type { AiAnalysis, Answers, IncidentType } from '@/lib/types';

export interface DemoStory {
  id: string;
  label: string; // shown on the example chip
  text: string; // the story as typed / spoken
  answers: () => Answers; // a function so "today" resolves when it is used
  analysis: Omit<AiAnalysis, 'generatedAt' | 'mock'>;
}

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });

/** Most recent Friday on or before today (Ontario), as YYYY-MM-DD. */
const lastFriday = () => {
  const [y, m, d] = today().split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - ((date.getDay() + 2) % 7));
  return date.toLocaleDateString('en-CA');
};

const NO_EMERGENCY: Answers = { q20: 'No', q22: 'No', q23: 'No', q28: 'No', q30: 'No' };

export const DEMO_STORIES: DemoStory[] = [
  {
    id: 'privacy-email',
    label: 'Privacy · Misdirected email',
    text: 'This morning around 9:15 AM at Main Site, a staff member accidentally replied-all to an external community partner email thread that had a client schedule spreadsheet attached. We immediately recalled the message, notified our supervisor, and asked the recipient to delete the attachment.',
    answers: () => ({
      q1: today(),
      q2: '9:15AM',
      q5: 'Main Site',
      q9: 'Non Applicable',
      q13: 'Less Serious',
      q14: 'No',
      q16: 'No',
      q18: 'Yes',
      q19: ['Privacy/Confidentiality'],
      ...NO_EMERGENCY,
      q31: ['Supervisory Support'],
      q32: 'A staff member replied-all to an external community partner email thread with a client schedule spreadsheet attached. The message was recalled, the supervisor was notified, and the recipient was asked to delete the attachment.',
      q34: 'No',
    }),
    analysis: {
      summaryBullets: [
        'A client schedule spreadsheet was sent to an external community partner by a reply-all at Main Site.',
        'The staff member recalled the message and notified their supervisor straight away.',
        'The recipient was asked to delete the attachment; deletion is not yet confirmed.',
        'Privacy Officer acknowledgement is needed to assess containment.',
      ],
      suggestedTypes: ['PRIVACY'],
      discrepancies: [],
      draftReview: {
        confirmedTypes: ['PRIVACY'],
        severity: 'Less Serious',
        notes: 'Misdirected email with client schedule; recall attempted. Confirm the recipient has deleted the attachment.',
      },
    },
  },
  {
    id: 'stairwell-fall',
    label: 'Staff Injury · Wet stairwell fall',
    text: 'At 2:30 PM today at Grow Community Centre, a youth worker slipped on melted snow near the east stairwell landing and twisted their right ankle. A first aid ice pack was applied on site and they went to a walk-in clinic for an X-ray. A wet floor cone was placed immediately.',
    answers: () => ({
      q1: today(),
      q2: '2:30PM',
      q5: 'Grow Community Centre',
      q9: 'Staff/Volunteer',
      q13: 'Less Serious',
      q14: 'Yes',
      q15: ['Slip/Trip/Fall'],
      q16: 'No',
      q18: 'No',
      ...NO_EMERGENCY,
      q31: ['First Aid'],
      q32: 'A youth worker slipped on melted snow near the east stairwell landing and twisted their right ankle. An ice pack was applied on site and they went to a walk-in clinic for an X-ray. A wet floor cone was placed.',
      q33: 'Check entrance mats and stairwell drainage on snowy days.',
      q34: 'No',
    }),
    analysis: {
      summaryBullets: [
        'A youth worker slipped on melted snow at the east stairwell landing at Grow Community Centre.',
        'They twisted their right ankle; first aid (ice pack) was given on site.',
        'They went to a walk-in clinic for an X-ray, which is health care beyond first aid.',
        'A wet floor cone was placed right away.',
      ],
      suggestedTypes: ['STAFF_INJURY', 'FACILITIES'],
      discrepancies: [
        {
          field: 'q33',
          note: 'The narrative describes a clinic visit (health care beyond first aid), so a WSIB Form 7 may be required. Confirm in the review.',
        },
        {
          field: 'q18',
          note: 'Melted snow at the stairwell is a facility hazard; consider adding Facilities so IT/Facilities and the Director of Operations are notified.',
        },
      ],
      draftReview: {
        confirmedTypes: ['STAFF_INJURY'],
        severity: 'Less Serious',
        healthCareBeyondFirstAid: true,
        notes: 'Slip on melted snow; walk-in clinic X-ray. Check stairwell mats.',
      },
    },
  },
  {
    id: 'lobby-escalation',
    label: 'Behavioural · Lobby escalation',
    text: 'Around 3:45 PM on Friday at Main Site reception, a visitor became verbally agitated at the front desk, shouted at two reception staff members, and knocked over a brochure stand before leaving.',
    answers: () => ({
      q1: lastFriday(),
      q2: '3:45PM',
      q5: 'Main Site',
      q9: 'Visitor',
      q13: 'Less Serious',
      q14: 'No',
      q16: 'Yes',
      q17: ['Verbal Aggression'],
      q18: 'No',
      ...NO_EMERGENCY,
      q32: 'A visitor became verbally agitated at the Main Site front desk, shouted at two reception staff members and knocked over a brochure stand before leaving.',
      q34: 'No',
    }),
    analysis: {
      summaryBullets: [
        'A visitor shouted at two reception staff members at the Main Site front desk on Friday afternoon.',
        'A brochure stand was knocked over; the visitor then left.',
        'No injuries or emergency response were reported.',
      ],
      suggestedTypes: ['BEHAVIOURAL'],
      discrepancies: [
        {
          field: 'q18',
          note: 'The brochure stand was knocked over: if it was damaged, Building/Facility (property damage) may apply.',
        },
      ],
      draftReview: {
        confirmedTypes: ['BEHAVIOURAL'],
        severity: 'Less Serious',
        seriousBehavioural: false,
        notes: 'Verbal aggression at reception; check in with the two staff members.',
      },
    },
  },
  {
    id: 'scenario-3-hand',
    label: 'Scenario 3 · Hand injury',
    text: "This is Riley at Main Site, about 2:15 today. I was moving a sealed supply box in the storage room and pinched my hand between the box and the shelf. Priya saw it. I put ice on it and Jordan gave first aid. It's minor, I'm back at work.",
    answers: () => ({
      q1: today(),
      q2: '2:15PM',
      q3: 'Riley Chen',
      q4: 'Priya Nair witnessed the incident.',
      q5: 'Main Site',
      q9: 'Staff/Volunteer',
      q11: 'Riley Chen',
      q13: 'Less Serious',
      q14: 'Yes',
      q15: ['Impact (e.g. head injury, crushed finger etc.)'],
      q16: 'No',
      q18: 'No',
      ...NO_EMERGENCY,
      q31: ['First Aid'],
      q32: 'While moving a sealed supply box in the storage room at Main Site, the staff member pinched their hand between the box and a shelf. A colleague witnessed it. Ice and first aid were given and the staff member returned to work.',
      q34: 'No',
      q35: 'Jordan Reyes',
    }),
    analysis: {
      summaryBullets: [
        'A staff member pinched their hand between a sealed supply box and a shelf in the Main Site storage room.',
        'Priya Nair witnessed the incident.',
        'Ice and first aid were given by the supervisor; the staff member returned to work.',
        'Minor injury with first aid only: JOHSC Chair acknowledgement applies.',
      ],
      suggestedTypes: ['STAFF_INJURY'],
      discrepancies: [],
      draftReview: {
        confirmedTypes: ['STAFF_INJURY'],
        severity: 'Less Serious',
        notes: 'Minor hand injury, first aid only. Review storage room shelving and lifting practice.',
      },
    },
  },
];

const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9: ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3),
  );

/**
 * The demo story this text tells, if any. Forgiving on purpose: a spoken
 * version or a rewrite (e.g. the q32 summary) matches if most of the story's
 * words are there.
 */
export function matchDemoStory(text: string | null | undefined): DemoStory | undefined {
  if (!text || text.length < 40) return undefined;
  const have = words(text);
  let best: { story: DemoStory; score: number } | undefined;
  for (const story of DEMO_STORIES) {
    for (const version of [story.text, String(story.answers().q32 ?? '')]) {
      const want = words(version);
      if (want.size === 0) continue;
      const hits = [...want].filter((w) => have.has(w)).length;
      const score = hits / want.size;
      if (!best || score > best.score) best = { story, score };
    }
  }
  return best && best.score >= 0.7 ? best.story : undefined;
}

/** The pre-written supervisor summary for a demo story, or undefined. */
export function demoAnalysis(answers: Answers, transcript?: string): AiAnalysis | undefined {
  const story = matchDemoStory(transcript) ?? matchDemoStory(typeof answers.q32 === 'string' ? answers.q32 : null);
  if (!story) return undefined;
  return {
    ...story.analysis,
    suggestedTypes: [...story.analysis.suggestedTypes] as IncidentType[],
    generatedAt: new Date().toISOString(),
    mock: true,
  };
}
