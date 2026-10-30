-- October 2026 award standings. READ ONLY. Run after 2026-11-01 00:00 JST.
-- October daily awards remain in the database even after the November daily counter resets.
-- Score submissions are frozen by the Cloudflare Worker cutoff, not by this query.
WITH october_daily AS (
 SELECT player_id,count(*)::integer*100 AS daily_bonus
 FROM public.lifting_daily_awards
 WHERE day >= DATE '2026-10-01' AND day < DATE '2026-11-01'
 GROUP BY player_id
),final AS (
 SELECT p.id,p.display_name,p.best_score AS play_best,
 COALESCE(d.daily_bonus,0) AS october_daily_bonus,
 p.best_score+COALESCE(d.daily_bonus,0) AS final_score,
 p.created_at
 FROM public.lifting_players p
 LEFT JOIN october_daily d ON d.player_id=p.id
)
SELECT row_number() OVER (ORDER BY final_score DESC,created_at,id) AS final_rank,
 display_name,play_best,october_daily_bonus,final_score,id
FROM final ORDER BY final_rank;
