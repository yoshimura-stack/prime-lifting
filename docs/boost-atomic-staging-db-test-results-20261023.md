# Staging atomic ranked-submit execution (2026-10-23)

## Installed only on isolated staging Supabase
- Project: `tarnzjkxexlozqqmyqof`.
- SQL: `docs/sql/staging-boost-atomic-ranked-submit-shadow.sql`.
- RPC: `public.lifting_api_submit_boost_atomic(jsonb)`, granted **service_role only**, explicitly revoked from `PUBLIC`, `anon`, `authenticated`.
- One PostgreSQL transaction validates an existing authenticated server-created normal/BOOST reservation, updates `boost_shadow_test` ranking and inserts the verified receipt. A failure rolls back both.
- The RPC is **shadow-backed and staging-only**. It does not update the production-compatible player, achievement, or daily challenge tables; it must not be deployed to production.

## Actual SQL transaction tests (all rolled back)
1. NONE: official start -> 60,000 point atomic ranked submit -> exact retry. One receipt and one shadow run.
2. SCORE: inventory=2 -> reservation decrements to 1 -> verified 50,000 base + 5,000 bonus = 55,000 ranked best -> exact retry. One receipt, one shadow run, one inventory decrement.
3. Forged SCORE without a reservation: rejected; zero receipts and zero ranked runs.
4. First 60,000 point normal submit returned `{personalBest:true,replayed:false,playScore:60000}`.
5. `anon` EXECUTE denied, `service_role` EXECUTE allowed.

## Additional verified DB cases
- TIME: reserved + verified 10,000 point run; SC: reserved + verified 20,000 point run; both in one rollback transaction. Two receipts, shadow best 20,000. No separate BOOST points added.

## Still required
- Verify replay conflicts and concurrency under independent connections.
- Build production-compatible score/daily/achievement storage and leaderboard.
- Wire Worker authenticated routes, browser inventory/slot/BOOST run UI, deploy **staging only**, test on PC/iPhone.
- Keep main, production DB, and production Worker unchanged until release approval.
