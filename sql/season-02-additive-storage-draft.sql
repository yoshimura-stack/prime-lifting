-- PRIME LIFTING LAB / Season 02: additive storage ONLY
-- REVIEW BEFORE APPLYING. Not executed against production.
-- Does not alter lifting_players, lifting_runs, PINs or October archive.
create table if not exists public.lifting_season_scores (
 season_key text not null,
 player_id uuid not null references public.lifting_players(id) on delete restrict,
 best_score integer not null default 0 check (best_score >= 0 and best_score <= 100000000),
 best_device text check (best_device in ('pc','mobile')),
 best_kit text,
 base_score integer not null default 0 check (base_score >= 0),
 boost_bonus integer not null default 0 check (boost_bonus >= 0),
 best_boost text check (best_boost in ('time','score','sc')),
 last_played_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key (season_key, player_id),
 constraint lifting_season_scores_key_format check (season_key ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
 constraint lifting_season_scores_breakdown check (base_score + boost_bonus = best_score)
);
create index if not exists lifting_season_scores_rank_idx
 on public.lifting_season_scores(season_key, best_score desc, player_id);
alter table public.lifting_season_scores enable row level security;
revoke all on public.lifting_season_scores from public, anon, authenticated;
-- No write function or API enabled yet. Existing production RPCs are unchanged.
-- Next migration must atomically bind a replay-verified run_id to a server-derived
-- JST season and update this table, while retaining lifting_runs idempotency.
