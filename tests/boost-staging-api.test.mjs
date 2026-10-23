import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostStagingApi} from '../server/boost-staging-api.mjs';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const secret='staging-secret-123456789012345678901234567890';
const now=Date.UTC(2026,9,23);
function harness(){
 const calls=[];let saved=null;
 const transport={call:async(op,payload)=>{
  calls.push({op,payload});
  if(op==='boost_start_none')return {runId,replayed:false};
  if(op==='boost_reserve')return {boost:payload.boost,remaining:1,replayed:false};
  if(op==='boost_verified_receipt'){
   if(saved){assert.deepEqual(saved,payload);return {runId,playScore:payload.playScore,replayed:true};}
   saved=payload;return {runId,playScore:payload.playScore,replayed:false};
  }
  throw Error('Unexpected RPC '+op);
 }};
 return {api:createBoostStagingApi({transport,secret,clock:()=>now,newRunId:()=>runId}),calls};
}
for(const boost of [null,'score','time','sc'])test('authenticated staging start and finish: '+(boost??'NONE'),async()=>{
 const {api,calls}=harness();
 const run=await api.start({authenticatedPlayerId:playerId,body:{boost}});
 const input={runId,token:run.token,events:[],worldWidth:1000,device:'pc'};
 const first=await api.finish({authenticatedPlayerId:playerId,body:input});
 const second=await api.finish({authenticatedPlayerId:playerId,body:input});
 assert.equal(first.boost,boost);
 assert.equal(second.replayed,true);
 assert.equal(calls[0].op,boost===null?'boost_start_none':'boost_reserve');
 assert.deepEqual(calls.slice(1).map(x=>x.op),['boost_verified_receipt','boost_verified_receipt']);
});
test('reject forged identity and claimed BOOST fields before any DB call',async()=>{
 const {api,calls}=harness();
 await assert.rejects(api.start({authenticatedPlayerId:playerId,body:{playerId,boost:'score'}}),{status:403});
 await assert.rejects(api.start({authenticatedPlayerId:playerId,body:{runId,boost:'score'}}),{status:403});
 await assert.rejects(api.finish({authenticatedPlayerId:playerId,body:{boost:'score'}}),{status:403});
 await assert.rejects(api.finish({authenticatedPlayerId:playerId,body:{baseScore:50000}}),{status:403});
 assert.equal(calls.length,0);
});
test('reject signed run submitted by a different authenticated player',async()=>{
 const {api,calls}=harness();
 const run=await api.start({authenticatedPlayerId:playerId,body:{boost:'score'}});
 await assert.rejects(api.finish({authenticatedPlayerId:'123e4567-e89b-42d3-a456-426614174099',body:{runId,token:run.token,events:[],worldWidth:1000,device:'pc'}}),{status:401});
 assert.deepEqual(calls.map(x=>x.op),['boost_reserve']);
});
