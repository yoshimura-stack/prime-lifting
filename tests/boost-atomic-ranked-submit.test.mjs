import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostAtomicRankedSubmit} from '../server/boost-atomic-ranked-submit.mjs';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
for(const boost of [null,'time','score','sc'])test('atomic submit sends verified '+(boost??'normal')+' score in one operation',async()=>{
 const calls=[];
 const submit=createBoostAtomicRankedSubmit({transport:{call:async(op,payload)=>{
  calls.push({op,payload});return {runId,playScore:payload.playScore,replayed:false,personalBest:true};
 }}});
 const baseScore=50000,boostBonus=boost==='score'?5000:0,playScore=baseScore+boostBonus;
 const result=await submit.submit({playerId,runId,verified:{boost,baseScore,boostBonus,playScore}});
 assert.equal(result.playScore,playScore);
 assert.equal(result.personalBest,true);
 assert.deepEqual(calls,[{op:'boost_atomic_ranked_submit',payload:{playerId,runId,boost,baseScore,boostBonus,playScore}}]);
});
test('reject forged SCORE multiplier and incomplete breakdown before any transport call',async()=>{
 let calls=0;
 const submit=createBoostAtomicRankedSubmit({transport:{call:async()=>{calls++;throw Error('unexpected');}}});
 for(const verified of [
  {boost:'score',baseScore:50000,boostBonus:4000,playScore:54000},
  {boost:'time',baseScore:50000,boostBonus:5000,playScore:55000},
  {boost:'score',playScore:55000},
  {boost:'sc',baseScore:50000,boostBonus:0,playScore:50001}
 ])await assert.rejects(submit.submit({playerId,runId,verified}));
 assert.equal(calls,0);
});
test('reject invalid atomic DB confirmation',async()=>{
 const submit=createBoostAtomicRankedSubmit({transport:{call:async()=>({runId,playScore:50000,replayed:false})}});
 await assert.rejects(submit.submit({playerId,runId,verified:{boost:null,baseScore:50000,boostBonus:0,playScore:50000}}),/Unconfirmed/);
});
