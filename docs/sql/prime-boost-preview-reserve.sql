-- PREVIEW-ONLY DRAFT: apply only after verifying the preview schema and approval.
-- Call via Cloudflare Worker with service_role; never expose service_role to browsers.
begin;
create or replace function public.lifting_api_boost_reserve(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
 v_player uuid;
 v_run uuid;
 v_type text;
 v_previous record;
 v_remaining integer;
begin
 if payload is null or jsonb_typeof(payload) <> 'object'
    or payload ? 'boosts'
    or jsonb_typeof(payload->'boost') <> 'string'
    or (payload->>'boost') not in ('time','score','sc')
    or jsonb_typeof(payload->'playerId') <> 'string'
    or jsonb_typeof(payload->'runId') <> 'string'
 then raise exception 'Invalid BOOST reservation'; end if;
 v_player := (payload->>'playerId')::uuid;
 v_run := (payload->>'runId')::uuid;
 v_type := payload->>'boost';
 -- Ensure the parent row exists, and serialize first-time inventory initialization.
 perform 1 from public.lifting_players where id=v_player for update;
 if not found then raise exception 'Unknown player'; end if;
 insert into public.lifting_boost_inventory(player_id) values(v_player)
 on conflict(player_id) do nothing;
 perform 1 from public.lifting_boost_inventory where player_id=v_player for update;
 -- Idempotent retry: same run and same player/type returns without another decrement.
 select player_id,boost_type into v_previous
 from public.lifting_boost_run_uses where run_id=v_run;
 if found then
  if v_previous.player_id<>v_player or v_previous.boost_type<>v_type
  then raise exception 'Run BOOST conflict'; end if;
  return jsonb_build_object('boost',v_type,'replayed',true);
 end if;
 if v_type='time' then
  update public.lifting_boost_inventory set time_count=time_count-1,updated_at=now()
  where player_id=v_player and time_count>0 returning time_count into v_remaining;
 elsif v_type='score' then
  update public.lifting_boost_inventory set score_count=score_count-1,updated_at=now()
  where player_id=v_player and score_count>0 returning score_count into v_remaining;
 else
  update public.lifting_boost_inventory set sc_count=sc_count-1,updated_at=now()
  where player_id=v_player and sc_count>0 returning sc_count into v_remaining;
 end if;
 if not found then raise exception 'BOOST inventory exhausted'; end if;
 insert into public.lifting_boost_run_uses(run_id,player_id,boost_type)
 values(v_run,v_player,v_type);
 return jsonb_build_object('boost',v_type,'remaining',v_remaining,'replayed',false);
end $$;
revoke all on function public.lifting_api_boost_reserve(jsonb) from public, anon, authenticated;
grant execute on function public.lifting_api_boost_reserve(jsonb) to service_role;
commit;
