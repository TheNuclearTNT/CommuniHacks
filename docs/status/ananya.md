# Ananya — status

## What works (checked 7 Nov 2026 on this branch)
`npm run lint` and `npm run build` pass for the whole repo, and `npx tsc --noEmit` passes for Ananya's files. The one existing `LayoutProps` error in `app/layout.tsx` only clears after `next build` generates its types.

- **Seed** (`scripts/seed.ts` + generator in `lib/mock/ananya.ts`): 200 fictional incidents over 12 weeks. Each one goes through Connan's `transition()` (submit → open → review → acks → receive → reopen), so his rules create the acknowledgements, actions, clocks and events. The seed then moves every timestamp onto the planned timeline. It wipes incidents first and keeps users. A run on local PGlite takes about 7 seconds, and every record ends in its planned status: 147 closed, 22 specialty acknowledgement, 12 supervisor review, 8 with EA, 7 submitted, 4 reopened (plus 4 reopened and refiled), 3 overdue clocks.
- **Planted patterns** (fictional demo data):
  1. Main Site verbal aggression on Friday 1–5pm doubles: 8 → 16 per 4 weeks.
  2. Grow Community Centre slips, trips and falls: 3 in the 9 weeks before → 10 in the last 3.
  3. 22 of 30 privacy incidents are wrong-recipient emails.
  4. Specialty acknowledgement is the slowest stage: 4.4 days in the mock; 3.3 days live once Connan's stage-duration fix is in, 1.7 days before it.
- **Dashboard** (`/dashboard`, Executive or Supervisor role):
  - filters: presets, from/to dates, site
  - 6 metric cards
  - "Reports wait longest at …" stage chart
  - briefing with "see N records" links and "Suggested focus"
  - weekly stacked bars by type
  - site bars (click → `/supervisor?site=`)
  - day × hour heatmap

  Every chart has a table view. There are loading, empty and error states. No sideways scroll at 375px.
- **Mock mode:** `NEXT_PUBLIC_DASHBOARD_MOCK=true` shows the generated data with no backend. Live (Connan's `/api/trends` and `/api/insights`) is the default.

## How to run
```bash
npx tsx --env-file-if-exists=.env.local scripts/seed.ts   # stop `npm run dev` first if using local PGlite
npm run dev
# open /, switch to Drew Patel (Executive), then /dashboard
```

## Waiting on others
- **Connan** (`docs/requests/connan.md`, tested code included):
  - stage-duration SQL fix
  - heatmap in Toronto time
  - rule-based `/api/insights` for mock mode and as the fallback; the current mock briefing contradicts the seeded data
  - the `seed` npm script
- **Neel** (`docs/requests/neel.md`): `?site=` filter, Executive read access to `/records/[id]`, `components/ui` export names, a Trends link on the landing page.
- **Mathew** (`docs/requests/mathew.md`): the Scenario 3 demo line.

## Decisions to check with the team
- Supervisors can see the dashboard as well as executives, because the brief says supervisors should see trends.
- The briefing ignores the site filter, because `/api/insights` has no `site` parameter.

## Left to do
- Run the scenarios in `docs/testing.md` once Mathew's and Neel's screens are merged.
- Vercel import, env vars and GoDaddy DNS (`docs/deploy.md`); test the local fallback offline.
- Rehearse the script twice. Slides: https://claude.ai/artifact/Vycsh7qX9gTfXcMjbkM1oR (private until shared).
