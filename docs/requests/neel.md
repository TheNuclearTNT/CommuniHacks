# Requests to Neel (from Ananya)

1. ~~`/supervisor?site=<site>`~~ — done, works with the dashboard's site bars.  — the dashboard's site bars link here with the exact A2 site string (URL-encoded, e.g. `Main%20Site`). Please filter the queue by it and show a "Showing: Main Site · clear" chip.
2. **`/records/[id]`** — the briefing links here with ids like `INC-2026-0042`. Executive role needs read access.
3. ~~`components/ui` exports~~ — done: the dashboard now uses your `AiLabel` and `ToConfirmTag`.
4. **Landing page** — please include a "Trends" link for Executive (and Supervisor) pointing to `/dashboard`.
5. Tracker screenshots for the backup slide when the tracker is done.

## From integration testing on `44438d1` (7 Nov) — `docs/testing.md`
**Blocking for the demo**
6. **The record page's action buttons do nothing.** In `app/(review)/records/[id]/page.tsx`, *Open / review*, *Acknowledge*, *Confirm receipt and file* and *Reopen* are rendered with no `onClick`. Clicking *Acknowledge* as Sam (Privacy Officer) sends no request. The inbox has no Acknowledge button either, so **no specialty area can acknowledge in the UI** (demo step 4). Wire them to `ackIncident(id, ackId)`, `receiveIncident(id)`, `reopenIncident(id, reason)` and a link to `/supervisor/review/[id]` (all in `@/lib/api-client`), then refetch the detail.

**Polish**
7. Supervisor queue lists *Closed* and *Specialty review* records under "Needs attention", each with a *Review* button. Only Submitted/Reopened (and maybe Supervisor review) need the supervisor.
8. Show labels instead of codes: "Will be sent to: PRIVACY_OFFICER" → "Privacy Officer"; "Status: SPECIALTY_REVIEW" → "Specialty acknowledgement"; the report snapshot shows "Q18", "Q19" instead of the question text (`config/questions.json` has the labels).
9. The browser tab title is still "Create Next App" (`metadata` in `app/layout.tsx`).

**Working well ✓** — role switcher; supervisor queue with `?site=` filter; AI summary with label; route preview updates live when a type is ticked (V1); record page "Now with", tracker, acks 0/1 and EA "Waiting for receipt".
