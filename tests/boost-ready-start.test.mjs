import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostReadyStart} from '../server/boost-ready-start.mjs';
import '../js/config.js';
import '../js/engine.js';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const secret='staging-integration-secret-12345678901234567890';
const now=Date.UTC(2026,9,21);
const make=(inventory,call)=>createBoostReadyStart({inventory,transport:{call},secret,clock:()=>now,newRunId:()=>runId,baseConfig:globalThis.PRIME_DEFAULTS,playerId});
test('TIME selection and confirmed reserve yield 65-second engine',async()=>{
 const calls=[];
 const ready=make({time:1,score:0,sc:0},async(op,payload)=>{calls.push({op,payload});return {boost:'time',remaining:0,replayed:false};});
 ready.select('time');
 const run=await ready.start();
 assert.equal(run.config.GAME_DURATION,65);
 assert.equal(new globalThis.LiftingGame(run.config).remaining,65);
 assert.equal(globalThis.PRIME_DEFAULTS.GAME_DURATION,60);
 assert.equal(calls[0].op,'boost_reserve');
 await assert.rejects(ready.start(),/already started/);
});
test('NONE uses 60 seconds and no inventory reserve',async()=>{
 const calls=[];
 const ready=make({time:0,score:0,sc:0},async(op,payload)=>{calls.push(op);return {runId:payload.runId,replayed:false};});
 const run=await ready.start();
 assert.equal(run.config.GAME_DURATION,60);
 assert.deepEqual(calls,['boost_start_none']);
});
test('out of stock and failed reserve fail closed',async()=>{
 const empty=make({time:0,score:0,sc:0},async()=>{throw Error('unexpected');});
 assert.throws(()=>empty.select('time'),RangeError);
 const failed=make({time:1,score:0,sc:0},async()=>{throw Error('reserve unavailable');});
 failed.select('time');
 await assert.rejects(failed.start(),/reserve unavailable/);
 assert.equal(failed.pending,false);
});
