# BOOST early-release blocker audit — 2026-10-23 (STAGING ONLY)

## Verified read-only against isolated staging Supabase
Project `tarnzjkxexlozqqmyqof` currently has `public.lifting_players`, BOOST inventory/reservation/receipt tables, and private `boost_shadow_test` test doubles. It **does not have** `public.lifting_runs`, `public.lifting_api_submit`, or normal leaderboard/daily/achievement RPCs. No SQL changes were made during this audit.

## Repository SQL provides a concrete compatibility reference
`sql/atomic-score-breakdown-20261018.sql` defines existing `lifting_api_submit` for a **different production-like schema**. It validates `baseScore + mobileBonus = score`, rejects PC mobile bonuses, and requires mobile score to equal `round(baseScore * 1.1)`. Therefore it **cannot safely store BOOST ×1.1** with the new PC/mobile baseline ×1.0 or preserve BOOST best-run provenance. Merely calling it after a separate BOOST receipt would be non-atomic and risks leaderboard misattribution.

`sql/daily-ranking-20261018.sql` documents the expected `lifting_players.best_score`, `lifting_runs`, and daily-award dependencies. None of these may be inferred from the current minimal staging DB.

## Shortest safe critical path
1. Create a production-*compatible* **isolated staging** schema with the necessary run, player-best, daily and achievement semantics, using reviewed repository SQL as a reference. Do not overwrite or copy real player data.
2. Implement **one trusted atomic ranked submit transaction** accepting verified BOOST run and normal run, preserving best-run pointer and score breakdown. Every higher normal best must clear BOOST attribution. Duplicate run IDs must be idempotent.
3. Add server-only best-run/receipt batch reads; no UUIDs or private receipt fields in public leaderboard responses.
4. Wire authenticated Worker start/finish and UI only on isolated staging. Test PC/mobile, 60/65 seconds, first/second SC drop, daily idempotency, retry after partial failure, ties, concurrency and forged scores.
5. Only after successful staging verification, request explicit production release authorization. Do not merge or deploy automatically during the tournament.

`server/boost-release-gate.mjs` provides a fail-closed check; its checks are **necessary but not sufficient** for live release. CI green on unit tests does not imply deployed staging compatibility.
