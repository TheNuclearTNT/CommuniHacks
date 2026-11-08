# Demo script — 3 minutes

Setup before going on: app open on the landing page, seeded DB, `USE_MOCK_AI=true` on the backup laptop, browser zoom 110%, phone-width tab for the staff screen, second tab already on `/dashboard`.

| # | Time | Who's on screen | Say | Do |
|---|---|---|---|---|
| 1 | 0:00–0:20 | Landing | "Some incidents at Langs never get recorded, and the ones that do can get lost between people. Langs Line makes reporting quick mid-shift, and makes every hand-off visible until the record is filed." | Show the landing page and role switcher. |
| 2 | 0:20–1:00 | Riley (Staff), phone width | "Riley just hurt her hand moving a supply box. She doesn't type a 35-question form — she just says what happened." | Tap the mic; speak Scenario 3 (Mathew's line). Form fills. Answer the one follow-up question. Submit. Point at the reference number. |
| 3 | 1:00–1:40 | Jordan (Supervisor) | "Her supervisor gets an AI summary — labelled for checking — and it caught a mismatch. The review is pre-filled from Langs' own routing sheet. Because she needed care beyond first aid, the WSIB three-business-day clock starts. And it shows exactly where this will go: JOHSC Chair." | Point at summary, discrepancy, clock, "Will be sent to". **Tick Facilities** → preview adds IT/Facilities + Director of Ops. "Change the type, the route changes." Untick, submit. |
| 4 | 1:40–2:10 | Alex (JOHSC) → Avery (EA) | "Specialty areas acknowledge — not approve. Once every acknowledgement is in, the Executive Assistant confirms receipt and files it." | Switch role, Acknowledge. Switch to EA, Confirm receipt and file. Tracker fills to "Filed and closed". |
| 5 | 2:10–2:25 | Avery | "Need more follow-up? Reopen — same reference number, cycle 2, full history kept. No disconnected second record." | Reopen with a note. Show same INC #, cycle 2, timeline. |
| 6 | 2:25–2:50 | Drew (Executive), `/dashboard` | "With 200 fictional records, patterns jump out: verbal aggression at Main Site on Friday afternoons has doubled. And the real bottleneck isn't staff — reports wait longest at specialty acknowledgement." | Point at heatmap, then the stage chart headline. Read one briefing bullet, click "see N records". |
| 7 | 2:50–3:00 | Dashboard | "Built on Langs' own form and routing, with every assumption labelled for you to confirm." | Point at a grey TO CONFIRM tag. Stop. |

Rehearsal log (target < 3:00):

| Run | Date | Time | What to fix |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## If something breaks

- **Wi-Fi / Vercel down:** switch to the backup laptop (`npm run dev`, local seeded DB, `USE_MOCK_AI=true`). Same script.
- **Voice fails:** "Here's the same thing typed" — paste the Scenario 3 narrative into the text box.
- **Gemini slow:** mock mode is already on for the demo laptop; say "AI is optional — routing never depends on it."

## Q&A prep

- **Why no CCTV AI?** "Privacy in a health centre, and your guardrails. Instead we trigger a footage-hold request so an authorised person can review it."
- **Does AI decide routing?** "No. Routing is fixed rules from your sheet. AI only suggests and flags mismatches; the supervisor confirms."
- **Is it PHIPA-ready?** "It's a prototype on fictional data. We designed it for role-based access and a full audit trail; production hosting would need to be in Canada — that's a decision for Langs." *(Vercel hosts on US infrastructure by default — don't claim Canadian hosting.)*
- **What if AI is down?** Show mock mode / the manual form.
- **Where does the dashboard data come from?** "Fictional records generated with patterns we planted, run through the same workflow as real reports."
