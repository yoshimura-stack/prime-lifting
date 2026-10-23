import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostRunCoordinator} from '../server/boost-run-coordinator.mjs';
import {createBoostFinishValidator} from '../server/boost-finish-validator.mjs';
import {createBoostVerifiedReceiptStore} from '../server/boost-verified-receipt.mjs';
import {replay} from '../server/replay.mjs';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const secret='staging-integration-secret-12345678901234567890';
const now=Date.UTC(2026,9,21);
for(const boost of [null,'score','sc'])test('trusted START to FINISH with '+(boost??'NONE'),async()=>{
 const calls=[];
 let started=false;
 let saved=null;
 const transport={call:async(op,payload)=>{
  calls.push(op);
  if(op==='boost_start_none'||op==='boost_reserve'){
   started=true;
   return op==='boost_reserve'?{boost,remaining:1,replayed:false}:{runId,replayed:false};
  }
  if(op==='boost_verified_receipt'){
   assert.equal(started,true);
   assert.equal(payload.boost,boost);
   if(saved){assert.deepEqual(saved,payload);return {runId,playScore:saved.playScore,replayed:true};}
   saved=payload;
   return {runId,playScore:payload.playScore,replayed:false};
  }
  throw Error('Unexpected RPC');
 }};
 const coordinator=createBoostRunCoordinator({transport,secret,clock:()=>now,newRunId:()=>runId});
 const run=await coordinator.start({playerId,boost});
 const receiptStore=createBoostVerifiedReceiptStore(transport);
 const finish=createBoostFinishValidator({secret,clock:()=>now,saveReceipt:receiptStore.save});
 const base=replay([],1000).score;
 const score=boost==='score'?Math.round(base*1.1):base;
 const args={playerId,runId,token:run.token,events:[],worldWidth:1000,device:'pc',claimedScore:score};
 const first=await finish.validate(args);
 const retry=await finish.validate(args);
 assert.equal(first.playScore,score);
 assert.equal(first.replayed,false);
 assert.equal(retry.replayed,true);
 assert.deepEqual(calls,[boost?'boost_reserve':'boost_start_none','boost_verified_receipt','boost_verified_receipt']);
});

test('invalid signed run cannot write a verified receipt',async()=>{
 let receipts=0;
 const finish=createBoostFinishValidator({secret,clock:()=>now,saveReceipt:async()=>{receipts++;throw Error('Unexpected receipt');}});
 await assert.rejects(finish.validate({playerId,runId,token:'forged',events:[],worldWidth:1000,device:'pc',claimedScore:0}),/Invalid signed run/);
 assert.equal(receipts,0);
});

test('TIME BOOST signs, verifies, and saves a 65-second replay without score multiplier',async()=>{
 let saved=null;
 const transport={call:async(op,payload)=>{
  if(op==='boost_reserve')return {boost:'time',remaining:1,replayed:false};
  if(op==='boost_verified_receipt'){saved=payload;return {runId,playScore:payload.playScore,replayed:false};}
  throw Error('Unexpected RPC '+op);
 }};
 const coordinator=createBoostRunCoordinator({transport,secret,clock:()=>now,newRunId:()=>runId});
 const run=await coordinator.start({playerId,boost:'time'});
 const finish=createBoostFinishValidator({secret,clock:()=>now,saveReceipt:createBoostVerifiedReceiptStore(transport).save});
 const expected=replay([],1000,'time').score; // Mobile and PC have equal base scoring; TIME adds seconds only.
 const actual=await finish.validate({playerId,runId,token:run.token,events:[],worldWidth:1000,device:'mobile',claimedScore:expected});
 assert.equal(actual.boost,'time');
 assert.equal(actual.playScore,expected);
 assert.equal(actual.boostBonus,0);
 assert.equal(saved.boost,'time');
});
test('normal replay rejects TIME-length input while TIME replay accepts its 65-second window',()=>{
 const tooLate=[{t:8100,n:'move',v:0}];
 assert.throws(()=>replay(tooLate,1000),{status:400});
 assert.doesNotThrow(()=>replay(tooLate,1000,'time'));
});
