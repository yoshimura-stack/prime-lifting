import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostVerifiedReceiptStore} from '../server/boost-verified-receipt.mjs';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
test('writes only a complete internally consistent verified receipt',async()=>{
 const calls=[];const store=createBoostVerifiedReceiptStore({call:async(op,payload)=>{calls.push({op,payload});return {runId,playScore:55000,replayed:false}}});
 assert.deepEqual(await store.save({playerId,runId,boost:'score',baseScore:50000,boostBonus:5000,playScore:55000}),{runId,playScore:55000,replayed:false});
 assert.equal(calls[0].op,'boost_verified_receipt');
 assert.equal(calls[0].payload.playerId,playerId);
});
test('rejects forged breakdown before touching database',async()=>{
 let calls=0;const store=createBoostVerifiedReceiptStore({call:async()=>{calls++;return {}}});
 await assert.rejects(store.save({playerId,runId,boost:'time',baseScore:50000,boostBonus:5000,playScore:55000}),RangeError);
 await assert.rejects(store.save({playerId,runId,boost:'score',baseScore:50000,boostBonus:1000,playScore:55000}),RangeError);
 assert.equal(calls,0);
});
