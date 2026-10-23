import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostFinishValidator} from '../server/boost-finish-validator.mjs';
import {issueBoostRunToken} from '../server/boost-run-token.mjs';
const secret='staging-test-secret-isolated-12345678901234567890';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const now=Date.UTC(2026,9,21);
const token=boost=>issueBoostRunToken({playerId,runId,boost,secret,now});
test('rejects forged score before claiming run',async()=>{
 let claims=0;
 const gate=createBoostFinishValidator({secret,clock:()=>now,saveReceipt:async()=>{claims++;return {runId,playScore:0,replayed:false}}});
 const signed=await token('score');
 await assert.rejects(gate.validate({playerId,runId,token:signed,events:[],worldWidth:1000,device:'pc',claimedScore:123456}),{status:400});
 assert.equal(claims,0);
});
test('SC signed run is accepted through server replay',async()=>{
 let claims=0;
 const gate=createBoostFinishValidator({secret,clock:()=>now,saveReceipt:async()=>{claims++;return {runId,playScore:0,replayed:false}}});
 const result=await gate.validate({playerId,runId,token:await token('sc'),events:[],worldWidth:1000,device:'mobile'});
 assert.equal(result.boost,'sc');
 assert.equal(claims,1);
});
test('rejects wrong signed run without touching replay or run store',async()=>{
 let claims=0;
 const gate=createBoostFinishValidator({secret,clock:()=>now,saveReceipt:async()=>{claims++;return {runId,playScore:0,replayed:false}}});
 await assert.rejects(gate.validate({playerId,runId:'123e4567-e89b-42d3-a456-426614174003',token:await token(null),events:[],device:'pc'}),{status:401});
 assert.equal(claims,0);
});
