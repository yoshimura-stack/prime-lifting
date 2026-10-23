import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostStagingApi} from '../server/boost-staging-api.mjs';
import {createBoostStagingTransport,BOOST_STAGING_RPC_NAMES} from '../server/boost-staging-transport.mjs';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const secret='staging-atomic-integration-secret-12345678901234567890';
for(const boost of [null,'time','score','sc'])test('atomic ranked finish performs exactly one verified DB submit: '+(boost??'normal'),async()=>{
 const calls=[];let saved=null;
 const transport=createBoostStagingTransport({callRpc:async(name,{payload})=>{
  calls.push({name,payload});
  if(name===BOOST_STAGING_RPC_NAMES.boost_start_none)return {runId,replayed:false};
  if(name===BOOST_STAGING_RPC_NAMES.boost_reserve)return {boost:payload.boost,remaining:1,replayed:false};
  if(name===BOOST_STAGING_RPC_NAMES.boost_atomic_ranked_submit){
   if(saved)assert.deepEqual(saved,payload);else saved=payload;
   return {runId,playScore:payload.playScore,replayed:calls.filter(x=>x.name===name).length>1,personalBest:!saved?.replayed};
  }
  throw Error('Unexpected DB RPC '+name);
 }});
 const api=createBoostStagingApi({transport,secret,clock:()=>Date.UTC(2026,9,23),newRunId:()=>runId,atomicRankedSubmit:true});
 const start=await api.start({authenticatedPlayerId:playerId,body:{boost}});
 const body={runId,token:start.token,events:[],worldWidth:1000,device:'pc'};
 const first=await api.finish({authenticatedPlayerId:playerId,body});
 const retry=await api.finish({authenticatedPlayerId:playerId,body});
 assert.equal(first.boost,boost);assert.equal(first.replayed,false);assert.equal(retry.replayed,true);
 assert.equal(saved.boost,boost);
 assert.equal(calls.filter(x=>x.name===BOOST_STAGING_RPC_NAMES.boost_atomic_ranked_submit).length,2);
 assert.equal(calls.filter(x=>x.name===BOOST_STAGING_RPC_NAMES.boost_verified_receipt).length,0);
});
test('missing atomic RPC fails closed; no receipt-only fallback',async()=>{
 let receipts=0;
 const transport={call:async(op,payload)=>{
  if(op==='boost_start_none')return {runId,replayed:false};
  if(op==='boost_atomic_ranked_submit')throw new Error('RPC unavailable');
  if(op==='boost_verified_receipt'){receipts++;return {runId,playScore:payload.playScore,replayed:false};}
  throw Error(op);
 }};
 const api=createBoostStagingApi({transport,secret,newRunId:()=>runId,clock:()=>Date.UTC(2026,9,23),atomicRankedSubmit:true});
 const start=await api.start({authenticatedPlayerId:playerId,body:{boost:null}});
 await assert.rejects(api.finish({authenticatedPlayerId:playerId,body:{runId,token:start.token,events:[],worldWidth:1000,device:'pc'}}),/RPC unavailable/);
 assert.equal(receipts,0);
});
