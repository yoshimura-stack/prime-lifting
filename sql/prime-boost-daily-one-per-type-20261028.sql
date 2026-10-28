-- DAILY BOOST: one use per type per JST calendar day.
-- Apply AFTER prime-boost-login-inventory-proposal-20261027.sql
-- and prime-boost-reservation-proposal-20261027.sql.
-- Staging first. Do NOT apply to production without explicit approval.
-- Reuses existing inventory/reservations and the existing Worker RPC contract.
-- No random draws, accumulating stock, or DAILY SLOT.
create or replace function public.lifting_boost_daily_refresh(p_player uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
 d date := (now() at time zone 'Asia/Tokyo')::date;
 v public.lifting_boost_inventory%rowtype;
begin
 perform 1 from public.lifting_players where id=p_player for update;
 if not found then raise exception 'Player not found'; end if;
 insert into public.lifting_boost_inventory(player_id,time_count,score_count,sc_count,last_grant_day)
 values(p_player,1,1,1,d)
 on conflict(player_id) do update
 set time_count=1,score_count=1,sc_count=1,last_grant_day=d,updated_at=now()
 where public.lifting_boost_inventory.last_grant_day is distinct from d;
 select * into v from public.lifting_boost_inventory where player_id=p_player;
 return jsonb_build_object('inventory',jsonb_build_object('time',v.time_count,'score',v.score_count,'sc',v.sc_count),'day',d::text);
end $$;
revoke all on function public.lifting_boost_daily_refresh(uuid) from public,anon,authenticated;
grant execute on function public.lifting_boost_daily_refresh(uuid) to service_role;

create or replace function public.lifting_api_boost_login_grant(payload jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare r jsonb;
begin
 r:=public.lifting_boost_daily_refresh((payload->>'playerId')::uuid);
 return r||jsonb_build_object('granted','daily','firstGrant',false);
end $$;

-- Inventory reads refresh the day too: users can stay logged in across midnight.
create or replace function public.lifting_api_boost_inventory(payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path to '' as $$
begin return public.lifting_boost_daily_refresh((payload->>'playerId')::uuid); end $$;

create or replace function public.lifting_api_boost_reserve(payload jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
 v_player uuid := (payload->>'playerId')::uuid;
 v_run uuid := (payload->>'runId')::uuid;
 v_type text := payload->>'boost';
 v_existing public.lifting_boost_reservations%rowtype;
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
 if v_type='time' then
  update public.lifting_boost_inventory set time_count=0,updated_at=now()
   where player_id=v_player and time_count=1;
 elsif v_type='score' then
  update public.lifting_boost_inventory set score_count=0,updated_at=now()
   where player_id=v_player and score_count=1;
 else
  update public.lifting_boost_inventory set sc_count=0,updated_at=now()
   where player_id=v_player and sc_count=1;
 end if;
 if not found then raise exception 'BOOST already used today'; end if;
 insert into public.lifting_boost_reservations(run_id,player_id,boost_type)
 values(v_run,v_player,v_type);
 return jsonb_build_object('reserved',true,'boost',v_type,'runId',v_run::text,'reused',false);
end $$;

revoke all on function public.lifting_api_boost_login_grant(jsonb),
 public.lifting_api_boost_inventory(jsonb),public.lifting_api_boost_reserve(jsonb)
 from public,anon,authenticated;
grant execute on function public.lifting_api_boost_login_grant(jsonb),
 public.lifting_api_boost_inventory(jsonb),public.lifting_api_boost_reserve(jsonb)
 to service_role;
