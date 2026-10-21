# BOOST staging database execution log

Environment: isolated Supabase project `prime-boost-staging` (Tokyo, Free). Production unchanged.

## Applied to staging
- Minimal test-only `lifting_players(id uuid primary key)` parent table.
- `docs/sql/prime-boost-preview-schema.sql` (three BOOST tables).
- `docs/sql/prime-boost-preview-reserve.sql` (reservation RPC).
- `docs/sql/prime-boost-preview-slot.sql` (daily slot RPC).

## Observed test results (2026-10-20)
- SQL transaction test: repeated reservation for the same run ID leaves **one** run-use record and stock decreases from 2 to 1.
- SQL transaction test: repeated daily slot spin leaves **one** spin record and exactly **one** inventory item awarded.
- SQL transaction test: when all types have stock 2/2, the spin is skipped; after one item is consumed, the spin can award that type.
- SQL transactions used ROLLBACK; test-player rows were not retained.
- Verified BOOST tables do not grant privileges to `anon` or `authenticated`; `service_role` grants exist.

- Verified RPC EXECUTE privileges: anon=false, authenticated=false, service_role=true for both functions.
- Verified cross-player reuse of an existing run ID is rejected, while the original use record and stock remain consistent.

- Automated SQL assertions passed for full-stock skip -> two distinct time BOOST spends -> same-day spin awarded one time BOOST. The transaction was rolled back.

- Reusable SQL regression file `docs/sql/prime-boost-staging-regression.sql` executed successfully: PASS for full-stock skip, same-run idempotency, cross-player and cross-type conflict rejection, post-spend same-day slot, slot retry. It rolls back all test data.

- Two reservation SQL requests were issued in parallel using separate connector calls for the **same run ID**. Responses were `replayed:false` and `replayed:true`; inventory changed 2→1, one use record. Test rows subsequently deleted. Connector concurrency does not establish overlapping PostgreSQL transaction execution; stronger lock-contention testing is pending.
- `npm test` now includes `tests/boost-preview-service.test.mjs`; execution outcome has not yet been verified.

- Eight parallel slot RPC requests for one player/JST day returned without connector errors. Final DB state was exactly one slot-spin row and one BOOST item. Test records were deleted. DB-level overlapping transactions not established.

## Important limitations
- Sequential transactional checks and one parallel-request smoke test have run. Proven overlapping DB transactions and high-load race tests remain pending.
- This is a standalone preview database, not the live game database. Its minimal `lifting_players` table is for DB testing only.
- No Worker RPC wiring, production inventory, ranking acceptance, or main merge.
- GitHub Actions and browser integration tests not yet confirmed.

## Next gates
1. Test two simultaneous database connections for spin and reserve.
2. Test error rollback and cross-player run-ID conflicts.
3. Confirm function EXECUTE privileges for `anon`, `authenticated`, `service_role`.
4. Only then integrate preview Worker endpoints behind server feature OFF.

## 2026-10-21: Eight BOOST uses in one JST day

Executed `docs/sql/prime-boost-staging-eight-uses.sql` against **isolated staging project** `tarnzjkxexlozqqmyqof`. The transaction created a disposable player, reserved eight distinct `time` BOOST run IDs, and replenished stock to two between each reservation **inside the test only**. Every reservation returned `replayed:false` and `remaining:1`; eight usage records existed before rollback. Final result: `PASS: 8 same-day BOOST reservations; all changes rolled back`. This verifies that the reservation RPC has no one-day usage ceiling, **not** that a real stock replenishment feature exists or that eight BOOSTs are automatically awarded in one day. Production untouched.

## 2026-10-21 weighted-miss migration
- Isolated staging project `tarnzjkxexlozqqmyqof` only: applied `boost_slot_miss_check_staging` and `boost_slot_weighted_miss_staging` migrations successfully.
- Read-only inspection confirmed installed RPC includes `v_weight_total:=40+20*cardinality(v_eligible)` and test player/spin counts both zero.
- Transactional runtime test for weighted miss, same-day replay, and stock was blocked by connector safety; **not yet passed**. Production DB unchanged.
