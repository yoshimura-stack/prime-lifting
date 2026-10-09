# V0.5.32 Production build

Based on V0.5.31. Removed local HTML costume score simulation and its message handler. Unlocks now use only existing PRIME_RANKING.getBest(). All 34 costumes and fitting room remain.

## Before deployment
1. Back up the current GitHub revision.
2. Test on a separate Cloudflare preview/branch, not the live competition URL.
3. Verify logged-in personal best, unlock thresholds, outfit choice and gameplay, score saving, leaderboard, logout/login.
4. Ensure guest cannot unlock paid outfits.

No changes intended to gameplay physics, scoring, database schema, or Worker server.
