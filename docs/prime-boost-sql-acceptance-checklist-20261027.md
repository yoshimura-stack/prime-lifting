# PRIME BOOST — isolated SQL acceptance checklist (2026-10-27)

## Preconditions / stop conditions
- **Do not use production** `ctxhopadmvasxvjspwoi` for experiments.
- Existing staging `tarnzjkxexlozqqmyqof` is **not compatible** with this branch's production-derived SQL. Do not overwrite its old BOOST objects.
- Provision a disposable database with the **production schema only** (no employee rows, credentials, scores or secrets), or obtain explicit approval for an alternative isolated verification environment.
- Confirm baseline tables `lifting_players`, `lifting_runs`, `lifting_score_breakdowns`, and `lifting_api_player(uuid)` plus `lifting_api_submit(jsonb)` exist and match production. Never use `CREATE TABLE IF NOT EXISTS` as a schema compatibility check.
- Apply three proposal files in order: inventory, reservation, submit. Check RLS and service_role-only EXECUTE grants. Keep Cloudflare flags off until tests pass.

## Transactional test cases
1. **Welcome login**: fresh test player, call `lifting_api_boost_login_grant` once. Expect counts 1/1/1 and `firstGrant=true`.
2. **Same JST date**: repeat login. Expect no increment and `firstGrant=false`.
3. **Next JST date**: in an isolated test only, advance date by controlled clock or seed `last_grant_day` to yesterday. Expect exactly one eligible stock increment.
4. **Cap 2**: set two categories to 2, one to 1. Next-day login can only increment the remaining category. At 2/2/2 no stock increase.
5. **Atomic reserve**: reserve one BOOST, expect exactly one decrement; repeat same run ID/type, expect `reused=true` and no second decrement.
6. **Wrong owner/type**: repeat run ID with another player or another BOOST. Expect rejection, no stock mutation.
7. **Empty inventory**: reservation fails and creates no reservation row.
8. **Normal score**: submit with `boost=null`, `score=baseScore`, `mobileBonus=0`. Verify old normal play still works.
9. **Yellow score**: reserve `score`, submit both PC and mobile cases with `score=round(baseScore*1.1)`, `mobileBonus=score-baseScore`. Reject old mobile ×1.2 and unreserved BOOST.
10. **Blue/green**: reserve `time` or `sc`, submit with unchanged score and zero bonus.
11. **Duplicate save**: submit same run twice. Expect only one `lifting_runs` row and one BEST update, and the second response reproduces original outcome.
12. **Authorization**: `anon` and `authenticated` cannot execute privileged RPCs or directly modify BOOST tables.
13. **Rollback**: verify disabling persistence readiness prevents *new* BOOST runs but previously issued signed runs remain savable while `PRIME_BOOST_ENABLED` remains on.

## Acceptance evidence
Record per-case PASS/FAIL, the SQL used, sanitized output, and the actual schema version. If any case fails, leave `PRIME_BOOST_ENABLED` and `PRIME_BOOST_SCORE_PERSISTENCE_READY` disabled in production and do not merge/deploy.

**Status:** checklist prepared only. No disposable database has yet been provisioned, and no live SQL acceptance test has been executed.
