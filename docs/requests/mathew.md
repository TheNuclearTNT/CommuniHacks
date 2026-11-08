# Requests to Mathew (from Ananya)

1. **Demo narrative:** please send the exact Scenario 3 sentence Riley will say, and roughly how long the voice → submit flow takes, for `docs/demo/script.md`.

(Answered already: Connan's `resolveSupervisorId` accepts q35 as a name or an id, and the seed writes q2 as `3:30PM`, the same as Connan's demo records.)

## From integration testing (7 Nov) — `docs/testing.md`
2. **`/report` is unreadable in dark mode.** `app/globals.css` still has the Next.js starter's `@media (prefers-color-scheme: dark)` block, which turns the page background `#0a0a0a`. The "Report an incident" heading is dark navy, so on a phone set to dark mode it's nearly invisible. The brief asks for a white background, so the simplest fix is to delete that media block (or give the staff layout `bg-white text-gray-900`). This affects every screen that doesn't paint its own background, not only yours.
3. **"My reports" link is 18px tall** on `/report`. The brief asks for large tap targets on staff screens; something like `inline-block py-3` (≥ 44px) would fix it.
