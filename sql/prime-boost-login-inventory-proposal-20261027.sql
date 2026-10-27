-- PRIME BOOST inventory and authenticated-login rewards.
-- PROPOSED ONLY: committed to feature branch; NOT applied to production.
-- Only the existing trusted Cloudflare Worker may invoke these service_role RPCs.
create table if not exists public.lifting_boost_inventory (
  player_id uuid primary key references public.lifting_players(id) on delete cascade,
  time_count smallint not null default 0 check (time_count between 0 and 2),
  score_count smallint not null default 0 check (score_count between 0 and 2),
  sc_count smallint not null default 0 check (sc_count between 0 and 2),
  last_grant_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lifting_boost_inventory enable row level security;
revoke all on public.lifting_boost_inventory from public, anon, authenticated;
grant select, insert, update on public.lifting_boost_inventory to service_role;

create or replace function public.lifting_api_boost_login_grant(payload jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_player uuid := (payload->>'playerId')::uuid;
  v_day date := (now() at time zone 'Asia/Tokyo')::date;
  v_inv public.lifting_boost_inventory%rowtype;
  v_choices text[] := array[]::text[];
  v_chosen text;
  v_first boolean := false;
begin
  -- Serialize competing login requests for this player; no client-provided day or RNG.
  perform 1 from public.lifting_players where id=v_player for update;
  if not found then raise exception 'Player not found'; end if;

  insert into public.lifting_boost_inventory(player_id,time_count,score_count,sc_count,last_grant_day)
  values(v_player,1,1,1,v_day)
  on conflict (player_id) do nothing;
  if found then
    v_first:=true;
  end if;

  select * into v_inv from public.lifting_boost_inventory where player_id=v_player for update;
  if not v_first and (v_inv.last_grant_day is null or v_inv.last_grant_day<v_day) then
    if v_inv.time_count<2 then v_choices:=array_append(v_choices,'time');end if;
    if v_inv.score_count<2 then v_choices:=array_append(v_choices,'score');end if;
    if v_inv.sc_count<2 then v_choices:=array_append(v_choices,'sc');end if;
    if array_length(v_choices,1)>0 then
      v_chosen:=v_choices[1+floor(random()*array_length(v_choices,1))::int];
      update public.lifting_boost_inventory set
        time_count=time_count+case when v_chosen='time' then 1 else 0 end,
        score_count=score_count+case when v_chosen='score' then 1 else 0 end,
        sc_count=sc_count+case when v_chosen='sc' then 1 else 0 end,
        last_grant_day=v_day,updated_at=now()
      where player_id=v_player;
    else
      -- All types are full: record today's login without exceeding stock caps.
      update public.lifting_boost_inventory
      set last_grant_day=v_day,updated_at=now() where player_id=v_player;
    end if;
  end if;

  select * into v_inv from public.lifting_boost_inventory where player_id=v_player;
  return jsonb_build_object(
    'inventory',jsonb_build_object('time',v_inv.time_count,'score',v_inv.score_count,'sc',v_inv.sc_count),
    'firstGrant',v_first,'granted',case when v_first then 'welcome' else v_chosen end,
    'day',v_day::text
  );
end $$;

create or replace function public.lifting_api_boost_inventory(payload jsonb)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_player uuid := (payload->>'playerId')::uuid;
begin
  if not exists(select 1 from public.lifting_players where id=v_player) then raise exception 'Player not found';end if;
  return coalesce((
    select jsonb_build_object('inventory',jsonb_build_object('time',time_count,'score',score_count,'sc',sc_count))
    from public.lifting_boost_inventory where player_id=v_player
  ),jsonb_build_object('inventory',jsonb_build_object('time',0,'score',0,'sc',0)));
end $$;

revoke all on function public.lifting_api_boost_login_grant(jsonb) from public,anon,authenticated;
revoke all on function public.lifting_api_boost_inventory(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_boost_login_grant(jsonb) to service_role;
grant execute on function public.lifting_api_boost_inventory(jsonb) to service_role;
