import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostStagingHttpClient} from '../js/boost-staging-http-client.mjs';
const runId='123e4567-e89b-42d3-a456-426614174002',origin='https://isolated-staging.example';
function harness({failFinishOnce=false,invalidStart=false}={}){
 const calls=[];let fail=failFinishOnce;
 const fetcher=async(url,options)=>{
  const body=JSON.parse(options.body);calls.push({url,options,body});
  if(url.endsWith('/start'))return {ok:true,json:async()=>({runId,token:invalidStart?'x':'a'.repeat(24),boost:body.boost,durationSeconds:body.boost==='time'?65:60})};
  if(fail){fail=false;return {ok:false,status:503};}
  return {ok:true,json:async()=>({runId,boost:'score',playScore:1100,replayed:false})};
 };
 const client=createBoostStagingHttpClient({fetcher,getBearer:()=> 'short-lived-test-token',origin});
 return {client,calls};
}
test('SCORE start and finish use only signed server run, never submit client authority',async()=>{
 const {client,calls}=harness();
 const started=await client.start('score');
 assert.equal(started.runId,runId);
 assert.equal(client.activeRun.runId,runId);
 const result=await client.finish({events:[],worldWidth:1000,device:'pc',claimedScore:1100});
 assert.equal(result.playScore,1100);
 assert.equal(client.activeRun,null);
 assert.deepEqual(calls.map(x=>x.url),[origin+'/api/boost-stage/start',origin+'/api/boost-stage/finish']);
 assert.deepEqual(calls[0].body,{boost:'score'});
 assert.deepEqual(Object.keys(calls[1].body).sort(),['claimedScore','device','events','runId','token','worldWidth'].sort());
 assert.equal(calls[0].options.credentials,'omit');
 assert.equal(calls[1].options.headers.authorization,'Bearer short-lived-test-token');
});
test('failed finish preserves run ID and token for idempotent retry',async()=>{
 const {client,calls}=harness({failFinishOnce:true});
 await client.start('score');
 const payload={events:[],worldWidth:1000,device:'mobile'};
 await assert.rejects(client.finish(payload),/503/);
 assert.equal(client.activeRun.runId,runId);
 await assert.rejects(client.start('time'),/already active/);
 await client.finish(payload);
 assert.equal(calls[1].body.runId,calls[2].body.runId);
 assert.equal(calls[1].body.token,calls[2].body.token);
});
test('reject malformed server confirmation, unsupported BOOST and missing auth',async()=>{
 const {client}=harness({invalidStart:true});
 await assert.rejects(client.start('time'),/Unconfirmed/);
 assert.equal(client.activeRun,null);
 await assert.rejects(client.start('forged'),/Invalid BOOST/);
 const noAuth=createBoostStagingHttpClient({fetcher:async()=>{throw Error('must not fetch');},getBearer:()=>'',origin});
 await assert.rejects(noAuth.start(null),/session required/);
});
test('never send malformed replay to server',async()=>{
 const {client,calls}=harness();await client.start('score');
 await assert.rejects(client.finish({events:[],worldWidth:1234,device:'pc'}),/Invalid replay/);
 assert.equal(calls.length,1);
});
