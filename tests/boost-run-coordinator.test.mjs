import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostRunCoordinator} from '../server/boost-run-coordinator.mjs';
const secret='staging-test-secret-isolated-12345678901234567890';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const now=Date.UTC(2026,9,21);
const setup=(call)=>createBoostRunCoordinator({transport:{call},secret,clock:()=>now,newRunId:()=>runId});
test('start reserves exactly one SCORE BOOST then signs selected run',async()=>{
 const calls=[];const api=setup(async(op,payload)=>{calls.push({op,payload});return {boost:'score',replayed:false,remaining:1}});
 const run=await api.start({playerId,boost:'score'});
 assert.deepEqual(calls,[{op:'boost_reserve',payload:{playerId,runId,boost:'score'}}]);
 assert.equal(run.boost,'score');
 assert.deepEqual(await api.score({playerId,runId,token:run.token,baseScore:50000,device:'mobile'}),{baseScore:50000,boost:'score',boostBonus:5000,playScore:55000});
 await assert.rejects(api.score({playerId,runId,token:run.token,baseScore:50000,device:'tablet'}),TypeError);
});
test('NONE run never consumes inventory',async()=>{
 const api=setup(async()=>{throw Error('Must not call DB')});
 const run=await api.start({playerId});
 assert.equal(run.boost,null);
 assert.equal((await api.score({playerId,runId,token:run.token,baseScore:50000,device:'pc'})).boostBonus,0);
});
test('no token issued on insufficient inventory or failed reservation',async()=>{
 const api=setup(async()=>{throw Error('out of stock')});
 await assert.rejects(api.start({playerId,boost:'time'}),/out of stock/);
 const bad=setup(async()=>({boost:'time',replayed:true}));
 await assert.rejects(bad.start({playerId,boost:'time'}),/not confirmed/);
});
test('token cannot be applied to another account or run',async()=>{
 const api=setup(async()=>({boost:'sc',replayed:false,remaining:0}));
 const run=await api.start({playerId,boost:'sc'});
 await assert.rejects(api.score({playerId:'123e4567-e89b-42d3-a456-426614174003',runId,token:run.token,baseScore:100,device:'pc'}),TypeError);
 await assert.rejects(api.score({playerId,runId:'123e4567-e89b-42d3-a456-426614174004',token:run.token,baseScore:100,device:'pc'}),TypeError);
});
