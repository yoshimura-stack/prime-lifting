# BOOST SQL verification environment check — 2026-10-27

## Result: blocked safely, no SQL applied

Read-only inspection of the existing staging Supabase project `tarnzjkxexlozqqmyqof` showed that it is a **different, older BOOST experimental schema**, not a copy of the production PRIME LIFTING database.

| Required by current proposed SQL | Existing staging state |
|---|---|
| `public.lifting_players` | Exists, but only `id` column |
| `public.lifting_runs` | Missing |
| `public.lifting_api_submit(jsonb)` | Missing |
| `public.lifting_boost_inventory` | Exists with `player_id,time_count,score_count,sc_count,updated_at` only |
| `public.lifting_boost_reservations` | Missing |
| `public.lifting_api_boost_reserve` | Exists, from a different experiment |

Other existing staging objects include `lifting_boost_run_uses`, `lifting_boost_verified_receipts`, `lifting_boost_slot_spins` and their RPCs.

## Why the proposals cannot be applied as-is

1. The inventory proposal uses `CREATE TABLE IF NOT EXISTS`, which **does not add** the required `last_grant_day` and `created_at` columns to the existing staging inventory table. The new grant RPC would fail.
2. The proposed submit RPC declares `public.lifting_runs%rowtype` and uses `lifting_score_breakdowns`, which are missing from this staging database.
3. The existing staging `lifting_api_boost_reserve` belongs to a different implementation. Overwriting it would interfere with the older experiment and would not validate the current production integration.

## Safe next step

Use an isolated verification database with the **actual production schema structure but no production player data**, then apply in order:
1. `sql/prime-boost-login-inventory-proposal-20261027.sql`
2. `sql/prime-boost-reservation-proposal-20261027.sql`
3. `sql/prime-boost-submit-proposal-20261027.sql`

Validate first grant, same-day idempotency, next-JST-day grant, cap 2, concurrent reservation, replay submission for time/score/sc, duplicate run ID, RLS and function EXECUTE grants. **Do not copy player records or change production.**

This document records an observed environment mismatch; it does not authorize or perform any schema changes.
