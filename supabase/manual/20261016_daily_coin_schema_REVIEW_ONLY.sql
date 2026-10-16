-- REVIEW-ONLY MIGRATION: do not apply until Worker integration and tests are ready.
-- PRIME LIFTING LAB: additive tables; no existing player, score, title or run rows changed.
create table if not exists public.lifting_daily_completions (
 player_id uuid not null references public.lifting_players(id) on delete cascade,
 day_jst date not null,
 mission_id text not null,
 completed_at timestamptz not null default now(),
 primary key(player_id,day_jst,mission_id),
 constraint daily_mission_id_format check (mission_id ~ '^[a-z0-9]{3,40}$')
);
create index if not exists lifting_daily_completions_day_idx
 on public.lifting_daily_completions(day_jst,player_id);

create table if not exists public.lifting_coin_wallets (
 player_id uuid primary key references public.lifting_players(id) on delete cascade,
 balance bigint not null default 0 check(balance>=0),
 updated_at timestamptz not null default now()
);
create table if not exists public.lifting_coin_ledger (
 id bigint generated always as identity primary key,
 player_id uuid not null references public.lifting_players(id) on delete cascade,
 run_id uuid unique references public.lifting_runs(run_id),
 day_jst date not null,
 amount integer not null check(amount between 0 and 2000),
 reason text not null check(reason in ('play','purchase')),
 created_at timestamptz not null default now(),
 constraint lifting_coin_ledger_run_reason check ((reason='play' and run_id is not null and amount>0) or (reason='purchase' and run_id is null))
);
create index if not exists lifting_coin_ledger_daily_idx
 on public.lifting_coin_ledger(player_id,day_jst,reason);

-- Do not expose wallet or completion writes directly to browsers.
alter table public.lifting_daily_completions enable row level security;
alter table public.lifting_coin_wallets enable row level security;
alter table public.lifting_coin_ledger enable row level security;
revoke all on public.lifting_daily_completions,public.lifting_coin_wallets,public.lifting_coin_ledger from anon,authenticated;
revoke all on sequence public.lifting_coin_ledger_id_seq from anon,authenticated;

-- All awards must be issued by a privileged server function AFTER an accepted, verified run.
-- Future integration must atomically lock the wallet row, enforce daily 2,000 cap,
-- insert the run receipt exactly once, and insert each (day,mission) only once.
-- Never award from a browser-provided score or unverified mission claims.
