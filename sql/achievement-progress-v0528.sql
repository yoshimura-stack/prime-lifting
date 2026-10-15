-- PRIME / LIFTING LAB V0.5.28
-- Apply in Supabase SQL Editor only after reviewing against the production schema.
-- Additive migration: never deletes or modifies lifting_players/lifting_runs.
-- Requires public.lifting_players(id uuid primary key or unique).
begin;

create table if not exists public.lifting_achievement_progress (
 player_id uuid primary key references public.lifting_players(id) on delete cascade,
 mask integer not null default 0 check (mask between 0 and 255),
 updated_at timestamptz not null default now()
);

alter table public.lifting_achievement_progress enable row level security;
revoke all on public.lifting_achievement_progress from public, anon, authenticated;
grant select, insert, update on public.lifting_achievement_progress to service_role;

-- API calls use a privileged Worker-only key. Never expose this key in the browser.
create or replace function public.lifting_api_achievement_get(payload jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
 v_id uuid;
 v_mask integer;
begin
 v_id := (payload->>'playerId')::uuid;
 if not exists(select 1 from public.lifting_players where id=v_id) then
  raise exception 'Unknown player';
 end if;
 select mask into v_mask from public.lifting_achievement_progress where player_id=v_id;
 return jsonb_build_object('mask',coalesce(v_mask,0));
end;
$$;

create or replace function public.lifting_api_achievement_merge(payload jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
 v_id uuid;
 v_mask integer;
 v_saved integer;
begin
 v_id := (payload->>'playerId')::uuid;
 v_mask := (payload->>'mask')::integer;
 if v_mask is null or v_mask < 0 or v_mask > 255 then
  raise exception 'Invalid title mask';
 end if;
 -- Atomic OR: concurrent saves cannot overwrite previously unlocked titles.
 insert into public.lifting_achievement_progress(player_id,mask)
 values(v_id,v_mask)
 on conflict(player_id) do update
 set mask=public.lifting_achievement_progress.mask | excluded.mask,
     updated_at=now()
 returning mask into v_saved;
 return jsonb_build_object('mask',v_saved);
end;
$$;

revoke all on function public.lifting_api_achievement_get(jsonb) from public, anon, authenticated;
revoke all on function public.lifting_api_achievement_merge(jsonb) from public, anon, authenticated;
grant execute on function public.lifting_api_achievement_get(jsonb) to service_role;
grant execute on function public.lifting_api_achievement_merge(jsonb) to service_role;
commit;

-- Post-migration verification (read-only):
-- select count(*) from public.lifting_achievement_progress;
-- select proname,prosecdef from pg_proc where proname in
-- ('lifting_api_achievement_get','lifting_api_achievement_merge');
