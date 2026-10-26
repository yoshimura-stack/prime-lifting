-- STAGING ONLY: WELCOME BOOST campaign. Never execute against production.
-- Atomic one-time grant per existing or newly registered player.
-- Execute only via trusted staging Worker with verified player identity.
begin;
create table if not exists public.lifting_boost_welcome_grants (
 player_id uuid not null references public.lifting_players(id) on delete cascade,
 campaign text not null,
 granted_time integer not null check (granted_time between 0 and 1),
 granted_score integer not null check (granted_score between 0 and 1),
 granted_sc integer not null check (granted_sc between 0 and 1),
 created_at timestamptz not null default now(),
 primary key (player_id,campaign)
);
alter table public.lifting_boost_welcome_grants enable row level security;
revoke all on public.lifting_boost_welcome_grants from public,anon,authenticated;
grant select,insert on public.lifting_boost_welcome_grants to service_role;
create or replace function public.lifting_api_boost_welcome_grant(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_player uuid;
 v_inventory public.lifting_boost_inventory%rowtype;
 v_existing public.lifting_boost_welcome_grants%rowtype;
 v_time integer;
 v_score integer;
 v_sc integer;
begin
 if payload is null or jsonb_typeof(payload)<>'object'
  or jsonb_typeof(payload->'playerId')<>'string'
 then raise exception 'Invalid welcome request'; end if;
 v_player:=(payload->>'playerId')::uuid;
 -- Lock parent first: serializes simultaneous logins and inventory creation.
 perform 1 from public.lifting_players where id=v_player for update;
 if not found then raise exception 'Unknown player'; end if;
 insert into public.lifting_boost_inventory(player_id) values(v_player)
 on conflict(player_id) do nothing;
 select * into strict v_inventory from public.lifting_boost_inventory
 where player_id=v_player for update;
 select * into v_existing from public.lifting_boost_welcome_grants
 where player_id=v_player and campaign='welcome-boost-v1';
 if found then
  return jsonb_build_object('alreadyGranted',true,'time',v_inventory.time_count,
   'score',v_inventory.score_count,'sc',v_inventory.sc_count);
 end if;
 v_time:=least(1,2-v_inventory.time_count);
 v_score:=least(1,2-v_inventory.score_count);
 v_sc:=least(1,2-v_inventory.sc_count);
 update public.lifting_boost_inventory
 set time_count=time_count+v_time,score_count=score_count+v_score,
 sc_count=sc_count+v_sc,updated_at=now() where player_id=v_player;
 insert into public.lifting_boost_welcome_grants(player_id,campaign,granted_time,granted_score,granted_sc)
 values(v_player,'welcome-boost-v1',v_time,v_score,v_sc);
 return jsonb_build_object('alreadyGranted',false,'granted',
  jsonb_build_object('time',v_time,'score',v_score,'sc',v_sc),
  'time',v_inventory.time_count+v_time,'score',v_inventory.score_count+v_score,
  'sc',v_inventory.sc_count+v_sc);
end $$;
revoke all on function public.lifting_api_boost_welcome_grant(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_boost_welcome_grant(jsonb) to service_role;
commit;
