import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostStagingRunHandler} from '../server/boost-staging-run-handler.mjs';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const secret='staging-http-run-secret-123456789012345678901234567890';
const origin='https://isolated-staging.example';
const make=(path,body,headers={})=>new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
function harness({enabled=true,resolvePlayer=async()=>playerId}={}){
 const calls=[];let submissions=0;
 const transport={call:async(op,payload)=>{
  calls.push({op,payload});
  if(op==='boost_start_none')return {runId,replayed:false};
  if(op==='boost_reserve')return {boost:payload.boost,remaining:1,replayed:false};
  if(op==='boost_atomic_ranked_submit')return {runId,playScore:payload.playScore,replayed:submissions++>0,personalBest:true};
  throw Error('Unexpected RPC '+op);
 }};
 return {handler:createBoostStagingRunHandler({transport,resolvePlayer,secret,clock:()=>Date.UTC(2026,9,23),newRunId:()=>runId,enabled}),calls};
}
for(const boost of [null,'time','score','sc'])test('authenticated staging HTTP signed run -> atomic score '+(boost??'normal'),async()=>{
 const {handler,calls}=harness();
 const started=await handler(make('/api/boost-stage/start',{boost}));
 assert.equal(started.status,200);const run=await started.json();
 assert.equal(run.durationSeconds,boost==='time'?65:60);
 const finishBody={runId,token:run.token,events:[],worldWidth:1000,device:'pc'};
 const saved=await handler(make('/api/boost-stage/finish',finishBody));
 assert.equal(saved.status,200);assert.equal((await saved.json()).boost,boost);
 const retry=await handler(make('/api/boost-stage/finish',finishBody));
 assert.equal(retry.status,200);assert.equal((await retry.json()).replayed,true);
 assert.deepEqual(calls.map(c=>c.op),[boost?'boost_reserve':'boost_start_none','boost_atomic_ranked_submit','boost_atomic_ranked_submit']);
});
test('reject disabled, unauthenticated, cross-origin and forged identity before DB',async()=>{
 const {handler,calls}=harness();
 const disabled=harness({enabled:false}).handler;
 assert.equal((await disabled(make('/api/boost-stage/start',{boost:null}))).status,403);
 assert.equal((await harness({resolvePlayer:async()=>null}).handler(make('/api/boost-stage/start',{boost:null}))).status,401);
 assert.equal((await handler(make('/api/boost-stage/start',{playerId,boost:'score'}))).status,403);
 assert.equal((await handler(make('/api/boost-stage/start',{boost:'score'},{origin:'https://evil.example'}))).status,403);
 assert.equal(calls.length,0);
});
test('missing atomic RPC returns 503 and does not fall back to receipt',async()=>{
 let receiptCalls=0;
 const transport={call:async(op)=>{
  if(op==='boost_start_none')return {runId,replayed:false};
  if(op==='boost_atomic_ranked_submit')throw Error('Missing RPC');
  if(op==='boost_verified_receipt'){receiptCalls++;return {};}
  throw Error(op);
 }};
 const handler=createBoostStagingRunHandler({transport,resolvePlayer:async()=>playerId,secret,clock:()=>Date.UTC(2026,9,23),newRunId:()=>runId,enabled:true});
 const start=await(await handler(make('/api/boost-stage/start',{boost:null}))).json();
 assert.equal((await handler(make('/api/boost-stage/finish',{runId,token:start.token,events:[],worldWidth:1000,device:'pc'}))).status,503);
 assert.equal(receiptCalls,0);
});
