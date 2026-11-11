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

-- Server-time-only active season; never accept a client-supplied season key.
-- This migration is intentionally NOT applied to production until end-to-end
-- replay, login, ranking and October archive regression tests pass.
create or replace function public.lifting_api_player(p_id uuid)
returns jsonb language sql stable security definer set search_path to ''
as $fn$
with season as (
 select to_char(now() at time zone 'Asia/Tokyo','YYYY-MM') as season_key
), scores as (
 select p.id,p.display_name,p.created_at,
        coalesce(s.best_score,0) as best_score,
        s.best_kit,s.last_played_at,s.best_device,
        coalesce((select count(*)::integer*100
          from public.lifting_daily_awards a
          where a.player_id=p.id
            and a.day>=date_trunc('month',now() at time zone 'Asia/Tokyo')::date
            and a.day<(date_trunc('month',now() at time zone 'Asia/Tokyo')+interval '1 month')::date),0) as daily_bonus
 from public.lifting_players p
 cross join season k
 left join public.lifting_season_scores s on s.player_id=p.id and s.season_key=k.season_key
)
select jsonb_build_object(
 'id',p.id::text,'name',p.display_name,'best',p.best_score,
 'dailyBonus',p.daily_bonus,
 'rank',(select count(*)+1 from scores q
  where q.best_score+q.daily_bonus>p.best_score+p.daily_bonus
   or (q.best_score+q.daily_bonus=p.best_score+p.daily_bonus
       and (q.created_at,q.id)<(p.created_at,p.id))),
 'kit',p.best_kit,'lastPlayed',p.last_played_at,
 'bestDevice',case when p.best_device in ('pc','mobile') then p.best_device else null end)
from scores p where p.id=p_id
$fn$;

create or replace function public.lifting_api_leaderboard(payload jsonb)
returns jsonb language sql stable security definer set search_path to ''
as $fn$
with scores as (
 select p.id,p.created_at,coalesce(s.best_score,0) as best_score,
 coalesce((select count(*)::integer*100 from public.lifting_daily_awards a
 where a.player_id=p.id
 and a.day>=date_trunc('month',now() at time zone 'Asia/Tokyo')::date
 and a.day<(date_trunc('month',now() at time zone 'Asia/Tokyo')+interval '1 month')::date),0) as daily_bonus
 from public.lifting_players p
 left join public.lifting_season_scores s
 on s.player_id=p.id and s.season_key=to_char(now() at time zone 'Asia/Tokyo','YYYY-MM')
)
select jsonb_build_object('entries',
 coalesce(jsonb_agg(public.lifting_api_player(s.id)
 order by s.best_score+s.daily_bonus desc,s.created_at,s.id),'[]'::jsonb))
from (
 select * from scores order by best_score+daily_bonus desc,created_at,id
 limit least(greatest(coalesce(
 case when payload->>'limit' ~ '^[0-9]{1,3}$' then (payload->>'limit')::integer else null end,10),1),200)
) s
$fn$;

-- Only the database service role may execute these privileged RPCs.
-- These are internal Worker endpoints, not browser-accessible Data API methods.
revoke all on function public.lifting_api_player(uuid) from public, anon, authenticated;
revoke all on function public.lifting_api_leaderboard(jsonb) from public, anon, authenticated;
grant execute on function public.lifting_api_player(uuid) to service_role;
grant execute on function public.lifting_api_leaderboard(jsonb) to service_role;
