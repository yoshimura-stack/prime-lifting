import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostFinishValidator} from '../server/boost-finish-validator.mjs';
import {issueBoostRunToken} from '../server/boost-run-token.mjs';
import {replay} from '../server/replay.mjs';
const secret='staging-only-test-secret-123456789012345678901';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const now=Date.UTC(2026,9,21);
const makeToken=boost=>issueBoostRunToken({playerId,runId,boost,secret,now});
test('normal run replay persists verified score, then identical retry is idempotent',async()=>{
 const baseScore=replay([],1000).score;
 let writes=0;
 const gate=createBoostFinishValidator({secret,clock:()=>now,saveReceipt:async payload=>{
  writes++;
  assert.equal(payload.baseScore,baseScore);
  assert.equal(payload.boost,null);
  return {runId,playScore:payload.playScore,replayed:writes>1};
 }});
 const token=await makeToken(null);
 const args={playerId,runId,token,events:[],worldWidth:1000,device:'pc',claimedScore:baseScore};
 const first=await gate.validate(args);
 const second=await gate.validate(args);
 assert.equal(first.playScore,baseScore);
 assert.equal(first.replayed,false);
 assert.equal(second.replayed,true);
 assert.equal(writes,2); // DB is responsible for idempotent receipt rows.
});
test('SCORE BOOST computes score from replay, never client bonus',async()=>{
 const baseScore=replay([],1000).score;
 const expected=Math.round(baseScore*1.1);
 const gate=createBoostFinishValidator({secret,clock:()=>now,saveReceipt:async payload=>({runId,playScore:payload.playScore,replayed:false})});
 const result=await gate.validate({playerId,runId,token:await makeToken('score'),events:[],worldWidth:1000,device:'mobile',claimedScore:expected});
 assert.equal(result.playScore,expected);
 assert.equal(result.boostBonus,expected-baseScore);
});
test('receipt mismatch is not accepted as completed play',async()=>{
 const gate=createBoostFinishValidator({secret,clock:()=>now,saveReceipt:async()=>({runId,playScore:-1,replayed:false})});
 await assert.rejects(gate.validate({playerId,runId,token:await makeToken(null),events:[],worldWidth:1000,device:'pc'}),{status:502});
});
