-- BOOST staging regression test: run ONLY on isolated prime-boost-staging.
-- This is a sequential transactional test, NOT a concurrent-connection race test.
-- Test records are rolled back on success and failure.
begin;
insert into public.lifting_players(id) values
 ('123e4567-e89b-42d3-a456-426614174151'),
 ('123e4567-e89b-42d3-a456-426614174152');
insert into public.lifting_boost_inventory(player_id,time_count,score_count,sc_count)
 values ('123e4567-e89b-42d3-a456-426614174151',2,2,2);
do $$
declare
 player constant uuid := '123e4567-e89b-42d3-a456-426614174151';
 other_player constant uuid := '123e4567-e89b-42d3-a456-426614174152';
 run constant uuid := '123e4567-e89b-42d3-a456-426614174251';
 first jsonb;
 retry jsonb;
 slot jsonb;
 stock integer;
 records integer;
 rejected boolean;
begin
 slot:=public.lifting_api_boost_slot_spin(jsonb_build_object('playerId',player));
 if slot->>'allFull' <> 'true' then raise exception 'full stock should skip'; end if;
 select count(*) into records from public.lifting_boost_slot_spins where player_id=player;
 if records<>0 then raise exception 'skip should not mark day used'; end if;

 first:=public.lifting_api_boost_reserve(jsonb_build_object('playerId',player,'runId',run,'boost','time'));
 retry:=public.lifting_api_boost_reserve(jsonb_build_object('playerId',player,'runId',run,'boost','time'));
 if first->>'replayed'<>'false' or retry->>'replayed'<>'true' then
  raise exception 'reservation idempotency failed';
 end if;
 select time_count into stock from public.lifting_boost_inventory where player_id=player;
 select count(*) into records from public.lifting_boost_run_uses where run_id=run;
 if stock<>1 or records<>1 then raise exception 'double reservation consumed twice'; end if;

 rejected:=false;
 begin
  perform public.lifting_api_boost_reserve(jsonb_build_object('playerId',other_player,'runId',run,'boost','time'));
 exception when others then rejected:=true; end;
 if not rejected then raise exception 'cross-player run collision accepted'; end if;

 rejected:=false;
 begin
  perform public.lifting_api_boost_reserve(jsonb_build_object('playerId',player,'runId',run,'boost','score'));
 exception when others then rejected:=true; end;
 if not rejected then raise exception 'cross-type run collision accepted'; end if;

 slot:=public.lifting_api_boost_slot_spin(jsonb_build_object('playerId',player));
 if slot->>'boost'<>'time' or slot->>'replayed'<>'false' then
  raise exception 'eligible type not awarded';
 end if;
 retry:=public.lifting_api_boost_slot_spin(jsonb_build_object('playerId',player));
 if retry->>'replayed'<>'true' or retry->>'boost'<>'time' then
  raise exception 'slot idempotency failed';
 end if;
 select time_count into stock from public.lifting_boost_inventory where player_id=player;
 select count(*) into records from public.lifting_boost_slot_spins where player_id=player;
 if stock<>2 or records<>1 then raise exception 'slot double awarded'; end if;
end $$;
select 'PASS: staging BOOST sequential regression assertions' as result;
rollback;
