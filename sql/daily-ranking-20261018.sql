-- Keep saved play best separate from monthly challenge credits.
-- Rankings are ordered by combined total; the saved best is never overwritten by credits.
create or replace function public.lifting_api_player(p_id uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
with scores as (
 select p.id,p.display_name,p.best_score,p.created_at,p.best_kit,p.last_played_at,p.best_device,
 coalesce((select count(*)::integer*100 from public.lifting_daily_awards a
 where a.player_id=p.id
 and a.day>=date_trunc('month',now() at time zone 'Asia/Tokyo')::date
 and a.day<(date_trunc('month',now() at time zone 'Asia/Tokyo')+interval '1 month')::date),0) as daily_bonus
 from public.lifting_players p
)
select jsonb_build_object(
 'id',p.id::text,'name',p.display_name,'best',p.best_score,'dailyBonus',p.daily_bonus,
 'rank',(select count(*)+1 from scores q
  where q.best_score+q.daily_bonus>p.best_score+p.daily_bonus
  or (q.best_score+q.daily_bonus=p.best_score+p.daily_bonus and (q.created_at,q.id)<(p.created_at,p.id))),
 'kit',p.best_kit,'lastPlayed',p.last_played_at,
 'bestDevice',case when p.best_device in ('pc','mobile') then p.best_device else null end)
from scores p where p.id=p_id
$$;
create or replace function public.lifting_api_leaderboard(payload jsonb)
returns jsonb language sql stable security definer set search_path to '' as $$
with scores as (
 select p.id,p.best_score,p.created_at,
 coalesce((select count(*)::integer*100 from public.lifting_daily_awards a
 where a.player_id=p.id
 and a.day>=date_trunc('month',now() at time zone 'Asia/Tokyo')::date
 and a.day<(date_trunc('month',now() at time zone 'Asia/Tokyo')+interval '1 month')::date),0) as daily_bonus
 from public.lifting_players p
)
select jsonb_build_object('entries',
 coalesce(jsonb_agg(public.lifting_api_player(s.id) order by s.best_score+s.daily_bonus desc,s.created_at,s.id),'[]'::jsonb))
from (
 select * from scores order by best_score+daily_bonus desc,created_at,id
 limit least(greatest(coalesce(
 case when payload->>'limit' ~ '^[0-9]{1,3}$' then (payload->>'limit')::integer else null end,10),1),200)
) s
$$;
revoke all on function public.lifting_api_player(uuid) from public,anon,authenticated;
revoke all on function public.lifting_api_leaderboard(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_player(uuid) to service_role;
grant execute on function public.lifting_api_leaderboard(jsonb) to service_role;
