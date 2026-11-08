# LangsLine

An incident reporting tool built for Langs Community Health Centre at CommuniHacks.

## The problem

Front-line staff at a community health centre see a lot: a client safety event, a near miss on a loose handrail, a privacy slip, a cyber scare, a verbal confrontation in the lobby. All of it is supposed to be reported. In practice, a lot of it never is.

The reason is the form. Langs' existing report has 35 questions. On a busy shift, that is enough friction that people skip it, so incidents go unrecorded. When incidents are not recorded, patterns stay invisible and follow-up falls through the cracks.

But a shorter form is not the answer either. Supervisors need the detail to review an incident, route it to the right person, and track it to closure. The real challenge is the balance: a report that is quick enough to actually finish, but complete enough to be useful.

## Solution

SafeReport keeps the full 35-question form but changes how it gets filled in.

Instead of facing 35 fields, a staff member just says what happened. The app listens, turns their words into form answers, and then asks only for the pieces that are still missing and actually matter for that kind of incident. An IT problem never gets asked whether someone was injured. A report that would have taken ten minutes of typing takes about a minute of talking.

On the other side, supervisors and executives get a clear view: every report, where each one sits in the review pathway, a 24-hour clock on supervisor reviews, and trends across incident types, sites and time.

## Users

The app has two sides, chosen from the home page.

**Front-line staff** report an incident. They can speak it, type it, or fill the form directly.

**Supervisors and executives** sign in to a portal to review reports, track their status, see trends, and edit the form's wording. (The sign-in is a simple demo gate, not production security.)

## Features

**For staff**
- Report by voice or text, guided by an assistant that asks follow-up questions in plain language.
- The assistant only asks what is relevant to the incident described, so no one answers questions that do not apply.
- If a report is too thin to act on, the assistant notices and asks for more detail.
- A manual form path that works on its own, with no microphone and no AI, as a fallback.
- Draft answers are saved in the browser, so a refresh does not lose a half-finished report.
- Mobile-first: large tap targets, works on a phone during a shift.

**For supervisors and executives**
- Form responses: every report, showing location, time, reporter, person involved, and a summary.
- Report status: a board of where each report sits — needs review, under specialty review, sent to the Executive Assistant, or filed and closed.
- 24-hour review clock: each report shows when the supervisor review is due, and flags it when it is overdue.
- Trends dashboard: incident counts by type, site and time, plus where reports get stuck in the pathway.
- Form editor: reword the 35 questions on screen; changes are saved to the database.

**Routing (the review pathway)**
- Every incident goes first to the reporter's supervisor.
- After the supervisor review, the incident type decides whether a specialty area (for example a Privacy Officer or the Joint Health and Safety committee) needs to acknowledge it.
- Once the required acknowledgements are in, the report reaches the Executive Assistant for final receipt and filing.
- A closed record can be reopened for follow-up without creating a duplicate.

## How it is built

**Framework**
- [Next.js](https://nextjs.org) (App Router) with TypeScript and React. One app handles both the pages and the API routes — there is no separate backend server.
- [Tailwind CSS](https://tailwindcss.com) for styling, in a calm, clinical light theme.

**Database**
- [TigerData](https://www.tigerdata.com) (PostgreSQL with TimescaleDB) accessed through the [Drizzle ORM](https://orm.drizzle.team). The app creates its own tables on first connect and seeds sample incidents so the dashboard has data to show.

**AI — Google Gemini**
- [Google Gemini](https://ai.google.dev) reads a reporter's spoken or typed account and maps it onto the form's structured questions, using strict JSON output so the answers always fit the form's options.
- Gemini also decides which incident categories apply, which is what lets the app skip irrelevant questions.
- Every AI step has a non-AI fallback, so a failed or missing AI call never blocks a report.

**Voice — ElevenLabs**
- [ElevenLabs](https://elevenlabs.io) speech-to-text turns the reporter's recording into text.
- ElevenLabs text-to-speech reads the assistant's questions aloud, so the whole intake can be done by voice.

**Charts**
- [Recharts](https://recharts.org) for the trends dashboard.

**Hosting**
- Deployed on [Vercel](https://vercel.com). Secrets (database URL, API keys) live in Vercel's environment settings and are never committed.

## Running it locally

You need Node 20 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Put these in `.env.local` (never commit it — it is already git-ignored):

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Your TigerData / PostgreSQL connection string (starts with `postgres://`). |
| `GEMINI_API_KEY` | Google Gemini API key. |
| `GEMINI_MODEL` | Gemini model name, e.g. `gemini-2.5-flash`. |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for voice: the assistant speaks its questions, and recordings are turned into text. |
| `ELEVENLABS_VOICE_ID` | Optional. Which voice speaks. Defaults to the premade voice "Sarah". Free plans can only use premade voices. |
| `USE_MOCK_VOICE` | Optional. `true` turns voice off: the assistant stays silent and recordings return a canned demo story. |
| `USE_MOCK_AI` | `true` runs canned AI responses offline (no Gemini key needed). `false` uses the real Gemini API. |
| `ALLOW_SEED_TIME` | `true` lets the seed script back-date sample data. |

With `USE_MOCK_AI=true`, the AI runs fully offline with deterministic sample responses — useful for a demo without a Gemini key. The real adaptive conversation needs `USE_MOCK_AI=false` and a real Gemini key.

Voice is switched separately. With a real `ELEVENLABS_API_KEY`, the assistant speaks and listens for real even while `USE_MOCK_AI=true`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the development server. |
| `npm run build` | Production build. |
| `npm run lint` | Lint the code. |
| `npm test` | Run the test suite. |
| `npm run db:seed` | Seed sample users and incidents. |

## A note on the prototype

This is a hackathon prototype. It uses fictional, non-identifiable data only. The sign-in gate is a demo placeholder, not real access control, and the app is not production-ready.

## Team

Built by Mathew, Connan, Neel and Ananya at CommuniHacks for the Langs Community Health Centre incident-reporting challenge.
