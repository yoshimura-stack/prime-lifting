# 2026-10-23 — Staging signed HTTP run integration

## Implemented
- `server/boost-staging-run-handler.mjs`: authenticated `POST /api/boost-stage/start` and `POST /api/boost-stage/finish`, strict same-origin, JSON size limits, preview-only identity resolver, no client-supplied player ID or BOOST score breakdown.
- `server/boost-preview-worker.mjs`: routes these endpoints only when existing `BOOST_PREVIEW_ENABLED=true` and **additional** `BOOST_STAGING_RUNS_ENABLED=true`, with `BOOST_RUN_SIGNING_SECRET` (minimum 32 chars). The dedicated staging Supabase host remains pinned. Production `server/worker.mjs` is unchanged.
- `server/boost-preview-transport.mjs`: allowlisted atomic ranked RPC `lifting_api_submit_boost_atomic`; no fallback to receipt-only storage.
- `tests/boost-staging-run-handler.test.mjs`: all 4 modes, replay retry, forged identity, origin, disabled mode, missing DB RPC.
- Added integration/UI tests to the mandatory `npm test` CI script. This surfaced a malformed UUID regex in `server/boost-atomic-ranked-submit.mjs`; fixed in commit `2e9071fd`.

## Deployment status and limitations
- **No staging or production Worker deployment performed**; no secrets changed.
- Staging API endpoints remain **disabled by default**, and standalone preview still has its own disabled slot UI.
- The staging DB atomic RPC writes verified receipts and `boost_shadow_test` ranking; **not** the real score, daily or achievement schema.
- The real `game.js` still uses the standard `/api/game/start` and `/api/scores` flow. BOOST start and finish are not wired to the playable browser yet.
- Do not enable the API for live users before replay duration validation, compatibility with the real ranking schema, and an isolated staging deployment/test.
