# November 2026 SOLO season — safe migration plan (NOT APPLIED)

## Verified production state (2026-11-11)
- Production Supabase project: ctxhopadmvasxvjspwoi. Never use deleted staging project tarnzjkxexlozqqmyqof.
- October snapshot exists in public.lifting_season_archive_202610 (47 player rows).
- Existing public.lifting_players.best_score contains lifetime/October best, NOT a season-scoped best.
- Existing public.lifting_api_submit updates lifting_players.best_score and score_breakdowns.
- Existing public.lifting_api_leaderboard ranks by lifting_players.best_score + current-month daily bonus.
- Existing public.lifting_api_player (used by login/me/submit/leaderboard) must be audited.
- Existing public.lifting_runs is used for run replay idempotency and MUST be retained.
- NEVER call /api/admin/reset or createDatabase().resetAllPlayers(): deletes player accounts/PIN hashes.

## Required implementation, before opening score writes
1. Add separate lifting_season_player_scores keyed by (season_key, player_id) with season best, device, kit, timestamps; use '2026-11' for November. Preserve lifting_players and October snapshot unchanged.
2. Implement season-aware submit transaction: replay verification and boost reservation remain in Worker; DB function records run ID once, updates ONLY November season score, and returns November player best. Existing runs and old October scores are immutable.
3. Implement season-aware player and leaderboard RPCs, including registration/login/me, so ALL surfaces display November score and rank. Existing daily_status is already calendar-month scoped; verify daily awards and achievements independently.
4. For any run, season must be derived from server-side start time (JST), not client payload. Reject cross-season replay or late submissions outside approved grace policy.
5. Ensure score breakdown and best BOOST badge are season-scoped; old October metadata must not appear on November bests.
6. Do not reset BOOST inventory, account PINs, achievement progress, or daily awards as a side effect. Verify whether October-only boost rules should be enabled for November.
7. Test new player, existing October champion, score 0, first November run, repeated run ID, leaderboard rank, daily bonus, score boost, phone/PC, and midnight JST boundary.
8. Deploy to a separate non-production preview with isolated writable data or read-only API. Never point a writable preview at production without explicit safeguards.
9. After CI + browser validation, promote to production and verify with a controlled account; do not modify other games.

## Current status
- This is an implementation checklist, not an executed migration.
- The existing October closure gate remains active in production.
- Preview flag permits static game screen but still blocks score APIs; not yet a playable authenticated November season.
