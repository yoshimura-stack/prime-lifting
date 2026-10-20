import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostPreviewHandler} from '../server/boost-preview-handler.mjs';
const origin='https://preview.example';
const player='123e4567-e89b-42d3-a456-426614174001';
const run='123e4567-e89b-42d3-a456-426614174002';
const request=(path,body,headers={})=>new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
test('disabled preview handler never accesses DB',async()=>{
 let calls=0;
 const handle=createBoostPreviewHandler({transport:{call:async()=>{calls++;}},resolvePlayer:async()=>player});
 const res=await handle(request('/api/boost-preview/slot/spin',{}));
 assert.equal(res.status,403);
 assert.equal(calls,0);
});
test('preview handler authenticates before issuing RPC',async()=>{
 let calls=0;
 const handle=createBoostPreviewHandler({enabled:true,transport:{call:async()=>{calls++;}},resolvePlayer:async()=>null});
 assert.equal((await handle(request('/api/boost-preview/slot/spin',{}))).status,401);
 assert.equal(calls,0);
});
test('preview handler uses resolved identity rather than client playerId',async()=>{
 const calls=[];
 const handle=createBoostPreviewHandler({enabled:true,resolvePlayer:async()=>player,transport:{call:async(op,payload)=>{
  calls.push({op,payload});
  return {day:'2026-10-20',boost:'time',reels:['time','time','time'],replayed:false};
 }}});
 const res=await handle(request('/api/boost-preview/slot/spin',{playerId:'forged'}));
 assert.equal(res.status,200);
 assert.equal(calls[0].payload.playerId,player);
});
test('preview handler denies cross-origin and invalid reserve',async()=>{
 let calls=0;
 const handle=createBoostPreviewHandler({enabled:true,resolvePlayer:async()=>player,transport:{call:async()=>{calls++;}}});
 assert.equal((await handle(request('/api/boost-preview/slot/spin',{}, {origin:'https://other.example'}))).status,403);
 assert.equal((await handle(request('/api/boost-preview/reserve',{runId:'bad',boost:'time'}))).status,400);
 assert.equal(calls,0);
});
