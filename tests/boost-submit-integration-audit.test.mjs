import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../server/worker.mjs',import.meta.url),'utf8');
const audit=readFileSync(new URL('../docs/boost-submit-integration-audit.md',import.meta.url),'utf8');
test('existing score submission precedes achievements and daily award; BOOST remains disconnected',()=>{
 const submit=worker.indexOf("db.call('submit'");
 const achievement=worker.indexOf("db.call('achievement_merge'");
 const next=worker.indexOf("db.call('next_achievement_merge'");
 const daily=worker.indexOf("db.call('daily_award'");
 assert.ok(submit>=0&&achievement>submit&&next>achievement&&daily>next);
 assert.doesNotMatch(worker,/boost-ranking-reader|boost-atomic-best-plan|boost-finish-validator/);
});
test('integration gate requires atomic submit, unboosted invalidation and retry-safe daily credits',()=>{
 assert.match(audit,/same database transaction as the verified submit/);
 assert.match(audit,/unboosted play overtakes/);
 assert.match(audit,/daily credits twice/);
 assert.match(audit,/Do not wire BOOST/);
});
