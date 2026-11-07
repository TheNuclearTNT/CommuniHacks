# Connan — Backend, Database, Workflow Engine & AI Analysis Status

## What Works (Completed)

1. **Repo Scaffold & Shared Contract**
   - Next.js (App Router, TypeScript strict, Tailwind CSS, ESLint) configured at the repo root (`langs-safereport`).
   - Exact shared contract in [`lib/types.ts`](../../lib/types.ts) (A6).
   - Typed fetch helpers for every A7 endpoint in [`lib/api-client.ts`](../../lib/api-client.ts), including `ApiError` (`status`, `fields`).
   - Routing display labels and configuration in [`config/routing.ts`](../../config/routing.ts).

2. **Database & Migrations (`lib/db/**`, `drizzle/`, `scripts/seed-users.ts`)**
   - Drizzle schema in [`lib/db/schema.ts`](../../lib/db/schema.ts) covering all 7 tables (`users`, `incidents`, `supervisor_reviews`, `acknowledgements`, `follow_up_actions`, `compliance_clocks`, `events`) plus `incident_id_seq` (`INC-2026-0001` format).
   - SQL migrations generated and committed in [`drizzle/0000_groovy_marvel_apes.sql`](../../drizzle/0000_groovy_marvel_apes.sql).
   - [`lib/db/index.ts`](../../lib/db/index.ts) connects to TigerData / Postgres via `DATABASE_URL` (`postgres` driver, `prepare: false` for Vercel/pooler compatibility) and attempts `SELECT create_hypertable('events', 'time', if_not_exists => TRUE)` wrapped in `try/catch` so plain Postgres works seamlessly.
   - **Zero-config local fallback**: if `DATABASE_URL` is unset or unreachable locally, `lib/db/index.ts` automatically falls back to an embedded PostgreSQL instance (`@electric-sql/pglite` in `./.pgdata` locally or `/tmp/langs-pgdata` on Vercel) and seeds the 12 fictional A8 users plus 5 baseline incidents (`INC-2026-0001` through `INC-2026-0005`).

3. **Deterministic Workflow Engine & Compliance Clocks (`lib/workflow/**`)**
   - [`lib/workflow/rules.ts`](../../lib/workflow/rules.ts) (pure, client-safe — zero DB/server imports):
     - `deriveTypes(answers): IncidentType[]` (A3.3)
     - `requiredAcks(review): { type, role, toConfirm }[]` (A3.4, merges duplicate roles)
     - `formatFootageHoldTitle(answers)` (A3.8)
   - [`lib/workflow/clocks.ts`](../../lib/workflow/clocks.ts):
     - `buildComplianceClocks(review, startedAt)` & `addOntarioBusinessDays(start, days)` using `date-fns` (`WSIB_FORM7` 3 business days skipping Sat/Sun; `MOL_CRITICAL_NOTICE` immediate; `CRITICAL_WRITTEN_48H` 48h; `JHSC_4DAY` 4 calendar days).
     - Note: Ontario statutory holidays are not excluded in business-day math (*Prototype guidance — Langs to confirm*).
   - [`lib/workflow/transition.ts`](../../lib/workflow/transition.ts):
     - Transactional `transition(incidentId, action, actor, input?)` handling `submit`, `open`, `review` (with implicit `open` when supervisor reviews a `SUBMITTED` or `REOPENED` record), `ack`, `receive`, and `reopen` (increments `cycle` on the same incident ID).
     - Enforces `403` on wrong role, `409` on illegal state transition, and `400` on validation errors.

4. **Gemini AI Analysis (`lib/ai/gemini.ts`)**
   - `analyseIncident(answers, transcript)`: structured JSON output validated with Zod, deterministic scenario-aware mocks when `USE_MOCK_AI=true`, and a non-blocking rule-based fallback (`deriveTypes` + empty bullets) if Gemini fails.
   - `generateJson<T>(prompt, schema)` exported for Mathew's intake routes.

5. **API Endpoints (`app/api/**`)**
   - `GET /api/me`, `POST /api/me` (sets `userId` & `role` cookies)
   - `GET /api/users?role=`
   - `GET /api/incidents?scope=mine|queue|inbox|ea|all&status=&type=&site=`
   - `POST /api/incidents`
   - `GET /api/incidents/:id`
   - `POST /api/incidents/:id/open`
   - `POST /api/incidents/:id/review`
   - `POST /api/incidents/:id/ack`
   - `POST /api/incidents/:id/receive`
   - `POST /api/incidents/:id/reopen`
   - `PATCH /api/actions/:id` (updates follow-up actions **and** also accepts a compliance clock ID to mark `metAt` when `status === 'DONE'`)
   - `POST /api/clocks/:id/met` (dedicated endpoint to mark a compliance clock met)
   - `GET /api/trends?from=&to=&site=` (`from`, `to`, and `site` filters apply to every field including `stageDurations`; defaults to all sites, last 12 weeks)
   - `GET /api/insights?from=&to=` (sends only aggregates + top-N incident IDs to Gemini, validates returned IDs against supplied IDs)

---

## How to Run, Migrate, Seed & Test

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Copy .env.example -> .env.local
cp .env.example .env.local

# 3. Push schema to DATABASE_URL (if using external TigerData/Postgres)
npm run db:push

# 4. Seed the 12 fictional A8 users + baseline incidents
npm run db:seed

# 5. Run unit & state-machine tests (Vitest)
npm test

# 6. Lint and production build
npm run lint
npm run build
```

---

## Handoff Notes for Teammates

- **Mathew (Staff Intake)**:
  - Import `createIncident` from `@/lib/api-client` (or `POST /api/incidents` with `{ answers, transcript?, footageHoldRequested }`).Note that `q35` accepts either a supervisor user ID (`u_sup_1`, `u_sup_2`) or their display name (`Jordan Reyes`, `Morgan Blake`).
  - Import `deriveTypes` from `@/lib/workflow/rules` (pure, browser-safe).
  - Import `generateJson` and `isMockAiEnabled` from `@/lib/ai/gemini` for `/api/intake/extract`.
- **Neel (Review Consoles)**:
  - All transition helpers (`openIncident`, `reviewIncident`, `ackIncident`, `receiveIncident`, `reopenIncident`, `updateAction`, `markClockMet`) are in `@/lib/api-client`.
  - When a compliance clock is marked done in the UI, you can call either `PATCH /api/actions/:clockId` with `{ status: 'DONE' }` (`updateAction(clock.id, 'DONE')`) or `POST /api/clocks/:clockId/met` (`markClockMet(clock.id)`).
  - `POST /api/incidents/:id/ack` accepts `{ ackId, comment? }` (if `ackId` is omitted, it also matches by the caller's role in the current cycle).
- **Ananya (Dashboard, Seed & Vercel Deploy)**:
  - `GET /api/trends?from=&to=&site=` applies `from`, `to`, and `site` across all 5 response fields (`totals`, `byWeekType`, `bySite`, `heatmap`, and `stageDurations`). When omitted, it defaults to all sites over the last 12 weeks.
  - Your `scripts/seed.ts` can import `getDb`, `schema`, and `seedBaseUsers` from `@/lib/db`. Set `SKIP_DEMO_SEED=true` if you want to wipe and replace the 5 baseline incidents (`INC-2026-0001`..`INC-2026-0005`).
  - On Vercel, configure env vars `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `ELEVENLABS_API_KEY`, and `USE_MOCK_AI`.

