import test from 'node:test';
import assert from 'node:assert/strict';
import {createNoneRunStartStore} from '../server/boost-none-run-start.mjs';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
test('valid NONE start confirmation',async()=>{
 const calls=[];
 const store=createNoneRunStartStore({call:async(op,payload)=>{calls.push(op);return {runId,replayed:false};}});
 assert.deepEqual(await store.start({playerId,runId}),{runId,replayed:false});
 assert.deepEqual(calls,['boost_start_none']);
});
test('bad NONE start confirmation fails closed',async()=>{
 const store=createNoneRunStartStore({call:async()=>({runId:'wrong',replayed:false})});
 await assert.rejects(store.start({playerId,runId}),/not confirmed/);
});
