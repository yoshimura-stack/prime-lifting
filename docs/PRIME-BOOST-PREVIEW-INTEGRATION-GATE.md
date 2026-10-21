# PRIME BOOST preview API integration gate

Status: source-code scaffolding only, NOT deployed or connected to the production Worker.

## Source files
- `server/boost-preview-transport.mjs`: allowlisted Supabase RPC transport, accepts an exact `expectedProjectHost` so a production URL cannot accidentally be substituted.
- `server/boost-preview-service.mjs`: validates inputs and RPC output.
- `server/boost-preview-handler.mjs`: POST-only handler, same-origin requirement, server-derived UUID identity, default OFF. Reservation requires a **second explicit** `allowReserve:true` gate, independent of slot-preview `enabled:true`. Unknown preview routes return 404 before DB access.
- `tests/boost-preview-transport.test.mjs`, `tests/boost-preview-service.test.mjs`, `tests/boost-preview-handler.test.mjs` added to `npm test`.

- `server/boost-preview-auth.mjs`: standalone short-lived HMAC bearer token verification, unrelated to production sessions. Token issuance is a trusted test-only server utility, not a public login endpoint.
- `server/boost-preview-worker.mjs`: separate Worker entrypoint, locked to staging project `tarnzjkxexlozqqmyqof`, requires `BOOST_PREVIEW_ENABLED=true`, `BOOST_PREVIEW_PROJECT_ID`, `BOOST_PREVIEW_SERVICE_KEY`, `BOOST_PREVIEW_SESSION_SECRET`; reservation stays OFF. **Not deployed.**

## Do not deploy this handler yet
This is an injectable component, not a standalone authenticated Worker. Its `resolvePlayer` callback must be supplied by a trusted, fully verified server-side session implementation. In particular, do NOT use a request body player ID or publicly exposed UUID as authentication.

The `reserve` endpoint is a low-level test hook accepting a run ID. It MUST NOT be publicly exposed for actual play: the official run ID must be issued and bound to a signed game-start token by the game Worker, with replay and BOOST rules validated before ranking submissions are enabled.

## Next implementation gates
1. Dedicated preview Worker entrypoint has been authored, but it has **not** been deployed or tested in a browser. Use **only** the isolated Supabase project `tarnzjkxexlozqqmyqof` and a separately configured test account/session. Never copy production session secrets or production service keys.
2. Dedicated token verification, origin checking and fail-closed request throttling are implemented. Before deployment, configure the Cloudflare limiter binding, a secure test-token issuance workflow, staging-only test player enrollment and explicit preview-domain allowlisting. See `docs/PRIME-BOOST-STAGING-TEST-PLAYER.md`. Never expose the HMAC secret or Supabase service key to the browser.
3. Run `npm test` and `npm run build`; inspect results. CI execution is not yet verified. Updated handler tests cover the separate reservation lock and unknown-route rejection.
4. Exercise isolated preview endpoints from a browser, then conduct stronger overlapping-transaction concurrency tests.
5. Complete official run-token binding, BOOST replay verification (+5 seconds, score multiplier, first-drop protection), ranking metadata and server-side inventory consumption before any production rollout.

## Release locks
- Existing `server/worker.mjs` keeps all `/api/boost/*` requests at HTTP 403 and rejects BOOST in normal game-start and score submissions.
- Do not merge into main, deploy, alter production DB, or award real inventory without explicit user approval.

## 2026-10-21 inventory-read integration
- Added isolated DB RPC `lifting_api_boost_inventory_read`, with `service_role` execute only; no existing table grants or RLS changed.
- Added authenticated preview-only `POST /api/boost-preview/inventory` with server-resolved player identity and count validation.
- Source and unit tests committed to `feature/prime-boost-staging`. Not deployed, not browser-tested; the existing BOOST selection UI still uses placeholder counts until a secure preview session is connected.
- Supabase October 30 default GRANT change: future tables must declare GRANT and RLS; do not alter existing production or staging grants without diagnosis and approval.

## 2026-10-21 staging run-start coordinator
- Added `server/boost-run-token.mjs` with HMAC-signed player/run/BOOST binding. Fixed URL-safe base64 encoding; dedicated staging secret only.
- Added `server/boost-run-coordinator.mjs`: a trusted server-created run ID, atomic `boost_reserve` RPC on game start for one selected BOOST, NONE without inventory deduction, signed token issued after confirmed reservation. Tests cover failure and cross-account/run substitution.
- `score()` produces **only a candidate** from a verified signed token and numeric base score; it **does not replay the event stream**, consume a one-time run, verify the persistent reservation record, or write ranking. Do not trust client-submitted base scores.
- A failed token-signing step after successful reservation can leave an item reserved; implement transactionally durable run issuance and idempotent recovery before public use. The preview reservation HTTP endpoint remains disabled.
- These components are NOT imported by the live Worker, and are NOT deployed. Never merge staging wholesale into main; it predates production UI fixes.
