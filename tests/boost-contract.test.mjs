import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBoostCounts,boostReservePayload,parseSlotResult} from '../server/boost-contract.mjs';
const player='123e4567-e89b-42d3-a456-426614174000';
const run='123e4567-e89b-42d3-a456-426614174001';
test('inventory validates all three counts and cap',()=>{
 assert.deepEqual(parseBoostCounts({time:2,score:1,sc:0}),{time:2,score:1,sc:0});
 assert.throws(()=>parseBoostCounts({time:3,score:0,sc:0}),RangeError);
 assert.throws(()=>parseBoostCounts({time:1,score:1}),RangeError);
});
test('reserve requires exactly one BOOST and valid server identifiers',()=>{
 assert.deepEqual(boostReservePayload(player,run,'time'),{payload:{playerId:player,runId:run,boost:'time'}});
 assert.throws(()=>boostReservePayload(player,run,['time','score']),TypeError);
 assert.throws(()=>boostReservePayload(player,run,null),TypeError);
 assert.throws(()=>boostReservePayload('invalid',run,'sc'),TypeError);
});
test('slot validates triple matching symbols and full-stock skip',()=>{
 assert.deepEqual(parseSlotResult({day:'2026-10-20',boost:'sc',reels:['sc','sc','sc'],replayed:false}),{day:'2026-10-20',boost:'sc',reels:['sc','sc','sc'],replayed:false});
 assert.deepEqual(parseSlotResult({day:'2026-10-20',boost:null,reels:null,allFull:true,replayed:false}),{day:'2026-10-20',boost:null,reels:null,allFull:true,replayed:false});
 assert.throws(()=>parseSlotResult({day:'2026-10-20',boost:'sc',reels:['sc','time','sc'],replayed:false}),TypeError);
 assert.throws(()=>parseSlotResult({day:'not-a-day',boost:'sc',reels:['sc','sc','sc'],replayed:false}),TypeError);
});
