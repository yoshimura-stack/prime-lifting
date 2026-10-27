# PRIME BOOST — Teacher 7 checkpoint (2026-10-27)

## Scope and safety
- GitHub branch: `feature/prime-boost-staging`; PR #140 remains DRAFT, not merged into `main`.
- Isolated Worker: `prime-boost-isolated-preview`.
- Isolated Supabase project **only**: `tarnzjkxexlozqqmyqof`.
- Production Worker, `main`, production DB `ctxhopadmvasxvjspwoi`, production rankings: **not modified**.

## Verified
1. The previously uncertain `allowDailyLoginGrant:env.BOOST_DAILY_LOGIN_GRANT_ENABLED==='true'` code was present. Previous teacher's daily SQL, transport, service and handler code were present too.
2. Head CI was green on prior commit `38ee9862` (all three jobs).
3. Staging DB schema was inspected. `lifting_players(id)` is UUID; inventory has `time_count`, `score_count`, `sc_count`, `updated_at`; welcome grants have `granted_at`. One test player exists. No initial BOOST inventory/welcome rows.
4. Applied `docs/sql/prime-boost-daily-login-grant-staging.sql` to the isolated staging DB using a staging-only migration. The daily grants table and RPC now exist there.
5. Read-only permissions audit: RPC is NOT executable by `anon` or `authenticated`; `service_role` can execute it.
6. DB transaction smoke tests passed: first welcome grants one of each, first-day daily grant skipped, simulated following-day daily grant succeeds once, repeated same-day request is idempotent, full inventory yields no award and remains idempotent. All synthetic records were rolled back; 0 daily records persisted from these tests.
7. Fixed an operator UI scoping bug that prevented inventory display after the async try block. Wired server-backed daily login grant between welcome gift and inventory fetch. A disabled daily API (HTTP 403) does not break welcome gift testing.
8. Added regression tests for browser login ordering, isolated deployment flags and daily SQL safety contract; the latest staging `npm test` and build GitHub Actions passed on commit `adb325f9`.
9. Enabled `BOOST_DAILY_LOGIN_GRANT_ENABLED=true` in **isolated staging** Wrangler config. This is committed but **NOT YET DEPLOYED**.

## Deployment blocker — do not report as deployed
- Attempt 1: isolated preview GitHub Actions run `40431252568`, including one retry, failed at `npx wrangler deploy` v4.148.0, with `Unable to fetch bindings, routes, or services metadata from the dashboard`.
- Attempt 2: isolated preview run `40431703158`, tried pinned Wrangler 4.153.0, same error.
- On both runs, checkout, `npm ci`, `npm test`, staging bundle build and isolated-target validation passed. Only Cloudflare deploy failed.
- 2026-10-26 had successful isolated Worker deploy runs (e.g. run `40300299826`), but that older deployed Worker cannot be assumed to contain this feature.
- Next troubleshoot Cloudflare API token permissions/account binding, dashboard metadata access and Cloudflare status. Avoid further identical retries without diagnosing root cause. Never change production deploy secrets or production Worker to fix staging.

## Release blockers
1. **Actual everyday login**: staging player table currently has only a UUID, and the operator page needs an offline-issued short-lived HMAC Bearer token. It does not yet support the real name + 6–12 digit PIN workflow. Never require a local Node CLI from end users. Design a secure staging-only login bridge/production-compatible auth connection before release.
2. **Ranked play integration**: verify server-side start/reservation stock deduction and finish/replay idempotency, BOOST score identity, best-score ranking, achievement/daily integration. Private shadow-only ranking verification is not a production substitute.
3. **Deployment**: isolate/fix Cloudflare staging deployment error; deployed browser E2E not yet verified, including PC and iPhone landscape.
4. **Release safety**: PR #140 has a large changeset and must not be merged blindly. Prepare carefully scoped release PR + production DB backup/rollback plan, request explicit user approval before ANY production write.

## Confirmed product behavior
- Initial one-time welcome gift: TIME +5 SEC / SCORE x1.1 / SC first drop preserved, each 1; no extra random gift that day.
- Later JST calendar login day: one uniformly random eligible type; per-type cap 2; no grant when user doesn't log in; no carryover; no duplicate on same-day reconnection; all-full = none.
- One BOOST per play; dormant slot code and design preserved for future release.
- Do not alter physics, collisions, base scoring, titles, daily challenge, ranking data or existing live tournament.

## Latest branch state
- Latest verified green staging commit at checkpoint: `adb325f9ec627f58b20f5214287eba4650206253`.
- This document is documentation only; it does not establish a successful Worker deployment.
