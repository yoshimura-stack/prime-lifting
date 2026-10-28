-- Link saved BEST to a verified SCORE, TIME or SECOND CHANCE reservation.
create or replace function public.lifting_api_best_boost_list(payload jsonb)
returns jsonb language sql stable security definer set search_path to '' as $$
 select coalesce(jsonb_object_agg(q.player_id::text,q.boost_type),'{}'::jsonb)
 from (
  select distinct on (p.id) p.id as player_id,z.boost_type
  from public.lifting_players p
  join public.lifting_score_breakdowns b on b.player_id=p.id and b.recorded_best=p.best_score
  join public.lifting_runs r on r.player_id=p.id and r.score=p.best_score and r.personal_best=true
  join public.lifting_boost_reservations z on z.run_id=r.run_id and z.player_id=p.id and z.boost_type in ('score','time','sc')
  where p.id::text in (select jsonb_array_elements_text(coalesce(payload->'playerIds','[]'::jsonb)))
  and b.base_score+b.mobile_bonus=p.best_score
  and ((z.boost_type='score' and b.mobile_bonus>0) or (z.boost_type in ('time','sc')))
  order by p.id,r.created_at desc
 ) q;
$$;
revoke all on function public.lifting_api_best_boost_list(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_best_boost_list(jsonb) to service_role;
