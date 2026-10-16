# DAILY CHALLENGE + PRIME COIN — implementation contract

## Launch order
- October 2026: daily challenges, +100 ranking points per newly completed daily task, and PRIME COIN earn.
- November 1, 2026 at 00:00 JST: monthly reset of play-best and daily-bonus *ranking calculation*; historical data, unlocked titles and coin wallet remain.
- Never retroactively credit days before the actual daily launch.

## Ranking
October total = existing all-time play best + October daily completion count × 100.
November onward total = monthly play best + that month's daily completion count × 100.
Sort the *server-returned leaderboard* by total, not just change client labels. Show PLAY BEST, DAILY BONUS, TOTAL, and completed count. Preserve all-time best separately.

## Integrity and idempotency
- All completion decisions use server-replayed and validated actions, never client-submitted flags or score.
- Use the server's JST date at accepted submission; bind mission IDs to that date.
- Store a unique completed mission per (player_id, JST date, mission_id). Credit 100 ranking points exactly once, even for repeated/retried submissions.
- Coin award per accepted run = min(floor(verified_play_score/1000)×10, 2000 - coins_earned_that_JST_day). Cap applies only to *earned* coins, not wallet balance. Never use ranking bonus as coin-earning score.
- Identify a run by a server-validated stable submission identifier, with a unique constraint, to avoid paying the same replay twice.
- Perform run receipt, daily completions, and wallet credit in a single database transaction / privileged RPC. Concurrent submissions must serialize daily cap and wallet changes with a row lock or equivalent.
- Protect RPCs with the existing authenticated player identity; do not accept arbitrary player_id from public clients.
- Record append-only wallet ledger, purchases as debits, and keep historical balance auditability.
- Failure must not silently claim a completion/coin reward; show retry-safe status.
- Do not alter existing scores, base titles, NEXT LEVEL titles, or WORLD ARENA unlock.

## UI
- PC: show TODAY'S CHALLENGE below TIME, aligned with the existing title-results panel.
- Three missions: EASY / NORMAL / HARD, each 100 PT, progress and complete status, JST reset indicator.
- Mobile: never overlay game controls, HUD or Safari browser chrome; maintain playable viewport.
- Show +100 on completion, wallet gain separately, and score breakdown in ranking.

## Deployment gates
1. Ship and test the read-only mission API.
2. Review exact existing Supabase schema and permissions; add migrations only after schema verification and backup.
3. Implement atomic RPC + tests for retries, parallel submits, date boundaries, and max daily cap.
4. Add UI and verify desktop + Safari + Chrome real devices.
5. Enable October daily scoring only after full end-to-end verification.
6. Prepare November monthly season with preserved archives and verified JST boundary.

No coins or daily completion are awarded by phase-1 code alone.
