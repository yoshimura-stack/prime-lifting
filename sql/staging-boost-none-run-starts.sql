-- STAGING ONLY: register official unboosted run starts.
create table if not exists public.lifting_boost_none_run_starts (
 run_id uuid primary key,
 player_id uuid not null references public.lifting_players(id),
 created_at timestamptz not null default now()
);
alter table public.lifting_boost_none_run_starts enable row level security;
revoke all on public.lifting_boost_none_run_starts from public,anon,authenticated;
grant select,insert on public.lifting_boost_none_run_starts to service_role;
