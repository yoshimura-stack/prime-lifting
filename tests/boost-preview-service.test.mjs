import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostPreviewService} from '../server/boost-preview-service.mjs';
const player='123e4567-e89b-42d3-a456-426614174001';
const run='123e4567-e89b-42d3-a456-426614174002';
test('preview adapter passes validated requests',async()=>{
 const calls=[];
 const service=createBoostPreviewService({call:async(op,input)=>{
  calls.push({op,input});
  return op==='boost_slot_spin'?{day:'2026-10-20',boost:'time',reels:['time','time','time'],replayed:false}:{boost:'score',replayed:false,remaining:1};
 }});
 assert.equal((await service.spin(player)).boost,'time');
 assert.equal((await service.reserve(player,run,'score')).remaining,1);
 assert.equal(calls.length,2);
 assert.equal(calls[0].op,'boost_slot_spin');
 assert.equal(calls[1].op,'boost_reserve');
});
test('preview adapter rejects invalid identifiers',async()=>{
 const service=createBoostPreviewService({call:async()=>({})});
 await assert.rejects(service.spin('invalid'),TypeError);
 await assert.rejects(service.reserve(player,'invalid','time'),TypeError);
});
