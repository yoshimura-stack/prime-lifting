-- STAGING SHADOW HARNESS TEST SCRIPT ONLY. NOT EXECUTED.
-- Prerequisite: reviewed boost_shadow_test schema installed in an isolated staging DB.
-- This script uses only disposable UUIDs and ROLLBACK; no real player records.
-- Concurrent sessions require a separate controlled test (not covered here).
begin;
insert into boost_shadow_test.players(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
do $$
declare
 v jsonb;
 v_count integer;
begin
 -- BOOST 50,000 + 5,000 => 55,000; pointer must be the winning run.
 v:=boost_shadow_test.submit_verified('11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',55000,'score',50000,5000);
 if v->>'bestScore'<>'55000' or v->>'personalBest'<>'true'
    or v->>'bestRunId'<>'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
 then raise exception 'BOOST best failed'; end if;
 -- Same run replay must not duplicate the run or modify the best.
 v:=boost_shadow_test.submit_verified('11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',55000,'score',50000,5000);
 if v->>'replayed'<>'true' then raise exception 'retry failed'; end if;
 select count(*) into v_count from boost_shadow_test.runs
 where player_id='11111111-1111-4111-8111-111111111111';
 if v_count<>1 then raise exception 'duplicate run'; end if;
 -- A different run with equal score cannot steal the winning run ID.
 v:=boost_shadow_test.submit_verified('11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',55000,null,55000,0);
 if v->>'personalBest'<>'false'
    or v->>'bestRunId'<>'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
 then raise exception 'tie changed provenance'; end if;
 -- A higher non-BOOST score must remove the old BOOST pointer.
 v:=boost_shadow_test.submit_verified('11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',60000,null,60000,0);
 if v->>'bestScore'<>'60000' or v->>'bestRunId' is not null
 then raise exception 'normal best did not clear BOOST'; end if;
 -- A conflicting retry must fail without modifying stored data.
 begin
  perform boost_shadow_test.submit_verified('11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',60000,null,60000,0);
  raise exception 'conflicting replay accepted';
 exception when others then
  if sqlerrm='conflicting replay accepted' then raise; end if;
  if sqlerrm<>'conflicting replay' then raise; end if;
 end;
 -- A forged multiplier must fail.
 begin
  perform boost_shadow_test.submit_verified('11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',60000,'score',50000,10000);
  raise exception 'forged multiplier accepted';
 exception when others then
  if sqlerrm='forged multiplier accepted' then raise; end if;
  if sqlerrm<>'invalid verified run' then raise; end if;
 end;
end;
$$;
rollback;
-- Separate two-session concurrency test remains mandatory before any rollout.
