# PRIME BOOST — production rollout and rollback (review only, 2026-10-27)

**Status (2026-10-28):** User approved proceeding with BOOST while preserving all existing scores. Production migrations for inventory and reservations have already succeeded; the daily-reset migration was blocked and is NOT applied. PR #141 remains unmerged, and both BOOST flags are explicitly false on the feature branch. Do not reapply the first two migrations unnecessarily. Do not reset BEST, achievements, rankings, daily awards, or existing accounts. No test-account isolation system is needed.

## Staging evidence and remaining verification (2026-10-28)

- Read-only inspection of staging project `tarnzjkxexlozqqmyqof` confirmed 1 test player, 0 runs, 0 BOOST inventory rows, and 0 reservations.
- Staging defines `lifting_boost_daily_refresh`. Its login-grant, inventory, and reserve functions reference daily refresh; login-grant does not reference `random()`.
- Staging `lifting_api_submit` references BOOST reservations and the 1.1 factor. All four inspected API functions deny direct `anon` and `authenticated` EXECUTE.
- These are **schema/code-presence checks, not end-to-end gameplay results**. No live BOOST stock consumption, JST midnight reset, signed replay submission, or PC/mobile score persistence has been proven by this inspection.
- GitHub CI passed for the three rollback-drain tests: yellow SCORE, blue TIME (65-second boundary), and green SECOND CHANCE. They use mocked database calls, so passing does not establish Supabase transaction correctness.
- Production remains different: daily refresh was not applied there, and the legacy login-grant function still contains random reward logic. Keep both production feature flags OFF.
- Additional staging DB inspection was blocked by tool safety checks. Do not bypass those checks; use an authorized review/testing route.

## Prerequisites
- Confirm CI on the exact commit to be deployed and complete actual browser checks (PC and mobile).
- Obtain a fresh **read-only** copy of `pg_get_functiondef('public.lifting_api_submit(jsonb)'::regprocedure)` and compare it with `sql/prime-boost-submit-proposal-20261027.sql`. The draft was compared with the production function on 2026-10-27; do not assume it is unchanged later.
- Verify current Cloudflare environment and deployment workflow; record prior Worker release and environment variable values for rollback.
- Production is on the Free plan without automatic backups. A screenshot of the top-three leaderboard is NOT a restorable backup. Preserve the original score function definition and verify a data recovery plan before replacing the production score-save function. Do not claim zero risk.
- Confirm RLS and `EXECUTE` grants: new security-definer RPCs should be callable by `service_role` only. Validate no public/anon/authenticated EXECUTE, including inherited PUBLIC privileges.

## Order (only after explicit approval)
1. **DONE 2026-10-28:** `sql/prime-boost-login-inventory-proposal-20261027.sql` applied to production. Inventory table and legacy random login-grant RPC exist, but are disabled in the Worker. The applied migration file is retained as an audit record and must NOT be rerun to restore the obsolete random logic.
2. **DONE 2026-10-28:** `sql/prime-boost-reservation-proposal-20261027.sql` applied to production. Reservation table exists, empty at verification.
3. **PENDING — safety check blocked:** Apply `sql/prime-boost-daily-one-per-type-20261028.sql` AFTER the first two migrations. It must replace the legacy random login grant with one use of each BOOST type per JST day, refreshing even for an already logged-in player. Its production migration attempt was blocked by the tool safety check; do not circumvent that check. Verify inventory and RPC semantics before enabling BOOST.
4. **PENDING:** Apply **reviewed and live-function-matched** `sql/prime-boost-submit-proposal-20261027.sql`. Existing normal-score path must remain unchanged; signed SCORE BOOST uses server-verified replay and matching reservation, not client input.
5. Deploy approved application commit with **both flags OFF**: `PRIME_BOOST_ENABLED` and `PRIME_BOOST_SCORE_PERSISTENCE_READY`. Smoke test login, normal 60s run, saving, ranking, daily, and titles.
6. Keep `PRIME_BOOST_ENABLED=false` and `PRIME_BOOST_SCORE_PERSISTENCE_READY=false` while validating the daily-reset and submit RPCs in an isolated staging environment. The Worker intentionally returns HTTP 403 from `/api/boost/inventory` and does not grant stock at login if either flag is false; never use partial activation to test inventory. Verify one use of each type per JST calendar day, midnight refresh, and no random grant or accumulation with controlled staging accounts. **Do not start production BOOST runs yet.**
7. After DB compatibility and end-to-end verification, activate **both** flags together in a controlled release. Test blue 65s, yellow 1.1 on PC/mobile, green protected first drop / first touch / second touch, signed reservation and score persistence, one BOOST per run, and normal unboosted play.
8. Verify existing BEST, all-time ranking, FIRST/NEXT titles, daily points, and existing users are unaffected. Do not delete test scores or player rows automatically.

## Rollback
1. **First disable new BOOST issuance and UI** by setting `PRIME_BOOST_SCORE_PERSISTENCE_READY=false` (stops new boosted starts and inventory reads). Keep `PRIME_BOOST_ENABLED=true` temporarily if any already-issued boosted runs may still be saving: `/api/scores` verifies this flag.
2. Allow already-issued boosted runs to finish/save where feasible. Track failures; do not delete their reservations or inventory, and do not roll back the score RPC while outstanding boosted runs remain. Issued run tickets may be valid up to 24h.
3. Once boosted saves have settled, set `PRIME_BOOST_ENABLED=false` and revert the Worker release if necessary. Verify ordinary login, gameplay and scoring.
4. **Only if required and safe**, restore the saved original `lifting_api_submit` definition after no boosted saves remain. Keep BOOST tables/data in place for audit and potential recovery. Never DROP tables or reset BEST/rankings as an emergency rollback.
5. Verify normal play saves, daily awards, achievements and leaderboard; investigate failed boosted saves before any manual adjustment.

## Explicit go/no-go gates
- CI passing is necessary but not sufficient: database functions have **not** been integration-tested against production.
- Do not turn either flag on merely because the SQL files exist.
- Do not merge PR #140 (divergent staging work) wholesale; PR #141 is the focused integration.
- Avoid changes to scoring physics, mobile controls, combo rules, or existing score calculation outside the approved BOOST cases.
