-- PRIME BOOST: PREVIEW-ONLY DAILY SLOT RPC DRAFT.
-- DO NOT APPLY TO PRODUCTION. Requires schema verification and explicit approval.
-- Atomic single transaction, per-account JST-day idempotency, server-side random choice.
begin;
create or replace function public.lifting_api_boost_slot_spin(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_player uuid;
 v_day date;
 v_existing text;
 v_inventory public.lifting_boost_inventory%rowtype;
 v_eligible text[] := array[]::text[];
 v_type text;
 v_index integer;
 v_ticket double precision;
 v_weight_total integer;
begin
 if payload is null or jsonb_typeof(payload)<>'object'
    or jsonb_typeof(payload->'playerId')<>'string'
 then raise exception 'Invalid slot request'; end if;
 v_player := (payload->>'playerId')::uuid;
 -- Derive JST day on the database, not from client-controlled input.
 v_day := (transaction_timestamp() at time zone 'Asia/Tokyo')::date;
 -- Serialize concurrent requests for this player, including first-ever spin.
 perform 1 from public.lifting_players where id=v_player for update;
 if not found then raise exception 'Unknown player'; end if;
 insert into public.lifting_boost_inventory(player_id) values(v_player)
 on conflict(player_id) do nothing;
 select * into strict v_inventory from public.lifting_boost_inventory
 where player_id=v_player for update;
 select boost_type into v_existing from public.lifting_boost_slot_spins
 where player_id=v_player and jst_day=v_day;
 if found then
  return jsonb_build_object('day',v_day,'boost',v_existing,'reels',jsonb_build_array(v_existing,v_existing,v_existing),'replayed',true);
 end if;
 if v_inventory.time_count<2 then v_eligible:=array_append(v_eligible,'time'); end if;
 if v_inventory.score_count<2 then v_eligible:=array_append(v_eligible,'score'); end if;
 if v_inventory.sc_count<2 then v_eligible:=array_append(v_eligible,'sc'); end if;
 if cardinality(v_eligible)=0 then
  return jsonb_build_object('day',v_day,'boost',null,'reels',null,'allFull',true,'replayed',false);
 end if;
 -- Weighted draw: miss=40, each available BOOST=20. Full types excluded.
 -- A miss consumes the JST-day spin without granting inventory.
 v_weight_total:=40+20*cardinality(v_eligible);
 v_ticket:=random()*v_weight_total;
 v_type:='miss';
 if v_ticket>=40 then
  v_index:=1+floor((v_ticket-40)/20)::integer;
  v_type:=v_eligible[v_index];
 end if;
 if v_type<>'miss' then
 update public.lifting_boost_inventory
 set time_count=time_count+case when v_type='time' then 1 else 0 end,
     score_count=score_count+case when v_type='score' then 1 else 0 end,
     sc_count=sc_count+case when v_type='sc' then 1 else 0 end,
     updated_at=now()
 where player_id=v_player;
 end if;
 insert into public.lifting_boost_slot_spins(player_id,jst_day,boost_type)
 values(v_player,v_day,v_type);
 return jsonb_build_object('day',v_day,'boost',v_type,'reels',jsonb_build_array(v_type,v_type,v_type),'replayed',false);
end $$;
revoke all on function public.lifting_api_boost_slot_spin(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_boost_slot_spin(jsonb) to service_role;
commit;
