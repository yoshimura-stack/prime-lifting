# V0.5.28 — LIFTING MASTER (draft implementation plan)

## Confirmed product behavior
- Eight existing titles are collected cumulatively **per logged-in name+PIN account**, across separate standard runs.
- The existing per-run achievement board and result panel remain unchanged.
- Unlocking all eight awards the permanent platinum **LIFTING MASTER** title.
- This grants eligibility for STAGE 02 WORLD ARENA; the stadium itself is scheduled for V0.5.29.
- STAGE 01 stays available; scores and rankings remain shared across stages.

## Security and data
- Never trust a client-supplied achievements array.
- The Worker replays the submitted event stream with the authoritative engine. The replay now extracts evidence for six action-based titles; best combo and score come from verified replay results.
- SCORE HUNTER must use the authoritative final score (including the existing mobile score multiplier), consistently with the score shown to the player.
- Persist only the union of previously verified titles and titles verified in the current accepted run.
- Store progress under immutable player UUID, not display name or browser storage.
- Use an additive migration and an authenticated RPC for reading progress. Do not modify existing leaderboard/player/run data or reset anything.
- The submit RPC must atomically save the run and merge earned-title progress, ensuring duplicate submissions cannot grant unrelated titles.
- Gate stage eligibility on the server's stored progress, not a client-side boolean.
- Do not auto-deploy this branch or merge to main before migration, tests and user confirmation.

## Test checklist
1. All eight conditions: positive and negative cases; cross-run union; no title awarded from a rejected/adjusted run.
2. Replay tampering, repeated run token, logout/login, a second account, simultaneous submissions.
3. Existing score, rankings, best-score and authentication regression tests.
4. Visual check of platinum unlock, persistent badge and stage selection.
5. Verify DB migration in staging before production.

## Current checkpoint (2026-10-15)
- Canonical additive SQL: `supabase/migrations/20261015_lifting_achievements.sql` ONLY. Do not run any superseded SQL.
- GitHub draft PR is not deployed. Production V0.5.27.2 continues resetting per-run badges by design.
- Before staging DB migration: verify `lifting_players.id` is uuid and inspect actual function role permissions. Do not paste secret keys into chat.
- The progress merge currently happens after run submit, in a separate RPC. A partial failure can save a score without saving titles. This needs idempotent recovery or an atomic transaction before release.
- Stage 02 remains unimplemented. Do not advertise stage unlock as shipped.
- Run `npm test`, `npm run check:deploy`, and a staging two-session login test before requesting production SQL execution.
