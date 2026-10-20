# PRIME BOOST staging-only player enrollment

The dedicated staging Supabase project is `tarnzjkxexlozqqmyqof`. Never execute these steps against production.

The preview Worker uses a dedicated HMAC bearer token; **there is no public token-issuing endpoint**. Issue tokens only from a trusted administrator environment, never browser JavaScript.

1. Create a random UUID for a disposable test account (not a real production account).
2. Insert it in the **staging** `public.lifting_players` table using an authorized service-role SQL session:
   `insert into public.lifting_players(id) values ('<TEST_UUID>');`
3. Issue a short-lived token with `issuePreviewToken({playerId:'<TEST_UUID>',secret:PREVIEW_SECRET})` in a trusted server-side process. Do not log, commit or send the secret to browser code.
4. Use `Authorization: Bearer <TOKEN>` on same-origin POST `/api/boost-preview/slot/spin` with `Content-Type: application/json` and `{}` body.
5. Confirm the staging slot row and stock increase exactly once. Repeat request to check `replayed:true`.
6. Delete the test account's slot rows, run uses, inventory and player row when done.

Security requirements:
- `BOOST_PREVIEW_SESSION_SECRET` must be a new random secret of at least 32 characters, **not** the production HMAC secret.
- `BOOST_PREVIEW_SERVICE_KEY` must be a secret scoped to the dedicated staging Supabase project, not the production project.
- `BOOST_PREVIEW_LIMITER` must be configured as a Cloudflare rate limiting binding. The Worker rejects requests when absent.
- `BOOST_PREVIEW_PROJECT_ID=tarnzjkxexlozqqmyqof` and `BOOST_PREVIEW_ENABLED=true` are required.
- Do not expose the token issuer or BOOST reservation endpoint on the public Worker. Reservation stays disabled independently.
- Before deployment, configure a dedicated Worker name, rate limiter namespace, routes, and staging secrets. No deployment has been performed.

This document describes a manual preview testing procedure, not a completed browser test.
