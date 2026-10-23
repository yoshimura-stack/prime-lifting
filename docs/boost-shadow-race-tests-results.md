# Shadow simultaneous tie and duplicate run checks — 2026-10-23

Target: **staging only** `tarnzjkxexlozqqmyqof`; isolated `boost_shadow_test` schema. No production or `main` changes.

## Concurrent equal-score submissions
- Two calls in parallel submitted distinct run IDs, both SCORE BOOST base 50,000 + 5,000 = 55,000, for the same disposable player.
- First call returned `personalBest=true`, `bestRunId=...ccc1`.
- Second returned `personalBest=false`, retaining the first run ID.
- Confirms the observed final best provenance was not stolen by a tie.

## Same run ID submitted for two players
- Two calls in parallel submitted run ID `...ddd1` and score 66,000 for two different disposable players.
- One committed; the other failed with PostgreSQL `P0001 conflicting replay`.
- Read-back: winner best 66,000, 3 total runs including the prior tie scenario; losing player best 0 and 0 runs.
- Confirms duplicate run ID could not be attributed to a second player in this test.

## Cleanup and limitations
- Deleted both disposable players and their cascaded runs; post-cleanup counts: **0 players / 0 runs**.
- These are observed concurrent connector calls; exact lock-wait timing and true overlapping transaction sessions were not instrumented.
- Still needed: deterministic lock contention timing proof, rollback-after-insert fault test, production-compatible submit mapping, and full score/achievements/daily integration.
- Shadow function accepts already verified numbers; it is not a public score verification API.
