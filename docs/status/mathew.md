# Mathew — Staff intake (form engine, voice, AI fill)

Status: **working end to end in mock mode.** Lint, build and 18 unit tests pass.

## What works
- All 35 questions render from `config/questions.json` (exact Langs labels/options).
- Form engine (`components/form/logic.ts`): `isVisible`, `visibleQuestions`,
  `missingRequired`, `clearHidden`, `completeness`. Every `showIf` rule tested.
- `<IncidentForm>`: grouped by the three sections, completeness bar, required checks.
- Staff flow: `/report` → `/report/describe` (voice/type) → `/report/check` →
  `/report/questions` (one missing-required per screen) → `/report/extras` →
  `/report/review` → `/report/done/[id]`. Plus `/my-reports`.
- Draft saved to `localStorage` (try/catch), survives refresh.
- Voice: `POST /api/intake/transcribe` (ElevenLabs STT, mock = canned Scenario 3).
- AI fill: `POST /api/intake/extract` → `lib/ai/intake.ts` (Gemini structured
  JSON, mock = deterministic keyword rules). Scenario 3 fills 21 fields.
- `missingRequired` / follow-up are computed with our `logic.ts`, never the model.
- Manual form path works with voice AND AI switched off, and with no microphone.

## How to run / test
```bash
npm install
npm run dev          # http://localhost:3000 → redirects to /report
npm test             # 18 tests
npm run lint && npm run build
```
Mock mode is the default (`USE_MOCK_AI=true`, `NEXT_PUBLIC_MOCK_API=true`).
No API keys needed for the demo.

## What's mocked (swap to real with one flag each)
- `POST /api/incidents` and `GET /api/incidents?scope=mine` — **Connan's**. Mocked
  in `lib/mock/mathew.ts` via `lib/api-client.ts`. Set `NEXT_PUBLIC_MOCK_API=false`
  to hit the real routes once merged.
- `/records/[id]` and `<PathwayTracker>` — **Neel's**. `/my-reports` and
  `/report/done` link to `/records/[id]`; it 404s until Neel's view lands.
- `app/page.tsx` landing — **Neel's**. I left a thin redirect stub to `/report`
  so the flow runs standalone; delete it when Neel's landing merges.
- Real AI: set `USE_MOCK_AI=false` + `GEMINI_API_KEY` / `ELEVENLABS_API_KEY`.

## What's left / nice-to-have
- Optional ElevenLabs "Read it back" TTS on `/report/review`.
- The follow-up loop currently routes extra missing-required to `/report/questions`
  rather than looping conversationally in `/describe` (cap of 5 is in the design;
  wire the in-describe loop if time allows).
- Replace my local `Field`/pills with Neel's `components/ui/` primitives once ready.

## For teammates
- **Connan:** `POST /api/incidents` body is `{answers, transcript?, footageHoldRequested}`
  (see `lib/api-client.ts`). I consume `Incident.id` for the done screen.
- **Neel:** I link to `/records/[id]`; please keep that path. My status pills use
  the A3 display labels.
- **Ananya:** spoken Scenario 3 narrative is in `lib/mock/mathew.ts`
  (`SCENARIO_3_TRANSCRIPT`) — fills 15+ fields for the demo.
