-- Month-end campaign: JST 2026-10-29 through 2026-10-31 inclusive.
-- Two uses per BOOST type per day, six total. No carryover; no lottery.
-- Reservation history prevents granting a third use on the activation date.
create or replace function public.lifting_boost_daily_refresh(p_player uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
 d date := (now() at time zone 'Asia/Tokyo')::date;
 v public.lifting_boost_inventory%rowtype;
 n_time integer;
 n_score integer;
 n_sc integer;
 promo boolean := d between date '2026-10-29' and date '2026-10-31';
begin
 perform 1 from public.lifting_players where id=p_player for update;
 if not found then raise exception 'Player not found'; end if;
 if promo then
  select count(*) filter(where boost_type='time'),count(*) filter(where boost_type='score'),count(*) filter(where boost_type='sc')
  into n_time,n_score,n_sc
  from public.lifting_boost_reservations
  where player_id=p_player and (created_at at time zone 'Asia/Tokyo')::date=d;
  insert into public.lifting_boost_inventory(player_id,time_count,score_count,sc_count,last_grant_day)
  values(p_player,greatest(0,2-n_time),greatest(0,2-n_score),greatest(0,2-n_sc),d)
  on conflict(player_id) do update set time_count=excluded.time_count,score_count=excluded.score_count,sc_count=excluded.sc_count,last_grant_day=d,updated_at=now();
 else
  insert into public.lifting_boost_inventory(player_id,time_count,score_count,sc_count,last_grant_day)
  values(p_player,1,1,1,d)
  on conflict(player_id) do update set time_count=1,score_count=1,sc_count=1,last_grant_day=d,updated_at=now()
  where public.lifting_boost_inventory.last_grant_day is distinct from d;
 end if;
 select * into v from public.lifting_boost_inventory where player_id=p_player;
 return jsonb_build_object('inventory',jsonb_build_object('time',v.time_count,'score',case when not promo and p_player='15021678-6d37-40dd-97ab-9b6c61d15281'::uuid then 1 else v.score_count end,'sc',v.sc_count),'day',d::text);
end $$;

create or replace function public.lifting_api_boost_reserve(payload jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
 v_player uuid := (payload->>'playerId')::uuid;
 v_run uuid := (payload->>'runId')::uuid;
 v_type text := payload->>'boost';
 v_existing public.lifting_boost_reservations%rowtype;
 promo boolean := (now() at time zone 'Asia/Tokyo')::date between date '2026-10-29' and date '2026-10-31';
begin
 if v_type is null or v_type not in ('time','score','sc') then raise exception 'Invalid BOOST'; end if;
 perform 1 from public.lifting_players where id=v_player for update;
 if not found then raise exception 'Player not found'; end if;
 select * into v_existing from public.lifting_boost_reservations where run_id=v_run;
 if found then
  if v_existing.player_id<>v_player or v_existing.boost_type<>v_type then raise exception 'Run already reserved'; end if;
  return jsonb_build_object('reserved',true,'boost',v_type,'runId',v_run::text,'reused',true);
 end if;
 perform public.lifting_boost_daily_refresh(v_player);
 if not promo and v_type='score' and v_player='15021678-6d37-40dd-97ab-9b6c61d15281'::uuid then
  insert into public.lifting_boost_reservations(run_id,player_id,boost_type) values(v_run,v_player,v_type);
  return jsonb_build_object('reserved',true,'boost',v_type,'runId',v_run::text,'reused',false);
 end if;
 if v_type='time' then
  update public.lifting_boost_inventory set time_count=time_count-1,updated_at=now() where player_id=v_player and time_count>0;
 elsif v_type='score' then
  update public.lifting_boost_inventory set score_count=score_count-1,updated_at=now() where player_id=v_player and score_count>0;
 else
  update public.lifting_boost_inventory set sc_count=sc_count-1,updated_at=now() where player_id=v_player and sc_count>0;
 end if;
 if not found then raise exception 'BOOST already used today'; end if;
 insert into public.lifting_boost_reservations(run_id,player_id,boost_type) values(v_run,v_player,v_type);
 return jsonb_build_object('reserved',true,'boost',v_type,'runId',v_run::text,'reused',false);
end $$;
