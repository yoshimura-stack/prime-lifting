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

## Staging Worker deployment handoff (not executed)

The CI job for commit `85592fb` completed its `npm run check:staging` dry-run successfully. This confirms configuration/build compatibility only; no deployed staging URL has been verified.

On an authorized development machine with Node 22, Wrangler access and **staging-only** Supabase credentials:
1. Check out the reviewed feature branch and run `npm ci`, `npm test`, and `npm run check:staging`.
2. Verify `wrangler.staging.jsonc` has Worker name `prime-lifting-boost-staging` and `SUPABASE_URL=https://tarnzjkxexlozqqmyqof.supabase.co`. Do not reuse production Supabase credentials.
3. Configure the required staging secrets for that **named staging Worker**, using approved Cloudflare secret management. Do not put keys in GitHub, logs, screenshots or this document.
4. Deploy only with an explicit staging config: `npm run build && npx wrangler deploy --config wrangler.staging.jsonc`. Never use the default `npm run deploy` for staging.
5. Record the actual staging URL and deployment version, then confirm the login and inventory APIs are connected to staging. If either cannot be verified, stop; do not run BOOST gameplay tests.
6. Keep the production Worker and its two BOOST flags unchanged throughout staging verification.

**Operational note:** A successful dry-run does not create Cloudflare resources, configure secrets, or demonstrate that a staging Worker exists. Do not report deployment complete until the URL and live staging DB behavior have been observed.
