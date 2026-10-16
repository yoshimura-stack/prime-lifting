-- REVIEW ONLY. October daily achievements, with no PRIME COIN issuance.
-- Requires public.lifting_daily_completions from the additive schema migration.
-- The Worker must derive completedIds from the verified replay, never browser input.
create or replace function public.lifting_api_daily_complete(payload jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 v_player uuid := (payload->>'playerId')::uuid;
 v_run uuid := (payload->>'runId')::uuid;
 v_day date;
 v_ids jsonb := payload->'completedIds';
 v_id text;
 v_count int := 0;
 v_total int;
begin
 if v_player is null or v_run is null or jsonb_typeof(v_ids)<>'array'
    or jsonb_array_length(v_ids)>3 then raise exception 'Invalid completion request'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_player::text,71933));
 select (created_at at time zone 'Asia/Tokyo')::date into v_day
 from public.lifting_runs where run_id=v_run and player_id=v_player;
 if not found then raise exception 'Run not accepted'; end if;
 -- A run is bound to its own JST calendar day, not the retry timestamp.
 for v_id in select value #>> '{}' from jsonb_array_elements(v_ids) loop
   if v_id !~ '^[a-z0-9]{3,40}$' then raise exception 'Invalid mission id'; end if;
   insert into public.lifting_daily_completions(player_id,day_jst,mission_id)
   values(v_player,v_day,v_id) on conflict do nothing;
   if found then v_count:=v_count+1; end if;
 end loop;
 select count(*)::int*100 into v_total from public.lifting_daily_completions
 where player_id=v_player and day_jst>=date_trunc('month',v_day::timestamp)::date
   and day_jst<(date_trunc('month',v_day::timestamp)+interval '1 month')::date;
 return jsonb_build_object('day',v_day,'newMissions',v_count,'monthlyBonus',v_total);
end $$;
revoke all on function public.lifting_api_daily_complete(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_daily_complete(jsonb) to service_role;
