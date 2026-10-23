# Existing RPC compatibility and idempotency review — staging only

## Verified source facts
- `server/db-contract.mjs` maps `submit`, `achievement_merge`, `next_achievement_merge`, and `daily_award` to separate `lifting_api_*` RPC calls with a `{payload:input}` wrapper. It does not implement SQL idempotency itself.
- `server/supabase.mjs` sends each RPC as its own HTTPS POST with an 8-second timeout. A timeout does **not** establish whether the server committed. The Worker must retry the **same run ID**.
- `server/worker.mjs` orders the calls as submit → achievement → conditional NEXT LEVEL → conditional daily. It throws 503 if a downstream RPC cannot confirm success, without reversing a prior successful submit.
- `boost_shadow_test.submit_verified` models only best score, run, BOOST type and bonus. It **does not model achievements or daily credits**, and therefore cannot prove reward idempotency.
- `server/boost-retry-harness.mjs` and its tests use in-memory Sets/Maps as *assumed* idempotent RPC dependencies. These are useful behavioral tests, **not evidence** that the real DB has uniqueness constraints.

## Missing verification (blocking production integration)
1. Obtain actual SQL definitions and constraints for `lifting_api_submit`, `lifting_api_daily_award`, `lifting_api_achievement_merge`, `lifting_api_next_achievement_merge` from a reviewed source; staging currently lacks the production-compatible submit RPC. Do not query/change the tournament production database.
2. Verify unique per-player/run award behavior, per-day 300-point cap, month rollover, and whether achievement merges are monotonic under retries/concurrency.
3. Test the ambiguous-commit case: RPC commits but client receives timeout; retry same run ID must not double-award.
4. Integrate BOOST receipt and best-run provenance inside a transaction that is shared with **all normal and BOOST score submissions**; do not bolt it onto a separate post-submit RPC.
5. Validate ranking score breakdown does not add included BOOST bonus twice and does not attribute legacy scores.

## Safe staging strategy
- Keep current Worker and `db-contract.mjs` unchanged.
- Add an isolated reward-ledger test double with explicit `(player,day,challenge)` uniqueness and `(player,run)` replay dedupe, without touching existing `public` tables.
- Exercise simulated timeout-after-commit, retries, day/month boundary and concurrent award attempts. Clearly label tests as shadow-only.
- Require actual DB SQL review and staging parity tests before changing live submit or activating BOOST.

No production database writes, production deployment, or main-branch changes.
