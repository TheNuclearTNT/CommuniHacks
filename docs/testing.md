# Integration testing — Langs scenarios

Owner: Ananya. Run **in the UI by switching roles** at each team checkpoint. Record the date, commit and result in a new column block below.

Success check (what judges look for), applied to every row:
**O** = current owner / stage is shown · **A** = completed acknowledgements are shown · **E** = EA final receipt is shown · **S** = open / closed / reopened status is shown

## Checkpoint log

| Date | Commit | Level | Result |
|---|---|---|---|
| 7 Nov 2026 | `e37acc8` (main) | **API** — `npx tsx scripts/scenarios.ts` against `next start` on local PGlite, mock AI | **All 7 pass** (35 checks). UI run waits for Neel's review screens. |

API run covers: route per type, owner/stage after each step, ack rows and who acked, EA blocked before acks (409), wrong role blocked (403), EA receipt event, `closedAt`, reopen keeps the ref # with cycle 2 and full history, EA queue only after both acks.

**TO CONFIRM with Langs (from V2):** the EA can file and close a record while a follow-up action is still *Not started*. The action stays open on the closed record. Should closing wait until actions are done, or is the EA's receipt enough? (Team decision; Connan's engine allows it today.)

## Scenarios

| # | Scenario (Langs sheet) | Steps (role → action) | Expected route | O | A | E | S | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Privacy: fictional program schedule emailed to the wrong external address; supervisor told; recall attempted | Riley (Staff) submits with q18 = Yes, q19 = Privacy/Confidentiality, q31 = Supervisory Support → Jordan (Supervisor) opens, confirms Privacy, submits review → Sam (Privacy Officer) acknowledges → Avery (EA) confirms receipt and files | Supervisor → Privacy Officer ✓ → EA → Closed | | | | | API ✓ — Privacy Officer only; 409 before ack; 403 for wrong role; closed with EA receipt | UI pending |
| 2 | Facilities near miss: loose handrail, visitor nearly trips, no injury, area blocked | Riley submits with q9 = Visitor, q18 = Yes, q19 = Property Damage → Jordan reviews, confirms Facilities → Casey (IT/Facilities) acknowledges → Jamie (Director of Ops) acknowledges → Avery files | Supervisor → IT/Facilities ✓ + Director of Ops ✓ → EA → Closed | | | | | API ✓ — IT/Facilities + Director of Ops both recorded | UI pending |
| 3 | Staff injury: minor hand injury moving a sealed supply box; first aid | Riley submits with q9 = Staff/Volunteer, q14 = Yes, q15 = Impact, q31 = First Aid → Jordan reviews, confirms Staff injury → Alex or Taylor (JOHSC Chair) acknowledges → Avery files | Supervisor → JOHSC Chair ✓ → EA → Closed | | | | | API ✓ — one JOHSC Chair row (Taylor acked); no WSIB clock for first aid only | UI pending |
| V1 | Scenario 1 changed to Facilities | In Jordan's review, untick Privacy and tick Facilities before submitting | Route preview and acks change to IT/Facilities + Director of Ops; no Privacy Officer row | | | | | API ✓ — route switched; no Privacy Officer row | UI pending |
| V2 | Scenario 2 kept open with a follow-up action | Jordan adds a corrective action ("Replace handrail", IT/Facilities, due in 7 days) | Record is not closed while the action is open (or EA sees the open action when filing — confirm which with Connan) | | | | | API ✓ — action created and completable; **EA can still close with it open (TO CONFIRM)** | UI pending |
| V3 | Scenario 3 reopened with a note | After closing, reopen with reason "Box storage still unsafe" | Same INC number, cycle 2, full cycle-1 history still on the record, back in Jordan's queue | | | | | API ✓ — same ref #, cycle 2, 7 cycle-1 events kept, back in supervisor queue | UI pending |
| V4 | Two acknowledgements required | Use Scenario 2; acknowledge as Casey only, then check Avery's EA queue; then acknowledge as Jamie | EA does **not** see it after one ack; sees it after both | | | | | API ✓ — not in EA queue after 1 ack; in it after both | UI pending |

## Extra checks

| Check | How | Result | Notes |
|---|---|---|---|
| Staff screens at phone width | Browser dev tools 375 × 812 on `/report` and `/my-reports`; buttons ≥ 44px; no sideways scroll | Partial | `/report`: no sideways scroll ✓, main buttons large ✓. ✗ "My reports" link 18px tall. ✗ In dark mode the page turns black and the "Report an incident" heading (dark navy) is nearly invisible — `docs/requests/mathew.md` |
| Review screens at tablet width | 768 × 1024 on `/supervisor`, `/inbox`, `/ea`, `/records/[id]` | | |
| Mock AI end to end | `USE_MOCK_AI=true`, no Gemini key; run Scenario 3 by voice/text through to Closed; every AI block shows "AI-generated — check" | | |
| Dashboard live data | After `npm run seed`, `/dashboard` as Drew (Executive): all 4 planted patterns visible (see below) | | |
| Dashboard mock mode | `NEXT_PUBLIC_DASHBOARD_MOCK=true`; page loads with no backend | | |
| Site click-through | Click "Main Site" bar → `/supervisor?site=Main%20Site` shows only Main Site records | | |
| Briefing click-through | "see N records" → links open `/records/<id>` | | |
| TO CONFIRM tags | Behavioural serious, CID group, JOHSC both chairs, Supervisor Review fields, clocks all show the grey tag | | |
| `npm run lint` / `npm run build` | On `main` after merging everyone | | |

### Planted patterns to see on the dashboard

1. Heatmap: darkest cells are **Friday 1–4pm**; briefing says Main Site verbal aggression doubled in the last 4 weeks.
2. Weekly chart / briefing: **Grow Community Centre slips, trips and falls** jump in the last 3 weeks.
3. Briefing: most privacy incidents are **emails to the wrong recipient**.
4. Stage chart headline: **"Reports wait longest at specialty acknowledgement."**

## Bugs found

File each in `docs/requests/<owner>.md` and tell the team. Log here: date · scenario · owner · one line.

| Date | Scenario | Owner | Bug | Status |
|---|---|---|---|---|
| 7 Nov | Phone width | Mathew | `/report` heading unreadable when the device is in dark mode (black page, navy heading) | Filed |
| 7 Nov | Phone width | Mathew | "My reports" link is an 18px tap target (brief: large tap targets on staff screens) | Filed |
