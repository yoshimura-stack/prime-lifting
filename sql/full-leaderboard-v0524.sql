-- V0.5.24: all-player leaderboard (up to 200), existing TOP10 unchanged.
-- No player scores, records, or devices are modified.
create or replace function public.lifting_api_leaderboard(payload jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('entries',coalesce(jsonb_agg(public.lifting_api_player(p.id) order by p.best_score desc,p.created_at,p.id),'[]'::jsonb))
 from (
  select id,best_score,created_at from public.lifting_players
  order by best_score desc,created_at,id
  limit least(greatest(coalesce(case when payload->>'limit' ~ '^[0-9]{1,3}$' then (payload->>'limit')::integer else null end,10),1),200)
 ) p;
$$;
revoke all on function public.lifting_api_leaderboard(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_leaderboard(jsonb) to service_role;
