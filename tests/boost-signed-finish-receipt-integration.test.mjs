import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostFinishValidator} from '../server/boost-finish-validator.mjs';
import {createBoostVerifiedReceiptStore} from '../server/boost-verified-receipt.mjs';
import {issueBoostRunToken} from '../server/boost-run-token.mjs';

const secret='isolated-staging-integration-test-secret-123456789';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const now=Date.UTC(2026,9,23);
function fixture(){
 const rows=new Map(),calls=[];
 const store=createBoostVerifiedReceiptStore({async call(operation,payload){
  calls.push({operation,payload});
  assert.equal(operation,'boost_verified_receipt');
  const old=rows.get(payload.runId);
  if(old){
   if(JSON.stringify(old)!==JSON.stringify(payload))throw new Error('conflicting replay');
   return {runId:payload.runId,playScore:payload.playScore,replayed:true};
  }
  rows.set(payload.runId,payload);
  return {runId:payload.runId,playScore:payload.playScore,replayed:false};
 }});
 return {rows,calls,gate:createBoostFinishValidator({secret,clock:()=>now,saveReceipt:x=>store.save(x)})};
}
async function signed(boost){return issueBoostRunToken({playerId,runId,boost,secret,now});}
for(const boost of [null,'score','time','sc']){
 test('signed '+String(boost)+' run is replay-verified and stored once',async()=>{
  const f=fixture(),token=await signed(boost);
  const args={playerId,runId,token,events:[],worldWidth:1000,device:'pc'};
  const first=await f.gate.validate(args);
  assert.equal(first.boost,boost);
  assert.equal(first.replayed,false);
  assert.equal(first.playScore,first.baseScore+first.boostBonus);
  if(boost!=='score')assert.equal(first.boostBonus,0);
  const retry=await f.gate.validate(args);
  assert.equal(retry.replayed,true);
  assert.equal(f.rows.size,1);
  assert.equal(f.calls.length,2);
 });
}
test('wrong player and forged claimed score never call receipt store',async()=>{
 const f=fixture(),token=await signed('score');
 await assert.rejects(f.gate.validate({playerId:'123e4567-e89b-42d3-a456-426614174003',runId,token,events:[],worldWidth:1000,device:'pc'}),{status:401});
 await assert.rejects(f.gate.validate({playerId,runId,token,events:[],worldWidth:1000,device:'pc',claimedScore:999999}),{status:400});
 assert.equal(f.calls.length,0);
});
