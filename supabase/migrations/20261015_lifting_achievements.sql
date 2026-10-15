-- V0.5.28 additive migration. Execute only after reviewing in a staging Supabase project.
-- Existing lifting_players, lifting_runs, leaderboard RPCs and historical scores are untouched.
create table if not exists public.lifting_achievements (
  player_id uuid primary key references public.lifting_players(id) on delete cascade,
  title_mask integer not null default 0 check (title_mask between 0 and 255),
  updated_at timestamptz not null default now()
);
alter table public.lifting_achievements enable row level security;
revoke all on table public.lifting_achievements from public, anon, authenticated;
grant select, insert, update on table public.lifting_achievements to service_role;

-- Called only from the Worker using the service-role credential, never from a browser.
create or replace function public.lifting_api_achievement_merge(payload jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_player uuid;
  v_mask integer;
  v_result integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  v_player := (payload->>'playerId')::uuid;
  v_mask := (payload->>'mask')::integer;
  if v_mask is null or v_mask < 0 or v_mask > 255 then
    raise exception 'invalid achievement mask' using errcode = '22023';
  end if;
  if not exists (select 1 from public.lifting_players where id = v_player) then
    raise exception 'unknown player' using errcode = '22023';
  end if;
  insert into public.lifting_achievements (player_id,title_mask)
  values (v_player,v_mask)
  on conflict (player_id) do update
  set title_mask = public.lifting_achievements.title_mask | excluded.title_mask,
      updated_at = now()
  returning title_mask into v_result;
  return jsonb_build_object('mask',v_result,'master',v_result=255);
end;
$$;
revoke all on function public.lifting_api_achievement_merge(jsonb) from public, anon, authenticated;
grant execute on function public.lifting_api_achievement_merge(jsonb) to service_role;

create or replace function public.lifting_api_achievement_get(payload jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_player uuid;
  v_mask integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  v_player := (payload->>'playerId')::uuid;
  select title_mask into v_mask from public.lifting_achievements where player_id=v_player;
  v_mask := coalesce(v_mask,0);
  return jsonb_build_object('mask',v_mask,'master',v_mask=255);
end;
$$;
revoke all on function public.lifting_api_achievement_get(jsonb) from public, anon, authenticated;
grant execute on function public.lifting_api_achievement_get(jsonb) to service_role;
