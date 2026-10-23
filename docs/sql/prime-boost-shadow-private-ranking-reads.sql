-- STAGING SHADOW ONLY. Executed against isolated boost_shadow_test schema.
-- Private trusted lookups; do NOT expose to anon/authenticated or deploy to production.
create or replace function boost_shadow_test.best_run_lookup(p_ids uuid[])
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(p.id::text,jsonb_build_object('bestRunId',p.best_run_id,'bestScore',p.best_score)),'{}'::jsonb)
 from boost_shadow_test.players p where p.id=any(p_ids)
$$;
create or replace function boost_shadow_test.verified_receipt_list(p_ids uuid[],p_runs uuid[])
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(r.player_id::text,jsonb_build_object('playerId',r.player_id,'runId',r.run_id,'boost',r.boost_type,'baseScore',r.base_score,'boostBonus',r.boost_bonus,'playScore',r.play_score)),'{}'::jsonb)
 from boost_shadow_test.runs r join boost_shadow_test.players p on p.id=r.player_id and p.best_run_id=r.run_id
 where r.player_id=any(p_ids) and r.run_id=any(p_runs)
$$;
revoke all on function boost_shadow_test.best_run_lookup(uuid[]) from public,anon,authenticated;
revoke all on function boost_shadow_test.verified_receipt_list(uuid[],uuid[]) from public,anon,authenticated;
