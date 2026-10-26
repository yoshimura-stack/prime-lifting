# PRIME BOOST — isolated staging live-slot activation checklist

**Scope:** `feature/prime-boost-staging` only. Dedicated Worker `prime-boost-isolated-preview`, staging Supabase project `tarnzjkxexlozqqmyqof`. Never apply to `prime-lifting`, production Supabase `ctxhopadmvasxvjspwoi`, or `main`.

## Current verified prerequisites
- Staging deploy workflow completed for commit `2d514a6b`; CI passed.
- Staging `lifting_players` has one dedicated tester UUID: `123e4567-e89b-42d3-a456-426614174001`. No welcome grant or slot spin was performed when it was created.
- Browser operator mode: `https://prime-boost-isolated-preview.yoshimura-yuki.workers.dev/boost-slot-preview.html?operator=1`.
- The demo at `?demo=1` never writes to the API or database.
- Signed preview API flags are enabled in the staging Worker config, **but requests fail closed unless BOTH dedicated Worker secrets are present**. The game-run API remains separately disabled.

## Operator-only action: set Worker secrets

In Cloudflare Dashboard, select the account containing **prime-boost-isolated-preview**, open Workers & Pages → prime-boost-isolated-preview → Settings → Variables and Secrets (UI wording may vary).

Create these as **Secret** values on that Worker only:

1. `BOOST_PREVIEW_SESSION_SECRET`: a fresh, unpredictable string of at least 32 characters, distinct from every production secret. Generate locally with a trusted password manager or cryptographic generator. **Never paste it into chat, GitHub, docs, or Actions logs.**
2. `BOOST_PREVIEW_SERVICE_KEY`: the **staging Supabase** secret/service-role API key for `tarnzjkxexlozqqmyqof` only. Never use the production key, and never place it in client JavaScript.

Keep `BOOST_PREVIEW_PROJECT_ID=tarnzjkxexlozqqmyqof`. Do not enable `BOOST_STAGING_RUNS_ENABLED` or change the production Worker.

**Important:** the browser token must be signed using the exact same `BOOST_PREVIEW_SESSION_SECRET` stored on the staging Worker. Cloudflare secrets are not retrievable after saving, so securely retain a local copy for the offline issuer.

## Issue a short-lived tester token (operator's local terminal only)

From a local checkout of this repository with Node.js 22:

```bash
# Set BOOST_PREVIEW_SESSION_SECRET securely in your local environment
# without placing its literal value in shell history or the command line.
node scripts/issue-boost-preview-token.mjs 123e4567-e89b-42d3-a456-426614174001
```

The script refuses missing/short secrets, signs only a UUID, and creates a **15-minute** bearer token. Treat the printed token as a password. Do not commit it, send it in chat, or upload screenshots containing it.

## Browser acceptance test

1. Open the `?operator=1` URL; paste the 15-minute token into the password field; click connect.
2. Verify first login shows the one-time gift: blue 1/2, yellow 1/2, green 1/2.
3. Press START then STOP once. Observe the 3-reel sequence and a server-authoritative result, including possible MISS.
4. Verify stock increases only for a non-MISS BOOST and never exceeds 2/2. On MISS it stays unchanged.
5. Reload, issue a **new** token, and reconnect: the initial gift must **not** be granted twice; stock must persist.
6. On the same JST day, a repeat spin must be marked already drawn and must not grant another item.
7. Confirm staging Supabase shows exactly one welcome row and one daily slot-spin row for the tester.
8. Verify invalid or expired tokens return unauthorized and cannot change inventory.

If the operator page shows “認証または在庫確認に失敗しました”, first verify the two secrets are present on the **staging** Worker and the local issuer uses the identical signing secret. Do not turn off authentication to make a test pass.

## Rollback / safety

To suspend the slot API, set `BOOST_PREVIEW_ENABLED=false` on the isolated Worker and redeploy **that Worker only**. Never copy the staging service key into production. Keep the approved slot appearance unchanged. Do not promote this branch to main during the live competition.
