-- STAGING DRAFT ONLY. DO NOT APPLY TO PRODUCTION OR STAGING UNTIL REVIEWED.
-- These read-only RPCs match server/boost-ranking-reader.mjs. No existing leaderboard RPC is replaced.
-- PREREQUISITE: A trusted, atomic submit path must update best_run_id alongside lifting_players.best.
-- Never infer a best run from a matching score; historical rows intentionally have no pointer.
-- This draft creates isolated tables but does NOT implement the atomic submit path.
begin;
create table if not exists public.lifting_boost_verified_receipts (
 run_id uuid primary key,
 player_id uuid not null references public.lifting_players(id) on delete cascade,
 boost_type text not null check(boost_type in ('time','score','sc')),
 base_score bigint not null check(base_score>=0),
 boost_bonus bigint not null check(boost_bonus>=0),
 play_score bigint not null check(play_score>=0),
 created_at timestamptz not null default now(),
 constraint boost_receipt_sum check(base_score+boost_bonus=play_score),
 constraint boost_receipt_type check((boost_type='score') or boost_bonus=0)
);
create index if not exists lifting_boost_receipts_player_idx on public.lifting_boost_verified_receipts(player_id);
create table if not exists public.lifting_boost_best_run_refs (
 player_id uuid primary key references public.lifting_players(id) on delete cascade,
 best_run_id uuid not null,
 best_score bigint not null check(best_score>=0),
 updated_at timestamptz not null default now()
);
-- Keep these internal. No policies for client roles.
alter table public.lifting_boost_verified_receipts enable row level security;
alter table public.lifting_boost_best_run_refs enable row level security;
revoke all on public.lifting_boost_verified_receipts from public,anon,authenticated;
revoke all on public.lifting_boost_best_run_refs from public,anon,authenticated;
grant select,insert,update on public.lifting_boost_verified_receipts to service_role;
grant select,insert,update on public.lifting_boost_best_run_refs to service_role;
-- JSON payload shape: {"playerIds":[uuid,...]}. No public client execution.
create or replace function public.lifting_api_boost_best_run_lookup(payload jsonb)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(r.player_id::text,jsonb_build_object('bestRunId',r.best_run_id,'bestScore',r.best_score)),'{}'::jsonb)
 from public.lifting_boost_best_run_refs r
 join public.lifting_players p on p.id=r.player_id and p.best=r.best_score
 where r.player_id in (select x::uuid from jsonb_array_elements_text(payload->'playerIds') x)
 $$;
-- JSON payload shape: {"playerIds":[uuid,...],"runIds":[uuid,...]}.
create or replace function public.lifting_api_boost_verified_receipt_list(payload jsonb)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(r.player_id::text,jsonb_build_object(
  'playerId',r.player_id,'runId',r.run_id,'boost',r.boost_type,
  'baseScore',r.base_score,'boostBonus',r.boost_bonus,'playScore',r.play_score)),'{}'::jsonb)
 from public.lifting_boost_verified_receipts r
 join public.lifting_boost_best_run_refs b on b.player_id=r.player_id and b.best_run_id=r.run_id and b.best_score=r.play_score
 join public.lifting_players p on p.id=b.player_id and p.best=b.best_score
 where r.player_id in (select x::uuid from jsonb_array_elements_text(payload->'playerIds') x)
 and r.run_id in (select x::uuid from jsonb_array_elements_text(payload->'runIds') x)
 $$;
revoke all on function public.lifting_api_boost_best_run_lookup(jsonb) from public,anon,authenticated;
revoke all on function public.lifting_api_boost_verified_receipt_list(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_boost_best_run_lookup(jsonb) to service_role;
grant execute on function public.lifting_api_boost_verified_receipt_list(jsonb) to service_role;
commit;
-- SECURITY REVIEW REQUIRED: check function ACLs, RLS, service_role-only access,
-- existing lifting_players.best type and score semantics, plus atomic best update.
-- The application-side reader is intentionally NOT wired into the live Worker.
