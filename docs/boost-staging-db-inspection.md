# Staging DB read-only inspection — 2026-10-23

Target: `tarnzjkxexlozqqmyqof` (**prime-boost-staging**). Production `ctxhopadmvasxvjspwoi` was not queried.

## Confirmed via information_schema / pg_proc

- `public.lifting_api_submit`, `lifting_api_daily_award`, and `lifting_api_score_breakdown_list` **do not exist in this staging project**.
- Existing BOOST functions: `lifting_api_boost_inventory_read`, `lifting_api_boost_reserve`, `lifting_api_boost_slot_spin`, `lifting_api_boost_start_none`, `lifting_api_boost_verified_receipt`.
- `lifting_players` currently exposes **only `id uuid`**. There is no `best` column, no name, and no production-compatible player model.
- `lifting_boost_verified_receipts` exists with integer `base_score`, `boost_bonus`, `play_score` (not the draft's bigint). Do not blindly reapply the draft table DDL.

## Integration impact

The earlier `docs/sql/prime-boost-ranking-read-rpc-draft.sql` references `lifting_players.best` and therefore **cannot run on this staging DB as written**. Existing submit SQL cannot be inspected here because it has not been copied into staging. Do not interpret this as evidence about production's actual function or table definition.

## Safe next step

Create an isolated staging-only **shadow leaderboard schema** or obtain a reviewed export of production SQL (without user data or secrets) before attempting end-to-end atomic submit integration. Do not change production, and do not modify staging DB until the schema strategy is reviewed. Keep BOOST disabled and ranking projection disconnected.
