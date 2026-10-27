# PRIME BOOST — production rollout and rollback (review only, 2026-10-27)

**No production deployment or database migration is authorized by this document.** PR #141 stays unmerged until explicitly approved. Do not reset BEST, achievements, rankings, daily awards, or existing accounts. No test-account isolation system is needed.

## Prerequisites
- Confirm CI on the exact commit to be deployed and complete actual browser checks (PC and mobile).
- Obtain a fresh **read-only** copy of `pg_get_functiondef('public.lifting_api_submit(jsonb)'::regprocedure)` and compare it with `sql/prime-boost-submit-proposal-20261027.sql`. The draft was compared with the production function on 2026-10-27; do not assume it is unchanged later.
- Verify current Cloudflare environment and deployment workflow; record prior Worker release and environment variable values for rollback.
- Take a restorable database backup / confirm point-in-time recovery before any production DDL. Preserve the original score function definition in a private operational record.
- Confirm RLS and `EXECUTE` grants: new security-definer RPCs should be callable by `service_role` only. Validate no public/anon/authenticated EXECUTE, including inherited PUBLIC privileges.

## Order (only after explicit approval)
1. Deploy and verify `sql/prime-boost-login-inventory-proposal-20261027.sql`: inventory table, login grant and inventory read RPCs.
2. Deploy and verify `sql/prime-boost-reservation-proposal-20261027.sql`: reservation table and atomic reserve RPC.
3. Apply **reviewed and live-function-matched** `sql/prime-boost-submit-proposal-20261027.sql`. Existing normal-score path must remain unchanged; signed SCORE BOOST uses server-verified replay and matching reservation, not client input.
4. Deploy approved application commit with **both flags OFF**: `PRIME_BOOST_ENABLED` and `PRIME_BOOST_SCORE_PERSISTENCE_READY`. Smoke test login, normal 60s run, saving, ranking, daily, and titles.
5. Enable `PRIME_BOOST_ENABLED=true` while keeping `PRIME_BOOST_SCORE_PERSISTENCE_READY=false`; verify grant is idempotent on same JST date, first login grants one of each, next eligible day grants one random type, per-type cap two, and inventory endpoint advertises `selectionEnabled:false`. **Do not start BOOST runs yet.**
6. Enable `PRIME_BOOST_SCORE_PERSISTENCE_READY=true` only after score RPC compatibility and end-to-end verification. Test blue 65s, yellow 1.1 on PC/mobile, green protected first drop / first touch / second touch, signed reservation and score persistence, one BOOST per run, and normal unboosted play.
7. Verify existing BEST, all-time ranking, FIRST/NEXT titles, daily points, and existing users are unaffected. Do not delete test scores or player rows automatically.

## Rollback
1. **First disable new BOOST issuance and UI** by setting `PRIME_BOOST_SCORE_PERSISTENCE_READY=false` (stops new boosted starts and hides picker). Keep `PRIME_BOOST_ENABLED=true` temporarily if any already-issued boosted runs may still be saving: `/api/scores` verifies this flag.
2. Allow already-issued boosted runs to finish/save where feasible. Track failures; do not delete their reservations or inventory, and do not roll back the score RPC while outstanding boosted runs remain. Issued run tickets may be valid up to 24h.
3. Once boosted saves have settled, set `PRIME_BOOST_ENABLED=false` and revert the Worker release if necessary. Verify ordinary login, gameplay and scoring.
4. **Only if required and safe**, restore the saved original `lifting_api_submit` definition after no boosted saves remain. Keep BOOST tables/data in place for audit and potential recovery. Never DROP tables or reset BEST/rankings as an emergency rollback.
5. Verify normal play saves, daily awards, achievements and leaderboard; investigate failed boosted saves before any manual adjustment.

## Explicit go/no-go gates
- CI passing is necessary but not sufficient: database functions have **not** been integration-tested against production.
- Do not turn either flag on merely because the SQL files exist.
- Do not merge PR #140 (divergent staging work) wholesale; PR #141 is the focused integration.
- Avoid changes to scoring physics, mobile controls, combo rules, or existing score calculation outside the approved BOOST cases.
