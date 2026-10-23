-- STAGING PROJECT ONLY: atomic verified run receipt + isolated shadow ranking.
-- Do not deploy this harness-backed RPC to production. A production-compatible
-- player/achievement/daily persistence migration is still required.
create or replace function public.lifting_api_submit_boost_atomic(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_player uuid; v_run uuid; v_boost text; v_base bigint; v_bonus bigint; v_total bigint;
 v_reserved record; v_existing public.lifting_boost_verified_receipts%rowtype;
 v_rank jsonb; v_replayed boolean:=false; v_personal boolean:=false;
begin
 if payload is null or jsonb_typeof(payload)<>'object'
 or jsonb_typeof(payload->'playerId')<>'string'
 or jsonb_typeof(payload->'runId')<>'string'
 or jsonb_typeof(payload->'baseScore')<>'number'
 or jsonb_typeof(payload->'boostBonus')<>'number'
 or jsonb_typeof(payload->'playScore')<>'number'
 or (payload ? 'boost' and jsonb_typeof(payload->'boost') not in ('null','string'))
 then raise exception 'Invalid atomic submit'; end if;
 v_player:=(payload->>'playerId')::uuid;
 v_run:=(payload->>'runId')::uuid;
 v_boost:=payload->>'boost';
 if v_boost is not null and v_boost not in ('time','score','sc') then raise exception 'Invalid BOOST'; end if;
 v_base:=(payload->>'baseScore')::bigint;
 v_bonus:=(payload->>'boostBonus')::bigint;
 v_total:=(payload->>'playScore')::bigint;
 if v_base<0 or v_bonus<0 or v_total<0 or v_total>100000000
 or v_base+v_bonus<>v_total
 or (v_boost is distinct from 'score' and v_bonus<>0)
 or (v_boost='score' and v_total<>pg_catalog.round(v_base::numeric*1.1)::bigint)
 then raise exception 'Invalid verified score'; end if;
 -- All calls are server-authenticated and serialized by player.
 perform 1 from public.lifting_players where id=v_player for update;
 if not found then raise exception 'Unknown player'; end if;
 select * into v_existing from public.lifting_boost_verified_receipts where run_id=v_run;
 if found then
  if v_existing.player_id<>v_player or v_existing.boost_type is distinct from v_boost
   or v_existing.base_score<>v_base or v_existing.boost_bonus<>v_bonus
   or v_existing.play_score<>v_total then raise exception 'Run receipt conflict'; end if;
  v_replayed:=true;
 else
  if v_boost is null then
   if not exists(select 1 from public.lifting_boost_none_run_starts where run_id=v_run and player_id=v_player)
   or exists(select 1 from public.lifting_boost_run_uses where run_id=v_run)
   then raise exception 'Normal run reservation missing or conflicting'; end if;
  else
   select player_id,boost_type into v_reserved from public.lifting_boost_run_uses where run_id=v_run;
   if not found or v_reserved.player_id<>v_player or v_reserved.boost_type<>v_boost
   or exists(select 1 from public.lifting_boost_none_run_starts where run_id=v_run)
   then raise exception 'BOOST reservation missing or conflicting'; end if;
  end if;
 end if;
 insert into boost_shadow_test.players(id) values(v_player) on conflict(id) do nothing;
 -- This shadow transaction must succeed BEFORE the receipt is committed.
 v_rank:=boost_shadow_test.submit_verified(v_player,v_run,v_total,v_boost,v_base,v_bonus);
 if not v_replayed then
  insert into public.lifting_boost_verified_receipts(run_id,player_id,boost_type,base_score,boost_bonus,play_score)
  values(v_run,v_player,v_boost,v_base,v_bonus,v_total);
 end if;
 v_personal:=coalesce((v_rank->>'personalBest')::boolean,false);
 return pg_catalog.jsonb_build_object('runId',v_run,'playScore',v_total,'replayed',v_replayed,'personalBest',v_personal);
end $$;
revoke all on function public.lifting_api_submit_boost_atomic(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_submit_boost_atomic(jsonb) to service_role;
