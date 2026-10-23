import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../server/worker.mjs',import.meta.url),'utf8');
const contract=readFileSync(new URL('../docs/boost-worker-integration-contract.md',import.meta.url),'utf8');
test('existing submit remains before achievements and daily credits',()=>{
 const submit=worker.indexOf("db.call('submit'");
 const achievements=worker.indexOf("db.call('achievement_merge'");
 const next=worker.indexOf("db.call('next_achievement_merge'");
 const daily=worker.indexOf("db.call('daily_award'");
 assert.ok(submit>0&&achievements>submit&&next>achievements&&daily>next);
 assert.match(worker,/DAILY_REWARDS_ENABLED/);
});
test('no live worker imports of staging-only BOOST persistence',()=>{
 assert.doesNotMatch(worker,/boost-shadow|boost-finish-validator|boost-verified-receipt|boost-leaderboard-bridge|boost-ranking-reader/);
});
test('integration contract explicitly guards idempotent retries and avoids double-counting',()=>{
 for(const phrase of ['same run ID','replayed=true','separately labelled','Do not append a separate BOOST best-run write','SC remains blocked','two-session lock-wait'])
  assert.ok(contract.includes(phrase),phrase);
});
