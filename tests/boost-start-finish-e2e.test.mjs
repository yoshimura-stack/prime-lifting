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
for(const boost of [null,'score'])test('trusted START to FINISH with '+(boost??'NONE'),async()=>{
 const calls=[];
 let started=false;
 let saved=null;
 const transport={call:async(op,payload)=>{
  calls.push(op);
  if(op==='boost_start_none'||op==='boost_reserve'){
   started=true;
   return op==='boost_reserve'?{boost:'score',remaining:1,replayed:false}:{runId,replayed:false};
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

for(const boost of ['time','sc'])test('unimplemented '+boost+' cannot silently save a score',async()=>{
 const calls=[];
 const transport={call:async(op,payload)=>{
  calls.push(op);
  if(op==='boost_reserve')return {boost,remaining:1,replayed:false};
  throw Error('A pending effect must never produce a verified score receipt');
 }};
 const coordinator=createBoostRunCoordinator({transport,secret,clock:()=>now,newRunId:()=>runId});
 const run=await coordinator.start({playerId,boost});
 let receipts=0;
 const finish=createBoostFinishValidator({secret,clock:()=>now,saveReceipt:async()=>{receipts++;throw Error('Unexpected receipt');}});
 await assert.rejects(finish.validate({playerId,runId,token:run.token,events:[],worldWidth:1000,device:'pc',claimedScore:0}),/BOOST replay rules pending/);
 assert.equal(receipts,0);
 assert.deepEqual(calls,['boost_reserve']);
});
test('invalid signed run cannot write a verified receipt',async()=>{
 let receipts=0;
 const finish=createBoostFinishValidator({secret,clock:()=>now,saveReceipt:async()=>{receipts++;throw Error('Unexpected receipt');}});
 await assert.rejects(finish.validate({playerId,runId,token:'forged',events:[],worldWidth:1000,device:'pc',claimedScore:0}),/Invalid signed run/);
 assert.equal(receipts,0);
});
