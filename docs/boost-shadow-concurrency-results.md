# Staging shadow concurrency check — 2026-10-23

Target: ONLY `tarnzjkxexlozqqmyqof` (`prime-boost-staging`), isolated `boost_shadow_test` schema.

## Performed
- Inserted a disposable test player.
- Issued **two concurrent SQL connector calls** via `Promise.allSettled`, each with its own `BEGIN`/`COMMIT` transaction:
  - A locked the player row (`FOR UPDATE`), slept 2 seconds while holding the lock, then submitted SCORE BOOST base 50,000 + 5,000 = 55,000.
  - B submitted a normal, non-BOOST 60,000 score.
- Both returned `replayed=false` and `personalBest=true`.
- Independent final read confirmed `best_score=60000`, `best_run_id=null`, and `run_count=2`.
- Deleted disposable player (runs cascade) and independently verified `players_remaining=0` and `runs_remaining=0`.

## Interpretation and limits
- Observed result is consistent with correctly serialized score updates and safe invalidation of BOOST provenance.
- Connector did not expose session IDs or lock-wait timing in the returned results, so this **does not conclusively prove that both database transactions overlapped at the lock**.
- Still required: deterministic two-session lock-contention proof, same-score simultaneous writes, identical run ID racing across players, rollback after insert, and integration with the real submit/achievement/daily flow.
- Shadow `submit_verified` accepts caller-supplied scores and is **not** a production endpoint; never expose it to browsers.

No production database, Cloudflare deployment, or `main` branch changes.
