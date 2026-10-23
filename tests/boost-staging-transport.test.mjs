import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostStagingTransport,BOOST_STAGING_RPC_NAMES} from '../server/boost-staging-transport.mjs';
import {createBoostStagingApi} from '../server/boost-staging-api.mjs';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const secret='staging-secret-123456789012345678901234567890';
test('trusted adapter wraps payload exactly once and blocks unknown RPCs',async()=>{
 const calls=[];
 const transport=createBoostStagingTransport({callRpc:async(name,body)=>{calls.push({name,body});return {ok:true};}});
 assert.deepEqual(await transport.call('boost_inventory_read',{playerId}),{ok:true});
 assert.deepEqual(calls,[{name:'lifting_api_boost_inventory_read',body:{payload:{playerId}}}]);
 await assert.rejects(transport.call('submit',{score:999999}),/Unrecognized BOOST RPC/);
 await assert.rejects(transport.call('boost_reserve',null),/Invalid RPC payload/);
 assert.equal(calls.length,1);
});
test('signed start and replay-verified finish reach exact private staging RPCs',async()=>{
 const calls=[];let receipt=null;
 const transport=createBoostStagingTransport({callRpc:async(name,{payload})=>{
  calls.push({name,payload});
  if(name===BOOST_STAGING_RPC_NAMES.boost_reserve)return {boost:payload.boost,remaining:1,replayed:false};
  if(name===BOOST_STAGING_RPC_NAMES.boost_verified_receipt){
   if(receipt)assert.deepEqual(payload,receipt);
   else receipt=payload;
   return {runId:payload.runId,playScore:payload.playScore,replayed:calls.filter(x=>x.name===name).length>1};
  }
  throw Error('Unexpected RPC '+name);
 }});
 const api=createBoostStagingApi({transport,secret,clock:()=>Date.UTC(2026,9,23),newRunId:()=>runId});
 const start=await api.start({authenticatedPlayerId:playerId,body:{boost:'score'}});
 assert.equal(start.durationSeconds,60);
 const input={runId,token:start.token,events:[],worldWidth:1000,device:'pc'};
 const first=await api.finish({authenticatedPlayerId:playerId,body:input});
 const second=await api.finish({authenticatedPlayerId:playerId,body:input});
 assert.equal(first.replayed,false);assert.equal(second.replayed,true);
 assert.deepEqual(calls.map(x=>x.name),['lifting_api_boost_reserve','lifting_api_boost_verified_receipt','lifting_api_boost_verified_receipt']);
 assert.equal(receipt.playerId,playerId);assert.equal(receipt.boost,'score');
});
