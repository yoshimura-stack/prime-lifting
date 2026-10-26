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
 const flow=createBoostStagingReadyFlow({inventory:{time:2,score:0,sc:2},getBearer:()=> 'preview-session',fetcher,origin,beginGame:run=>games.push(run),onStatus:s=>statuses.push(s)});
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
 flow.select('time');
 await flow.start();
 assert.equal(games.length,2);
 assert.throws(()=>flow.select('time'),/out of stock/);
 assert.deepEqual(statuses,['BOOST開始を確認中','プレイ開始','BOOST開始を確認中','プレイ開始']);
});

test('a confirmed reservation consumes local stock, but a failed START does not',async()=>{
 let attempts=0;
 const flow=createBoostStagingReadyFlow({inventory:{time:1,score:0,sc:0},getBearer:()=> 'preview-session',origin,beginGame:()=>{},fetcher:async()=>{
  attempts++;
  if(attempts===1)return {ok:false,status:503};
  return {ok:true,json:async()=>({runId,token:'signed-server-token-abcdef',boost:'time',durationSeconds:65})};
 }});
 flow.select('time');
 await assert.rejects(()=>flow.start(),/rejected/);
 flow.select('time');
 await flow.start();
 assert.throws(()=>flow.select('time'),/Run already started/);
});
