-- PRIME BOOST STAGING DRAFT ONLY — DO NOT APPLY TO PRODUCTION
-- Requires isolated preview DB and explicit approval.
-- Assumes lifting_players(id) is UUID; verify schema before executing.
begin;
create table if not exists public.lifting_boost_inventory (
 player_id uuid primary key references public.lifting_players(id) on delete cascade,
 time_count integer not null default 0 check (time_count between 0 and 2),
 score_count integer not null default 0 check (score_count between 0 and 2),
 sc_count integer not null default 0 check (sc_count between 0 and 2),
 updated_at timestamptz not null default now()
);
create table if not exists public.lifting_boost_run_uses (
 run_id uuid primary key,
 player_id uuid not null references public.lifting_players(id) on delete cascade,
 boost_type text not null check (boost_type in ('time','score','sc')),
 created_at timestamptz not null default now()
);
create index if not exists lifting_boost_run_uses_player_idx on public.lifting_boost_run_uses(player_id);
create table if not exists public.lifting_boost_slot_spins (
 player_id uuid not null references public.lifting_players(id) on delete cascade,
 jst_day date not null,
 boost_type text not null check (boost_type in ('time','score','sc')),
 created_at timestamptz not null default now(),
 primary key(player_id,jst_day)
);
alter table public.lifting_boost_inventory enable row level security;
alter table public.lifting_boost_run_uses enable row level security;
alter table public.lifting_boost_slot_spins enable row level security;
-- No client policies. Privileged RPC only, after verification.
commit;
