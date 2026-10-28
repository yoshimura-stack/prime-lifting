# PRIME BOOST staging acceptance checklist (2026-10-28)

**Staging only:** Supabase project `tarnzjkxexlozqqmyqof`. Production project `ctxhopadmvasxvjspwoi` must remain untouched. These are **planned tests, not completed tests**.

## Setup
- Confirm a staging Worker deployment connected only to staging DB. No staging Worker deployment is yet verified.
- Record test account BEST, run count, daily points and BOOST inventory before each case.
- Confirm service-role-only RPC access; never turn production BOOST flags ON to test.
- If tool safety checks block SQL, use an authorized review/testing path; do not circumvent them.

## Required staging integration cases
1. First login in a JST day: inventory time=1, score=1, sc=1; no roulette/random grant.
2. Repeated login and picker reads on the same day: remaining inventory unchanged.
3. Blue: 65-second run saves; time decreases to 0; second distinct blue run rejected.
4. Yellow: PC and mobile both use exactly round(base × 1.1); never ×1.2; second distinct yellow run rejected.
5. Green: first drop preserves combo; subsequent drop normal; score unmultiplied; second distinct green run rejected.
6. One run cannot reserve multiple colors. Same run ID/type reservation retry does not consume twice.
7. Score-save retry with the same signed run ID creates one run and does not rewrite BEST twice.
8. Next JST day: each color refreshes to 1; same-day depletion never refills.
9. Two concurrent same-color starts: at most one succeeds for the same player and JST day.
10. Wrong player/run ID/BOOST type rejected without modifying BEST.
11. Disable readiness after a run starts: new BOOST starts blocked; in-flight blue/yellow/green run saves.
12. Both BOOST flags OFF: normal 60-second play, ranking, achievements and daily awards remain available.

## Evidence and release gate
For each case, record JST time, staging account, sanitized HTTP response, before/after inventory, run count, BEST and score breakdown. Mark blocked checks **NOT VERIFIED**; mocked Worker tests do not prove Supabase transaction correctness.

Before production rollout: all staging cases pass, PC/mobile browser smoke tests pass, CI passes on exact commit, current production submit RPC is re-reviewed against replacement, a credible recovery plan is recorded, and the blocked production DAILY BOOST migration plus score-submit migration have an authorized application path. Never bypass safety checks. PR #141 stays unmerged and both production BOOST flags stay OFF until then. Existing historical BEST, rankings, legacy mobile score compensation, achievements and daily points must not be rewritten.
