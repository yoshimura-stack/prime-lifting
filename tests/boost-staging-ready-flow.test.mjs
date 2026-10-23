import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostStagingReadyFlow} from '../js/boost-staging-ready-flow.mjs';
const origin='https://isolated-staging.example',runId='123e4567-e89b-42d3-a456-426614174002';
test('ready inventory selection starts server-confirmed TIME game and submits result',async()=>{
 const calls=[],games=[],statuses=[];
 const fetcher=async(url,options)=>{
  const body=JSON.parse(options.body);calls.push({url,body});
  return {ok:true,json:async()=>url.endsWith('/start')?
   {runId,token:'signed-server-token-abcdef',boost:body.boost,durationSeconds:65}:
   {runId,boost:'time',playScore:0,replayed:false}};
 };
 const flow=createBoostStagingReadyFlow({inventory:{time:1,score:0,sc:2},getBearer:()=> 'preview-session',fetcher,origin,beginGame:run=>games.push(run),onStatus:s=>statuses.push(s)});
 assert.throws(()=>flow.select('score'),/out of stock/);
 flow.select('time');
 const run=await flow.start();
 assert.equal(run.durationSeconds,65);
 assert.equal(games.length,1);
 assert.equal(games[0].boost,'time');
 assert.equal(flow.activeRun.runId,runId);
 assert.equal((await flow.finish({events:[],worldWidth:1000,device:'pc'})).playScore,0);
 assert.equal(flow.activeRun,null);
 assert.equal(calls.length,2);
 assert.deepEqual(statuses,['BOOST開始を確認中','プレイ開始']);
});
