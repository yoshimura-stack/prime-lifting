import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBoostReleaseReadiness,BOOST_REQUIRED_RELEASE_FUNCTIONS} from '../server/boost-release-gate.mjs';
test('existing staging schema cannot be mistaken for production-ready ranked BOOST',()=>{
 const gate=assessBoostReleaseReadiness({
  functions:['lifting_api_boost_inventory_read','lifting_api_boost_reserve','lifting_api_boost_verified_receipt'],
  tables:['lifting_players','lifting_boost_verified_receipts'],
  workerWired:false,uiWired:false,ciPassed:true
 });
 assert.equal(gate.ready,false);
 assert.ok(gate.missing.includes('lifting_runs'));
 assert.ok(gate.missing.includes('lifting_api_submit_boost_atomic'));
 assert.ok(gate.missing.includes('authenticated_worker_routes'));
});
test('receipt-only support never passes release gate',()=>{
 const gate=assessBoostReleaseReadiness({functions:['lifting_api_boost_verified_receipt'],tables:['lifting_runs','lifting_players'],workerWired:true,uiWired:true,ciPassed:true});
 assert.equal(gate.ready,false);
 assert.equal(gate.missing.length,BOOST_REQUIRED_RELEASE_FUNCTIONS.length);
});
test('only complete verified transaction and client wiring passes',()=>{
 const gate=assessBoostReleaseReadiness({functions:[...BOOST_REQUIRED_RELEASE_FUNCTIONS],tables:['lifting_runs','lifting_players'],workerWired:true,uiWired:true,ciPassed:true});
 assert.deepEqual(gate,{ready:true,missing:[]});
});
