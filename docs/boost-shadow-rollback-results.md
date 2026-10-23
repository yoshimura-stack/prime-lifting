# Staging shadow forced rollback and retry — 2026-10-23

Target: ONLY `tarnzjkxexlozqqmyqof`, isolated `boost_shadow_test`. No production changes.

1. Inserted a disposable player with best score 0.
2. In one transaction, invoked `boost_shadow_test.submit_verified` for SCORE BOOST base 50,000 + bonus 5,000 = 55,000, **then deliberately raised** `P0001 intentional rollback fault` before COMMIT. SQL request failed as intended.
3. Independently read player: `best_score=0`, `best_run_id=null`, `run_count=0`. Both score update and receipt insertion were rolled back.
4. Retried the exact same run ID and values in a new transaction: `replayed=false`, `personalBest=true`, `bestScore=55000`, correct `bestRunId`. This is the expected outcome because the original failed transaction did not commit.
5. Deleted the disposable player; cascade deleted run. Independently confirmed **0 players / 0 runs**.

Scope: isolated shadow DB only. Does **not** verify production score submission, daily awards, achievement RPCs, or full end-to-end game flow. Shadow function must not be exposed as a client scoring API.
