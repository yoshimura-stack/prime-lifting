# BOOST staging manual API smoke test (2026-10-23)

This adds a **dedicated isolated preview asset** `/boost-run-preview.html`. It is **not** the playable game and is **not deployed** by this commit.

## What it verifies
- A human tester enters a short-lived, signed preview Bearer token into a password input (memory only; cleared on navigation).
- Inventory is read from the dedicated staging project via `/api/boost-preview/inventory`.
- A test-only choice of normal / TIME / SCORE / SC starts an authenticated signed run via `/api/boost-stage/start`.
- `/api/boost-stage/finish` sends a **zero-input, zero-score smoke run**, with retry preserving the same run ID and token after transient failures.
- The screen invalidates its inventory snapshot after success, requiring an authoritative reload before another run.
- The page is bundled by `scripts/build-boost-preview.mjs` alongside the existing locked slot preview.

## Strict gates / limitations
- `wrangler.boost-preview.jsonc` keeps `BOOST_PREVIEW_ENABLED=false`. Signed runs additionally require `BOOST_STAGING_RUNS_ENABLED=true` and `BOOST_RUN_SIGNING_SECRET` (at least 32 characters). Do not enable before isolated staging deployment and controlled test identities are available.
- Tokens must be issued via a **trusted** preview-session provisioning path; do not hardcode, publish or store tokens in GitHub or browser storage.
- The staging atomic RPC currently writes the shadow ranking and verified receipts, **not** the real player achievements/daily-challenge/leaderboard schema.
- This smoke test intentionally writes **staging-only** zero-score receipts when enabled; it is not read-only.
- Real browser gameplay and its replay capture must be validated separately; no user-facing BOOST release is authorized.
- Production `main`, Worker and Supabase are unchanged.

## Related correction
`game.js` now retains the failed FINISH payload until the server response has been validated; the staging overlay shows confirmation and hides the retry control only after success.
