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
 const handle=createBoostPreviewHandler({enabled:true,allowReserve:true,resolvePlayer:async()=>player,transport:{call:async()=>{calls++;}}});
 assert.equal((await handle(request('/api/boost-preview/slot/spin',{}, {origin:'https://other.example'}))).status,403);
 assert.equal((await handle(request('/api/boost-preview/reserve',{runId:'bad',boost:'time'}))).status,400);
 assert.equal(calls,0);
});

test('reservation endpoint stays locked even when slot preview is enabled',async()=>{
 let calls=0;
 const handle=createBoostPreviewHandler({enabled:true,resolvePlayer:async()=>player,transport:{call:async()=>{calls++;}}});
 const res=await handle(request('/api/boost-preview/reserve',{runId:run,boost:'time'}));
 assert.equal(res.status,403);
 assert.equal(calls,0);
});
test('unrecognized endpoint cannot invoke preview RPC',async()=>{
 let calls=0;
 const handle=createBoostPreviewHandler({enabled:true,resolvePlayer:async()=>player,transport:{call:async()=>{calls++;}}});
 assert.equal((await handle(request('/api/boost-preview/unrecognized',{}))).status,404);
 assert.equal(calls,0);
});

test('oversized declared JSON payload is rejected without RPC',async()=>{
 let calls=0;
 const handle=createBoostPreviewHandler({enabled:true,resolvePlayer:async()=>player,transport:{call:async()=>{calls++;}}});
 const res=await handle(request('/api/boost-preview/slot/spin',{}, {'content-length':'4096'}));
 assert.equal(res.status,413);
 assert.equal(calls,0);
});

test('oversized streamed JSON without content-length is rejected before RPC',async()=>{
 let calls=0;
 const handle=createBoostPreviewHandler({enabled:true,resolvePlayer:async()=>player,transport:{call:async()=>{calls++;}}});
 const huge='x'.repeat(4096);
 const req=new Request(origin+'/api/boost-preview/slot/spin',{
  method:'POST',headers:{origin,'content-type':'application/json'},
  body:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(huge));controller.close();}}),
  duplex:'half'
 });
 const res=await handle(req);
 assert.equal(res.status,413);
 assert.equal(calls,0);
});

test('inventory endpoint uses authenticated player and read-only RPC',async()=>{
 const calls=[];
 const handle=createBoostPreviewHandler({enabled:true,resolvePlayer:async()=>player,transport:{call:async(op,payload)=>{
  calls.push({op,payload});return {time:2,score:1,sc:0};
 }}});
 const response=await handle(request('/api/boost-preview/inventory',{playerId:'forged'}));
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{time:2,score:1,sc:0});
 assert.equal(calls[0].op,'boost_inventory_read');
 assert.equal(calls[0].payload.playerId,player);
});

test('welcome gift stays locked without explicit enable flag',async()=>{
 let calls=0;
 const handle=createBoostPreviewHandler({enabled:true,resolvePlayer:async()=>player,transport:{call:async()=>{calls++;}}});
 const res=await handle(request('/api/boost-preview/welcome-grant',{}));
 assert.equal(res.status,403);
 assert.equal(calls,0);
});
test('enabled welcome gift uses authenticated player identity',async()=>{
 const calls=[];
 const handle=createBoostPreviewHandler({enabled:true,allowWelcomeGrant:true,resolvePlayer:async()=>player,transport:{call:async(op,payload)=>{
  calls.push({op,payload});
  return {alreadyGranted:false,time:1,score:1,sc:1,granted:{time:1,score:1,sc:1}};
 }}});
 const res=await handle(request('/api/boost-preview/welcome-grant',{playerId:'forged'}));
 assert.equal(res.status,200);
 assert.equal((await res.json()).alreadyGranted,false);
 assert.deepEqual(calls,[{op:'boost_welcome_grant',payload:{playerId:player}}]);
});
