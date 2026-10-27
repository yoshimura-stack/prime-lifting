-- STAGING DESIGN ONLY. DO NOT EXECUTE ON PRODUCTION.
-- Replacement for the daily slot: automatic, no-miss, login-triggered grant.
-- Requires existing staging lifting_players, lifting_boost_inventory and
-- lifting_boost_welcome_grants. Apply only after staging schema review.
-- On first login call lifting_api_boost_welcome_grant first; only call this
-- function on subsequent logins. The welcome day must not receive a daily grant.
begin;
create table if not exists public.lifting_boost_daily_login_grants (
 player_id uuid not null references public.lifting_players(id) on delete cascade,
 jst_day date not null,
 boost_type text not null check (boost_type in ('time','score','sc','full')),
 granted_at timestamptz not null default now(),
 primary key(player_id,jst_day)
);
alter table public.lifting_boost_daily_login_grants enable row level security;
revoke all on public.lifting_boost_daily_login_grants from public,anon,authenticated;
grant select,insert on public.lifting_boost_daily_login_grants to service_role;

create or replace function public.lifting_api_boost_daily_login_grant(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_player uuid;
 v_day date := (transaction_timestamp() at time zone 'Asia/Tokyo')::date;
 v_welcome_day date;
 v_prior text;
 v_stock public.lifting_boost_inventory%rowtype;
 v_eligible text[] := array[]::text[];
 v_choice text;
begin
 if payload is null or jsonb_typeof(payload)<>'object'
    or jsonb_typeof(payload->'playerId')<>'string'
 then raise exception 'Invalid daily login grant request'; end if;
 v_player := (payload->>'playerId')::uuid;
 -- Lock parent before all other reads/writes to serialize concurrent logins.
 perform 1 from public.lifting_players where id=v_player for update;
 if not found then raise exception 'Unknown player'; end if;
 select (granted_at at time zone 'Asia/Tokyo')::date into v_welcome_day
 from public.lifting_boost_welcome_grants where player_id=v_player;
 if v_welcome_day is null then
  raise exception 'Welcome grant required before daily grant';
 end if;
 if v_welcome_day >= v_day then
  return jsonb_build_object('day',v_day,'boost',null,'welcomeDay',true,'replayed',true);
 end if;
 select boost_type into v_prior from public.lifting_boost_daily_login_grants
 where player_id=v_player and jst_day=v_day;
 if found then
  return jsonb_build_object('day',v_day,'boost',nullif(v_prior,'full'),
   'allFull',v_prior='full','replayed',true);
 end if;
 insert into public.lifting_boost_inventory(player_id) values(v_player)
 on conflict(player_id) do nothing;
 select * into strict v_stock from public.lifting_boost_inventory
 where player_id=v_player for update;
 if v_stock.time_count<2 then v_eligible:=array_append(v_eligible,'time'); end if;
 if v_stock.score_count<2 then v_eligible:=array_append(v_eligible,'score'); end if;
 if v_stock.sc_count<2 then v_eligible:=array_append(v_eligible,'sc'); end if;
 if cardinality(v_eligible)=0 then
  v_choice:='full';
 else
  v_choice:=v_eligible[1+floor(random()*cardinality(v_eligible))::integer];
  update public.lifting_boost_inventory
  set time_count=time_count+(v_choice='time')::integer,
      score_count=score_count+(v_choice='score')::integer,
      sc_count=sc_count+(v_choice='sc')::integer,
      updated_at=now() where player_id=v_player;
 end if;
 insert into public.lifting_boost_daily_login_grants(player_id,jst_day,boost_type)
 values(v_player,v_day,v_choice);
 return jsonb_build_object('day',v_day,'boost',nullif(v_choice,'full'),
  'allFull',v_choice='full','replayed',false);
end $$;
revoke all on function public.lifting_api_boost_daily_login_grant(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_boost_daily_login_grant(jsonb) to service_role;
commit;
