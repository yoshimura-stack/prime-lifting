# BOOST verified submit integration audit — STAGING ONLY

## Existing Worker flow (inspected on feature/prime-boost-staging)

1. `POST /api/scores`: verify session and replay the run; compute `finalScore` (PC/mobile baseline ×1.0).
2. `db.call('submit', ...)`: existing leaderboard personal-best update, score breakdown and run idempotency are delegated to `lifting_api_submit`.
3. `achievement_merge` persists base titles; if master, `next_achievement_merge` persists NEXT LEVEL titles.
4. `daily_award` persists qualified daily challenges, using the same run ID and JST day.
5. Return public player, personalBest/newChampion, achievements, and daily result.

## Critical consistency boundary

These are **multiple separate RPC calls**. The existing Worker may return an error after submit succeeded if an achievement or daily RPC fails; a retry must therefore be idempotent across all components. BOOST best-run pointer must be updated **inside the same database transaction as the verified submit**, not in a later Worker call. Do not claim all achievements/daily credits share that transaction; they currently do not.

## Integration requirements (before enabling BOOST)

- Inspect the **actual staging DB definition** of `lifting_api_submit`, its score/run tables, personal-best tie behavior, daily credit and achievements. Do not assume its SQL or modify it without a reviewed migration.
- Verify a signed BOOST run and replay on the server; SCORE bonus is +0.1 on both devices, TIME adds 5 seconds, SC replay rules remain pending.
- On first accepted run, persist verified receipt and personal-best pointer atomically with `lifting_players.best`; on replay, return the same outcome without changing best or duplicating rewards.
- If an unboosted play overtakes a BOOST personal best, clear the pointer in that same transaction; on ties preserve the existing winning run. A **BOOST-only alternate submit path** is insufficient unless every normal submit also participates in pointer invalidation.
- Keep `achievement_merge`, `next_achievement_merge`, and `daily_award` idempotent and preserve their existing Worker ordering. Never award daily credits twice on retries.
- A rollback must restore the original score, receipt, pointer, and existing submit side effects. Simulate two concurrent higher-score submissions and equal-score runs before enabling.
- Keep private best-run and receipt lookup server-only; no `runId`, player UUID, service key, or receipt exposed through the public leaderboard.

## Release gate

Do not wire BOOST into `server/worker.mjs`, change existing `lifting_api_submit`, execute SQL on any DB, merge staging, or deploy production until the staging DB submit function is inspected and a full isolated end-to-end test passes.
