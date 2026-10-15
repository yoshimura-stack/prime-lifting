-- V0.5.23: expose the device of each player's personal best.
-- No existing scores or device values are changed.
-- Run in the Supabase SQL Editor for the PRIME LIFTING production project.
create or replace function public.lifting_api_player(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
  'id',p.id::text,'name',p.display_name,'best',p.best_score,
  'rank',(select count(*)+1 from public.lifting_players q where q.best_score>p.best_score or (q.best_score=p.best_score and (q.created_at,q.id) < (p.created_at,p.id))),
  'kit',p.best_kit,'lastPlayed',p.last_played_at,
  'bestDevice',case when p.best_device in ('pc','mobile') then p.best_device else null end
 ) from public.lifting_players p where p.id=p_id;
$$;
revoke all on function public.lifting_api_player(uuid) from public,anon,authenticated;
grant execute on function public.lifting_api_player(uuid) to service_role;
