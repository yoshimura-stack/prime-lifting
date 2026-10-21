import test from 'node:test';
import assert from 'node:assert/strict';
import {issueBoostRunToken,verifyBoostRunToken} from '../server/boost-run-token.mjs';
const secret='staging-test-secret-isolated-12345678901234567890';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const another='123e4567-e89b-42d3-a456-426614174003';
const now=Date.UTC(2026,9,21,0,0,0);
test('server-signed token binds account, run and BOOST selection',async()=>{
 const token=await issueBoostRunToken({playerId,runId,boost:'score',secret,now});
 assert.deepEqual(await verifyBoostRunToken(token,{playerId,runId,secret,now}),{playerId,runId,boost:'score'});
 assert.equal(await verifyBoostRunToken(token,{playerId:another,runId,secret,now}),null);
 assert.equal(await verifyBoostRunToken(token,{playerId,runId:another,secret,now}),null);
 assert.equal(await verifyBoostRunToken(token,{playerId,runId,secret,now:now+901000}),null);
 assert.equal(await verifyBoostRunToken(token,{playerId,runId,secret:'another-isolated-secret-12345678901234567890',now}),null);
 assert.equal(await verifyBoostRunToken(token.slice(0,-3)+'bad',{playerId,runId,secret,now}),null);
});
test('normal play is explicit NONE and invalid selections fail closed',async()=>{
 const token=await issueBoostRunToken({playerId,runId,secret,now});
 assert.equal((await verifyBoostRunToken(token,{playerId,runId,secret,now})).boost,null);
 await assert.rejects(issueBoostRunToken({playerId,runId,boost:['score','time'],secret,now}),TypeError);
 await assert.rejects(issueBoostRunToken({playerId,runId,boost:'score',secret,now,ttlSeconds:3601}),TypeError);
});
