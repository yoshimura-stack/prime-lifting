# Season 02 — release gate (2026-11-12)

## Current state
- This branch is NOT merged or deployed. Production remains October maintenance.
- SQL in `sql/season-02-*-draft.sql` is NOT applied.
- October archive `lifting_season_archive_202610` contains 47 rows (read-only verified).
- Deleted staging Supabase project MUST NOT be used. Never point preview write traffic to production.
- GitHub Actions `npm test` / `npm run build` succeeded for commit `5ba1bb5`; later changes need fresh CI verification.

## Before any database write
1. Create a separate, isolated staging database or obtain a safe disposable Postgres environment.
2. Run BOTH SQL drafts in order; confirm PostgreSQL accepts each statement. Validate RLS, grants, service-role-only RPC access.
3. Test register/login/me, leaderboard (all 0 before first run), validated run submission, duplicate run ID, BOOST reservations, score-breakdown display, daily awards, new champion, PC/mobile.
4. Confirm 2026-10 archive unchanged, existing PIN hashes unchanged, legacy `lifting_players.best_score` unchanged, and `lifting_runs` replay idempotency intact.
5. Review the live BOOST inventory and achievement behavior: both predate November and must not be silently reset.
6. Ensure worker `SEASON_02_READY` remains absent/false until migration and verification finish. `SEASON_PREVIEW_ENABLED` does NOT unlock score APIs.
7. Run GitHub CI on final SHA; manually check HTML overlay on desktop and mobile.
8. Disable/retire destructive admin reset in the UI as well as server before reopening.

## Production release order (only after staging success)
1. Capture read-only baseline counts and a verified backup/export of affected tables/functions.
2. Apply reviewed additive storage schema, then reviewed RPC updates in a controlled migration.
3. Deploy tested worker/assets with `SEASON_02_READY` **not set**.
4. Confirm maintenance still appears; verify readiness endpoint remains locked.
5. Enable `SEASON_02_READY=true` only after backend checks pass; verify November status unlocked and December 1 cutoff.
6. User performs a SOLO 60-second run and checks own score, monthly ranking, daily bonus and BOOST on PC/mobile.
7. Only then send existing/new employee announcement emails.

## Rollback
- Disable `SEASON_02_READY` immediately to stop all new writes.
- Restore the previous worker revision if required.
- Do NOT drop `lifting_season_scores`, truncate `lifting_players`, delete `lifting_runs`, or touch October archive.
- Restore original RPC definitions from verified pre-migration backup only after investigating any in-flight submissions.

## Known limitation
The SQL tests currently validate text-level invariants, not execution against PostgreSQL. No end-to-end browser test, production migration or real score save has been completed.
