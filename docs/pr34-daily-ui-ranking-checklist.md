# PR #34: daily UI and ranking rollout checklist

This phase must not change the current public ranking until daily awards are persisted and verified.

1. Add a read-only daily mission panel using the existing GET /api/daily response (three JST-stable missions). Use safe text nodes, not HTML interpolation.
2. Show progress only when the server provides authoritative completion status; otherwise show goals and a clear 'not yet enabled' state. Never display a client-only success as credited.
3. Add a batch read-only RPC returning daily completion counts for leaderboard players, scoped to JST month. Do not issue one query per player.
4. For October, rank by all-time best + 100 * October completions; from November, use monthly best + 100 * same-month completions. The existing all-time leaderboard RPC is not sufficient to discover monthly top players; implement a DB-side month-specific ranking query.
5. Verify that all title masks, WORLD ARENA unlock, player IDs, and existing best scores remain untouched.
6. Do not enable DAILY_REWARDS_ENABLED until migration + award RPC + server verification + regression tests pass.
7. Never run REVIEW_ONLY SQL on production before validating its schema, role permissions, mission-day consistency, and replay integrity.

Current known blocker: the daily award RPC trusts the Worker-supplied mission IDs, so the Worker must derive IDs from server-verified replay and bind them to the same JST day as the persisted run. Confirm this before production rollout.
