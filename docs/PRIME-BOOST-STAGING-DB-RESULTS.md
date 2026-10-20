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

## Important limitations
- These are **sequential calls inside SQL transactions**, not two concurrent connections. Race-condition tests remain pending.
- This is a standalone preview database, not the live game database. Its minimal `lifting_players` table is for DB testing only.
- No Worker RPC wiring, production inventory, ranking acceptance, or main merge.
- GitHub Actions and browser integration tests not yet confirmed.

## Next gates
1. Test two simultaneous database connections for spin and reserve.
2. Test error rollback and cross-player run-ID conflicts.
3. Confirm function EXECUTE privileges for `anon`, `authenticated`, `service_role`.
4. Only then integrate preview Worker endpoints behind server feature OFF.
