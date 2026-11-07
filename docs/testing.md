# Integration testing — Langs scenarios

Owner: Ananya. Run **in the UI by switching roles** at each team checkpoint. Record the date, commit and result in a new column block below.

Success check (what judges look for), applied to every row:
**O** = current owner / stage is shown · **A** = completed acknowledgements are shown · **E** = EA final receipt is shown · **S** = open / closed / reopened status is shown

## Scenarios

| # | Scenario (Langs sheet) | Steps (role → action) | Expected route | O | A | E | S | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Privacy: fictional program schedule emailed to the wrong external address; supervisor told; recall attempted | Riley (Staff) submits with q18 = Yes, q19 = Privacy/Confidentiality, q31 = Supervisory Support → Jordan (Supervisor) opens, confirms Privacy, submits review → Sam (Privacy Officer) acknowledges → Avery (EA) confirms receipt and files | Supervisor → Privacy Officer ✓ → EA → Closed | | | | | | |
| 2 | Facilities near miss: loose handrail, visitor nearly trips, no injury, area blocked | Riley submits with q9 = Visitor, q18 = Yes, q19 = Property Damage → Jordan reviews, confirms Facilities → Casey (IT/Facilities) acknowledges → Jamie (Director of Ops) acknowledges → Avery files | Supervisor → IT/Facilities ✓ + Director of Ops ✓ → EA → Closed | | | | | | |
| 3 | Staff injury: minor hand injury moving a sealed supply box; first aid | Riley submits with q9 = Staff/Volunteer, q14 = Yes, q15 = Impact, q31 = First Aid → Jordan reviews, confirms Staff injury → Alex or Taylor (JOHSC Chair) acknowledges → Avery files | Supervisor → JOHSC Chair ✓ → EA → Closed | | | | | | |
| V1 | Scenario 1 changed to Facilities | In Jordan's review, untick Privacy and tick Facilities before submitting | Route preview and acks change to IT/Facilities + Director of Ops; no Privacy Officer row | | | | | | |
| V2 | Scenario 2 kept open with a follow-up action | Jordan adds a corrective action ("Replace handrail", IT/Facilities, due in 7 days) | Record is not closed while the action is open (or EA sees the open action when filing — confirm which with Connan) | | | | | | |
| V3 | Scenario 3 reopened with a note | After closing, reopen with reason "Box storage still unsafe" | Same INC number, cycle 2, full cycle-1 history still on the record, back in Jordan's queue | | | | | | |
| V4 | Two acknowledgements required | Use Scenario 2; acknowledge as Casey only, then check Avery's EA queue; then acknowledge as Jamie | EA does **not** see it after one ack; sees it after both | | | | | | |

## Extra checks

| Check | How | Result | Notes |
|---|---|---|---|
| Staff screens at phone width | Browser dev tools 375 × 812 on `/report` and `/my-reports`; buttons ≥ 44px; no sideways scroll | | |
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
| | | | | |
