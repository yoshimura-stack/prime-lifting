# Isolated Cloudflare preview Worker deployment checklist

This configuration is **not deployed**. Source: `wrangler.boost-preview.jsonc`, Worker name `prime-boost-isolated-preview`.

1. From the staging branch run `npm test`, `npm run build`, and `npm run check:boost-preview`. The last command is a Wrangler dry-run, not a deployment.
2. Verify Cloudflare account and project ownership. Confirm `wrangler.boost-preview.jsonc` is selected explicitly; never use the production `wrangler.jsonc`.
3. Set dedicated staging secrets `BOOST_PREVIEW_SESSION_SECRET` (at least 32 random characters) and `BOOST_PREVIEW_SERVICE_KEY` using the isolated preview Worker secret configuration. Never reuse production secrets or commit these values.
4. The separate staging database project ID is `tarnzjkxexlozqqmyqof`. Verify this before enabling.
5. Bind `BOOST_PREVIEW_LIMITER` and verify it works; missing limiter fails closed.
6. Keep `BOOST_PREVIEW_ENABLED=false` for first deployment; requests should return 503. Enabling later requires a deliberate preview-only configuration change.
7. Provision a disposable staging player and issue a dedicated short-lived bearer token from a trusted admin environment, as documented in `PRIME-BOOST-STAGING-TEST-PLAYER.md`.
8. Confirm same-origin slot POST behavior, retries, and database idempotency. BOOST reserve remains disabled.
9. Disable the Worker and remove test data after validation.

No live Worker, production Supabase, production rankings, or main branch may be modified as part of this checklist. A successful dry-run does not establish runtime security or browser functionality.

## Static preview milestone

The separate Wrangler config now points at `boost-preview-public` and the dedicated Worker returns `env.ASSETS.fetch(request)` for non-API paths. `npm run check:boost-preview` builds this folder first and then runs Wrangler dry-run. After an explicitly authorized preview deployment, open `/boost-slot-preview.html`: the page should render three neutral soccer-ball reels, the SPIN button disabled, and the token form disabled. All `/api/boost-preview/*` calls must return 503 while `BOOST_PREVIEW_ENABLED=false`.

The browser client contains a **separate hard-coded OFF gate** (`SLOT_BROWSER_ENABLED=false`). Do not change this, enable the Worker, or expose credentials until the dedicated test-token workflow and runtime checks are approved. Neither this preview page nor the new staging Worker is deployed yet. The test runner's actual pass/fail status has not been confirmed.
