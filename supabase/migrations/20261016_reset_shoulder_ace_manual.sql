-- MANUAL ONE-TIME DATA CHANGE: do NOT auto-run during deployment.
-- Apply ONLY after the three-hit rule is confirmed deployed and active.
-- SHOULDER ACE = bit 3 = 8. Preserve all other title bits.
-- IMPORTANT: verify the current production table and take a backup first.
-- Preflight: SELECT count(*) FROM public.lifting_achievements WHERE (title_mask & 8) <> 0;
-- In the SQL editor, run the transaction below only after preflight and explicit approval.
BEGIN;
UPDATE public.lifting_achievements
SET title_mask = title_mask & 247,
    updated_at = now()
WHERE (title_mask & 8) <> 0;
-- Check affected rows, and confirm 0 remain with:
-- SELECT count(*) FROM public.lifting_achievements WHERE (title_mask & 8) <> 0;
COMMIT;
-- All other achievements, scores, leaderboard records remain unchanged.
