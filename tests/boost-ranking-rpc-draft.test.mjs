import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../docs/sql/prime-boost-ranking-read-rpc-draft.sql',import.meta.url),'utf8');
test('draft only introduces isolated service-role read functions and no production changes',()=>{
 assert.match(sql,/STAGING DRAFT ONLY/);
 assert.match(sql,/lifting_api_boost_best_run_lookup\(payload jsonb\)/);
 assert.match(sql,/lifting_api_boost_verified_receipt_list\(payload jsonb\)/);
 assert.match(sql,/security invoker/g);
 assert.match(sql,/revoke all on function public\.lifting_api_boost_best_run_lookup\(jsonb\) from public,anon,authenticated/);
 assert.match(sql,/revoke all on function public\.lifting_api_boost_verified_receipt_list\(jsonb\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.lifting_api_boost_best_run_lookup\(jsonb\) to service_role/);
 assert.match(sql,/grant execute on function public\.lifting_api_boost_verified_receipt_list\(jsonb\) to service_role/);
 assert.doesNotMatch(sql,/drop table|truncate|delete from|alter table public\.lifting_players/i);
});
test('receipt lookup requires the saved best-run pointer and matching player best score',()=>{
 assert.match(sql,/b\.best_run_id=r\.run_id and b\.best_score=r\.play_score/);
 assert.match(sql,/p\.best=b\.best_score/);
 assert.match(sql,/r\.run_id in \(select x::uuid from jsonb_array_elements_text\(payload->'runIds'\) x\)/);
});
