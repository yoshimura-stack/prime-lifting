-- STAGING-ONLY SHADOW HARNESS. REVIEW BEFORE EXECUTING. NEVER RUN IN PRODUCTION.
-- Isolated schema: no changes to public.lifting_players or production RPCs.
-- This is a test double, NOT a production-compatible lifting_api_submit implementation.
begin;
create schema if not exists boost_shadow_test;
revoke all on schema boost_shadow_test from public, anon, authenticated;
create table if not exists boost_shadow_test.players (
 id uuid primary key,
 best_score bigint not null default 0 check(best_score >= 0),
 best_run_id uuid
);
create table if not exists boost_shadow_test.runs (
 run_id uuid primary key,
 player_id uuid not null references boost_shadow_test.players(id) on delete cascade,
 play_score bigint not null check(play_score >= 0),
 boost_type text check(boost_type in ('time','score','sc')),
 base_score bigint not null check(base_score >= 0),
 boost_bonus bigint not null check(boost_bonus >= 0),
 check(base_score + boost_bonus = play_score),
 check(boost_type = 'score' or boost_bonus = 0),
 check(boost_type is not null or boost_bonus = 0)
);
revoke all on boost_shadow_test.players,boost_shadow_test.runs from public,anon,authenticated;
alter table boost_shadow_test.players enable row level security;
alter table boost_shadow_test.runs enable row level security;
-- Function is deliberately outside exposed public schema and not callable by client roles.
create or replace function boost_shadow_test.submit_verified(
 p_player_id uuid,p_run_id uuid,p_play_score bigint,p_boost_type text,
 p_base_score bigint,p_boost_bonus bigint
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_player boost_shadow_test.players%rowtype;
 v_run boost_shadow_test.runs%rowtype;
 v_changed boolean := false;
begin
 if p_player_id is null or p_run_id is null or p_play_score is null
    or p_base_score is null or p_boost_bonus is null
    or p_play_score < 0 or p_base_score < 0 or p_boost_bonus < 0
    or p_base_score + p_boost_bonus <> p_play_score
    or (p_boost_type is not null and p_boost_type not in ('time','score','sc'))
    or (p_boost_type is distinct from 'score' and p_boost_bonus <> 0)
    or (p_boost_type = 'score' and p_play_score <> round(p_base_score * 1.1))
 then raise exception 'invalid verified run'; end if;
 -- Serialize all submissions for the same player.
 select * into v_player from boost_shadow_test.players where id=p_player_id for update;
 if not found then raise exception 'unknown player'; end if;
 select * into v_run from boost_shadow_test.runs where run_id=p_run_id;
 if found then
  if v_run.player_id <> p_player_id or v_run.play_score <> p_play_score
     or v_run.base_score <> p_base_score or v_run.boost_bonus <> p_boost_bonus
     or v_run.boost_type is distinct from p_boost_type
  then raise exception 'conflicting replay'; end if;
  return jsonb_build_object('replayed',true,'personalBest',false,
   'bestScore',v_player.best_score,'bestRunId',v_player.best_run_id);
 end if;
 insert into boost_shadow_test.runs(run_id,player_id,play_score,boost_type,base_score,boost_bonus)
 values(p_run_id,p_player_id,p_play_score,p_boost_type,p_base_score,p_boost_bonus);
 if p_play_score > v_player.best_score then
  update boost_shadow_test.players
  set best_score=p_play_score,best_run_id=case when p_boost_type is null then null else p_run_id end
  where id=p_player_id;
  v_changed:=true;
 end if;
 return jsonb_build_object('replayed',false,'personalBest',v_changed,
  'bestScore',case when v_changed then p_play_score else v_player.best_score end,
  'bestRunId',case when v_changed then (case when p_boost_type is null then null else p_run_id end) else v_player.best_run_id end);
end;
$$;
revoke all on function boost_shadow_test.submit_verified(uuid,uuid,bigint,text,bigint,bigint)
 from public,anon,authenticated;
-- Do not grant execution until a separate, controlled staging harness is configured.
commit;
-- Execution plan: use disposable test players and rollback test transactions;
-- verify concurrency in two sessions, invalid score, same run retry, tie, and
-- non-BOOST overtaking a BOOST best. No daily or achievement logic is modeled.
