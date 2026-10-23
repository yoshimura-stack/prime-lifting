# BOOST integration contract — staging design only

## Confirmed Worker behavior
`server/worker.mjs` handles `POST /api/scores`: signed session/run checks, replay, `submit`, `achievement_merge`, conditional `next_achievement_merge`, conditional `daily_award`, then response. Each `db.call` is a separate RPC; later failure does **not** roll back an earlier successful submit. The existing retry keeps the same run ID. Daily awards are conditional on existing flags, not always active.

## Integration boundary
1. **Do not call shadow.submit_verified from the public Worker**: it accepts caller-supplied numeric scores, is a test double, and has no existing production submit side effects.
2. **Do not append a separate BOOST best-run write after submit**. This can leave a stale pointer when a later normal play overtakes it, or when a subsequent RPC fails.
3. The eventual trusted submit DB transaction must receive server-replayed score, boost type, base/bonus, signed run ID and player ID; verify receipt/reservation and idempotency; persist run + receipt; update best score + pointer under the same player-row lock. A normal run must clear the pointer on a higher best. A tie preserves it.
4. On retry after a later achievement/daily failure, `submit` must return a stable saved outcome and `achievement_merge`/`daily_award` must be independently idempotent. A `replayed=true` flag **must not suppress** unfinished downstream RPCs.
5. Keep existing achievements, NEXT LEVEL and daily ordering and eligibility unchanged. TIME and SC need server replay rule parity; SC remains blocked until defined.
6. For leaderboard, show total play score as total, with a separately labelled **included** SCORE BOOST bonus. Do not add the bonus a second time to total. Only server-verified best-run receipts can populate the bonus. Legacy rows stay unchanged.

## Blocking prerequisites
- Staging DB currently lacks `public.lifting_api_submit` and a production-compatible `lifting_players.best` model; do **not** apply the earlier read-RPC draft against that schema.
- Obtain and review actual `lifting_api_submit` SQL and related run/score tables from a safe, authorized source **without modifying production**.
- Build an isolated integration harness covering: successful run, failure after submit, replay retry, daily duplicate protection, achievement idempotency, normal higher best invalidation, ties, concurrent writes and rejected forged scores.
- Verify a deterministic two-session lock-wait test. Prior connector-based parallel tests showed correct outcomes but did not prove lock overlap.
- No production deploy, `main` merge, or production Supabase writes during the tournament.
