# 2026-10-23 — Isolated playable BOOST staging build

## New staging-only preview
- `/boost-game-preview.html` is generated from the existing game HTML, with its ordinary `game.js` entry replaced by `js/boost-playable-staging-bootstrap.mjs`.
- The bootstrap requires an in-memory signed preview Bearer token and reads the **server-confirmed** staging inventory before offering normal / TIME / SCORE / SC selection.
- Only after authentication does it install `window.PRIME_STAGING_RUN_FLOW`; `game.js` starts after this installation and uses the signed server START and FINISH routes.
- The preview build bundles required game CSS, `js/` and `vendor/` assets in its own directory. It never changes the production `public/` bundle or `server/worker.mjs`.
- A successful FINISH invalidates the inventory snapshot; another run requires reconnecting to fetch inventory. Failed FINISH keeps the active run for retry.
- Worker asset CSP permits inline initialization scripts **only** for `/boost-game-preview.html` because the legacy game HTML contains inline scripts. Other preview assets keep strict `script-src 'self'`.

## Critical limitations
- **Not deployed.** `BOOST_PREVIEW_ENABLED=false` remains in the isolated Worker config. Signed runs require another independent `BOOST_STAGING_RUNS_ENABLED=true` and dedicated secrets.
- Preview token issuance is a trusted separate operation; the browser cannot mint a token.
- This is a **first playable integration candidate**, not an end-to-end verified gameplay release. PC/iPhone gameplay, deterministic replay consistency, real score persistence, achievements and daily challenge integration remain unverified.
- Staging database's atomic RPC still writes to the isolated shadow ranking, not the production-compatible leaderboard.
- The original game still initializes legacy ranking and daily-challenge browser modules; review their behavior on the isolated preview host before any real tester uses it.
- No production Worker, DB, main branch, or tournament behavior changed.

## Next required gates
1. Inspect staging Worker secrets and obtain an isolated deployment path without using production credentials.
2. Run an authenticated manual API smoke test, then a 60/65-second PC and iPhone replay.
3. Replace shadow-only ranking with a production-compatible staging schema and test daily/achievement updates before release.
