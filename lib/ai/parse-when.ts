// Understands everyday date and time phrases without AI, so the report chat
// can't get stuck on "When did this happen?" when Gemini is off or out of
// quota. Pure functions: safe on the client and the server.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Today in Ontario, as a local Date at midnight. */
export function ontarioToday(): Date {
  const [y, m, d] = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }).split('-').map(Number);
  return new Date(y, m - 1, d);
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const daysBefore = (base: Date, n: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d;
};

/** A reported incident can't be in the future: roll back a year (or month). */
function notInFuture(d: Date, today: Date, step: 'year' | 'month'): Date {
  if (d <= today) return d;
  const r = new Date(d);
  if (step === 'year') r.setFullYear(r.getFullYear() - 1);
  else r.setMonth(r.getMonth() - 1);
  return r;
}

/** "last night", "10th sept", "Sept 10", "the 10th", "friday", "2026-09-10", "10/9" → YYYY-MM-DD. */
export function parseDatePhrase(text: string, today: Date = ontarioToday()): string | null {
  const t = text.toLowerCase();

  if (/\b(today|this morning|this afternoon|this evening|tonight|earlier today)\b/.test(t)) return ymd(today);
  if (/\b(yesterday|last night)\b/.test(t)) return ymd(daysBefore(today, 1));
  if (/\bday before yesterday\b/.test(t)) return ymd(daysBefore(today, 2));

  const iso = /\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/.exec(t);
  if (iso) return ymd(new Date(+iso[1], +iso[2] - 1, +iso[3]));

  const monthIndex = (word: string) => MONTHS.findIndex((m) => word.startsWith(m));
  const yearIn = /\b(20\d\d)\b/.exec(t);

  // "10th sept", "10 september 2026"
  let m = /\b(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+([a-z]{3,9})\b/.exec(t);
  if (m && monthIndex(m[2]) >= 0) {
    const d = new Date(yearIn ? +yearIn[1] : today.getFullYear(), monthIndex(m[2]), +m[1]);
    return ymd(yearIn ? d : notInFuture(d, today, 'year'));
  }
  // "sept 10", "september 10th"
  m = /\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/.exec(t);
  if (m && monthIndex(m[1]) >= 0) {
    const d = new Date(yearIn ? +yearIn[1] : today.getFullYear(), monthIndex(m[1]), +m[2]);
    return ymd(yearIn ? d : notInFuture(d, today, 'year'));
  }
  // "10/9" or "10/9/2026" — Canadian day/month order
  m = /\b(\d{1,2})\/(\d{1,2})(?:\/(20\d\d))?\b/.exec(t);
  if (m && +m[2] >= 1 && +m[2] <= 12) {
    const d = new Date(m[3] ? +m[3] : today.getFullYear(), +m[2] - 1, +m[1]);
    return ymd(m[3] ? d : notInFuture(d, today, 'year'));
  }
  // "on friday", "last friday"
  const wd = WEEKDAYS.findIndex((w) => new RegExp(`\\b${w}\\b`).test(t));
  if (wd >= 0) {
    const back = (today.getDay() - wd + 7) % 7 || (/\blast\b/.test(t) ? 7 : 0);
    return ymd(daysBefore(today, back));
  }
  // "the 10th", "10th" — this month, or last month if that's still ahead
  m = /\b(\d{1,2})(st|nd|rd|th)\b/.exec(t);
  if (m && +m[1] >= 1 && +m[1] <= 31) {
    return ymd(notInFuture(new Date(today.getFullYear(), today.getMonth(), +m[1]), today, 'month'));
  }
  return null;
}

/** "10 pm", "10:30am", "at 22:15", "noon", "10 last night" → the form's "10:00PM" style. */
export function parseTimePhrase(text: string): string | null {
  const t = text.toLowerCase();
  if (/\bnoon\b|\bmidday\b/.test(t)) return '12:00PM';
  if (/\bmidnight\b/.test(t)) return '12:00AM';
  const fmt = (h24: number, min: number) => {
    const pm = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(min).padStart(2, '0')}${pm ? 'PM' : 'AM'}`;
  };
  let m = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/.exec(t);
  if (m && +m[1] >= 1 && +m[1] <= 12) {
    const pm = m[3].startsWith('p');
    return fmt((+m[1] % 12) + (pm ? 12 : 0), m[2] ? +m[2] : 0);
  }
  m = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(t);
  if (m) return fmt(+m[1], +m[2]);
  // "at 10 last night", "around 3 this afternoon"
  m = /\b(?:at|around|about)\s+(\d{1,2})(?::(\d{2}))?\b/.exec(t);
  if (m && +m[1] >= 1 && +m[1] <= 12) {
    const pm = /\b(night|evening|afternoon|tonight)\b/.test(t) || (+m[1] >= 1 && +m[1] <= 6);
    return fmt((+m[1] % 12) + (pm ? 12 : 0), m[2] ? +m[2] : 0);
  }
  return null;
}
