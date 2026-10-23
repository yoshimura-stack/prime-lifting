# 2026-10-23 staging BOOST integration checkpoint

## Changes completed in this batch
- Verified previous commit `0afc9595`: 3/3 CI successful.
- Ranking now displays soccer-ball BOOST labels `⚽ +5 SEC`, `⚽ ×1.1`, `⚽ SC`, with blue/yellow/green tinted CSS; no separate BOOST points row.
- Installed **private shadow-only** `boost_shadow_test.best_run_lookup` and `boost_shadow_test.verified_receipt_list` on staging Supabase project `tarnzjkxexlozqqmyqof`. These are not public REST RPCs and are not connected to the deployed Worker.
- SQL persisted at `docs/sql/prime-boost-shadow-private-ranking-reads.sql`.
- Live staging DB transaction checks passed: verified SCORE 50,000 + 5,000 attributed to best run 55,000; higher normal run 60,000 cleared pointer and returned no BOOST receipt; `anon` and `authenticated` lack execute privileges.
- All synthetic test rows rolled back; verified 0 test players and 0 test runs remain.
- Added UI regression test `tests/boost-soccer-icon-labels.test.mjs`.

## Unfinished release blockers
- Current staging `public.lifting_players` has only an ID column. There is no production-compatible `lifting_api_submit`, `lifting_runs`, daily/achievement system, or atomic BOOST ranked submit RPC. The private shadow transaction is a useful verification harness, **not a release-ready replacement**.
- Actual authenticated Worker endpoints and browser run/slot selection are still disabled. No deployed preview end-to-end testing has been performed.
- Do not merge staging into main or deploy to production without explicit approval.

## Next critical path
1. Build a production-compatible isolated staging score schema and one atomic verified submit RPC, preserving normal-run best attribution, achievements, daily points, and replay idempotency.
2. Implement authenticated staging-only Worker routes and wire browser flow, then perform deployed staging tests.
3. Confirm CI and user PC/iPhone testing; request release approval.
