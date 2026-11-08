# Requests to Mathew (from Ananya)

1. **Demo narrative:** please send the exact Scenario 3 sentence Riley will say, and roughly how long the voice → submit flow takes, for `docs/demo/script.md`.

(Answered already: Connan's `resolveSupervisorId` accepts q35 as a name or an id, and the seed writes q2 as `3:30PM`, the same as Connan's demo records.)

## From integration testing (7 Nov) — `docs/testing.md`
2. **`/report` is unreadable in dark mode.** `app/globals.css` still has the Next.js starter's `@media (prefers-color-scheme: dark)` block, which turns the page background `#0a0a0a`. The "Report an incident" heading is dark navy, so on a phone set to dark mode it's nearly invisible. The brief asks for a white background, so the simplest fix is to delete that media block (or give the staff layout `bg-white text-gray-900`). This affects every screen that doesn't paint its own background, not only yours.
3. **"My reports" link is 18px tall** on `/report`. The brief asks for large tap targets on staff screens; something like `inline-block py-3` (≥ 44px) would fix it.
4. **Mock intake fills the wrong answers for anything except the Scenario 3 sentence** (`mockExtract` in `lib/mock/mathew.ts`). Typing a privacy email ("…emailed the schedule to the wrong external address. I noticed right away… No one was hurt.") gave:
   - Injury = Yes + Impact, because "hurt" in "no one was hurt"
   - First Aid, because "ice" in "noticed"
   - q32 replaced by the canned supply-box story (it's always set)
   - q18 forced to "No", so privacy can never be detected
   - date, time and reporting person left empty, though the text says "this morning at about 10:30" and Riley is signed in

   The demo is fine (it uses the Scenario 3 line), but a judge typing their own example in mock mode gets a wrong report. Suggestions: match whole words, use the transcript itself as q32, only set q18/q19 when the text mentions email/privacy/damage, and fill q3 from the signed-in user.
