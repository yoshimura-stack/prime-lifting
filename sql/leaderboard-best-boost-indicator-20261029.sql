-- Return SCORE BOOST only when a verified saved BEST has a matching reservation.
create or replace function public.lifting_api_best_boost_list(payload jsonb)
returns jsonb language sql stable security definer set search_path to '' as $$
 select coalesce(jsonb_object_agg(p.id::text,'score'), '{}'::jsonb)
 from public.lifting_players p
 join public.lifting_score_breakdowns b on b.player_id=p.id and b.recorded_best=p.best_score
 join public.lifting_runs r on r.player_id=p.id and r.score=p.best_score and r.personal_best=true
 join public.lifting_boost_reservations z on z.run_id=r.run_id and z.player_id=p.id and z.boost_type='score'
 where p.id::text in (select jsonb_array_elements_text(coalesce(payload->'playerIds','[]'::jsonb)))
 and b.mobile_bonus>0 and b.base_score+b.mobile_bonus=p.best_score;
$$;
revoke all on function public.lifting_api_best_boost_list(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_best_boost_list(jsonb) to service_role;
