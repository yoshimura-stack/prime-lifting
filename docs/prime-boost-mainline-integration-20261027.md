# PRIME BOOST mainline integration — 2026-10-27

Status: implementation checklist; **not a production release**. This branch starts from current main, not the diverged teacher7 staging branch.

## Locked product scope
- Preserve existing name+PIN login, session cookie, signed run, replay verification, BEST/ranking, achievements and daily awards.
- BOOST types: time (+5 seconds, blue), score (x1.1 on both PC and mobile, yellow), sc (preserve combo on first drop only, green until consumed).
- One BOOST per run; stock cap 2 per type.
- First authenticated login: grant one each. On subsequent JST login dates: grant one random eligible type, only when the user logs in that day; idempotent on retries. No roulette for this release.
- Preserve existing BEST scores, daily credits, achievements, controls and physics. Do not migrate or overwrite historical scores.

## Mainline integration points
1. **server/worker.mjs**: extend the existing authenticated /api/login, /api/register, /api/me and /api/game/start flow with inventory/grant and signed BOOST selection. Never reuse public shared-PIN staging auth. Keep BOOST disabled until the whole verified path is ready.
2. **server/replay.mjs**: reuse teacher7's server replay changes for +5 SEC and first-drop SC; keep regular 60-second replay unchanged. SCORE applies only after replay and never trusts a client score.
3. **server/db-contract.mjs + SQL**: add service-role-only RPCs for first-login/day grants, inventory and atomic run reservation/consumption. Extend the **existing** lifting_api_submit transaction to persist verified BOOST run and score breakdown with run-ID idempotency. Do not use shadow ranking as the live leaderboard.
4. **js/ranking.js + game.js + index.html**: connect BOOST inventory and selection to existing account/start UI; reuse existing engine/renderer BOOST presentation and result/ranking icon where applicable. Guests remain playable without persisted BOOST.
5. **Existing leaderboard**: preserve BEST + monthly daily bonus ordering and achievements; attach verified BOOST provenance to new BEST only.

## Compatibility blocker (must verify deployed schema before migration)
Repository SQL `sql/atomic-score-breakdown-20261018.sql` rejects any PC bonus and requires mobile score = round(baseScore * 1.1). This conflicts with current locked rules (both devices x1.0 baseline, yellow x1.1). A compatible migration must validate trusted BOOST type and verified replay, not treat BOOST as legacy mobileBonus. Check actual deployed SQL read-only before changing it.

## Release gates
- Unit tests: no BOOST, each BOOST, PC/mobile score parity, old BEST unchanged, first grant, next JST day, missing-login day, full inventory, duplicate login, duplicate START/FINISH, replay tamper rejection, reservation failures, title/daily compatibility.
- Browser E2E: PC and iPhone login → grant → select → play → consume → result → BEST/ranking/achievements/daily → reload.
- No main merge, Cloudflare deploy or production Supabase mutation without explicit approval.
- Teacher7 PR #140 stays DRAFT and unmerged; do not import its test PIN, shadow ranking, or unrelated file deletions.

## Implementation sequence
A. Read-only verify production RPC signatures/schema and identify reusable teacher6/7 files.
B. Add inventory + login grants behind a closed feature flag.
C. Add signed BOOST START/FINISH and atomic score save behind same flag.
D. Integrate UI and effects; run tests and E2E.
E. Request release approval, then deploy with rollback path.
