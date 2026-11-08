# Neel — Shared UI kit and role switcher

Status: **implemented for Milestone 1**. Lint and build are the last checks.

## What works
- Shared UI primitives in `components/ui/`: `Button`, `Card`, `Badge`, `StatusPill`, `TypeChip`, `SeverityDot`, `ToConfirmTag`, `AiLabel`, `ClockChip`, and `EmptyState`.
- Landing page at `/` with a role-based switcher using the fictional Langs users from A8.
- Role switching uses the real API helper (`lib/api-client.ts`) and falls back to an isolated mock list if the role endpoint is unavailable.
- Role destinations match the expected Langs flow: staff → `/report`, supervisors → `/supervisor`, specialty roles → `/inbox`, EA → `/ea`, executive → `/dashboard`.

## How to run / test
```bash
npm run dev
```
Then open `http://localhost:3000` and select a user from the role groups.

## What is mocked
- The role-switcher fallback is isolated in `lib/mock/neel.ts` and only used when the live API request fails.
- This milestone does not attempt to implement backend or record review screens; it is intentionally limited to the reusable UI and landing flow.

## What's left
- Full review consoles and tracker screens are still pending in later milestones.
- No backend or teammate files were modified; the UI is intentionally small and compatible with the shared contract.

## For teammates
- `app/page.tsx` is the landing entry point and should stay as the role-switcher for the team demo.
- The shared UI exports are available from `@/components/ui`.
