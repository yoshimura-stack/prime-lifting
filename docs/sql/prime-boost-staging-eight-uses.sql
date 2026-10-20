-- Staging-only BOOST daily-use regression. NEVER apply to production.
-- The stock is artificially refilled between reservations to test absence of a daily-use cap.
begin;
do $$
declare
 p uuid:='e1000000-0000-4000-8000-000000000091';
 i integer;
 r jsonb;
 n integer;
begin
 insert into public.lifting_players(id) values(p);
 insert into public.lifting_boost_inventory(player_id,time_count,score_count,sc_count) values(p,2,2,2);
 for i in 1..8 loop
  r:=public.lifting_api_boost_reserve(jsonb_build_object(
   'playerId',p,
   'runId',('e2000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
   'boost','time'));
  if (r->>'replayed')::boolean or (r->>'remaining')::integer<>1 then
   raise exception 'Reservation % failed: %',i,r;
  end if;
  -- Test-only simulated stock replenishment; not a gameplay endpoint.
  update public.lifting_boost_inventory set time_count=2 where player_id=p;
 end loop;
 select count(*) into n from public.lifting_boost_run_uses where player_id=p;
 if n<>8 then raise exception 'Expected 8 unique runs, got %',n; end if;
 raise notice 'PASS: eight reservations with simulated replenishment';
end $$;
select 'PASS: 8 same-day BOOST reservations; all changes rolled back' as result;
rollback;
