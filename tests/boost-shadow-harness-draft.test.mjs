import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../docs/sql/prime-boost-shadow-harness-draft.sql',import.meta.url),'utf8');
test('shadow harness never alters existing production ranking tables or RPCs',()=>{
 assert.match(sql,/create schema if not exists boost_shadow_test/);
 assert.match(sql,/create table if not exists boost_shadow_test\.players/);
 assert.match(sql,/create table if not exists boost_shadow_test\.runs/);
 assert.doesNotMatch(sql,/\b(?:alter|update|insert into|delete from|drop|truncate)\s+(?:table\s+)?public\./i);
 assert.doesNotMatch(sql,/create or replace function public\./i);
});
test('single locked player transaction handles replay and best-run attribution',()=>{
 assert.match(sql,/for update/);
 assert.match(sql,/conflicting replay/);
 assert.match(sql,/p_play_score > v_player\.best_score/);
 assert.match(sql,/p_boost_type is null then null else p_run_id/);
 assert.match(sql,/insert into boost_shadow_test\.runs/);
});
test('untrusted roles cannot call shadow function or access shadow tables',()=>{
 assert.match(sql,/revoke all on schema boost_shadow_test from public, anon, authenticated/);
 assert.match(sql,/revoke all on boost_shadow_test\.players,boost_shadow_test\.runs from public,anon,authenticated/);
 assert.match(sql,/revoke all on function boost_shadow_test\.submit_verified/);
 assert.doesNotMatch(sql,/grant execute/gi);
});
test('score breakdown validated before write, and tests remain staging-only',()=>{
 assert.match(sql,/p_base_score \+ p_boost_bonus <> p_play_score/);
 assert.match(sql,/p_boost_type = 'score' and p_play_score <> round\(p_base_score \* 1\.1\)/);
 assert.match(sql,/NEVER RUN IN PRODUCTION/);
 assert.match(sql,/No daily or achievement logic is modeled/);
});
