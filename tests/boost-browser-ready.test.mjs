import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostBrowserReady} from '../js/boost-browser-ready.mjs';
const inventory={time:1,score:0,sc:0};
test('browser starts TIME only after trusted 65-second confirmation',async()=>{
 let began=null;
 const ready=createBoostBrowserReady({inventory,startOfficialRun:async boost=>({runId:'run',token:'signed',boost,durationSeconds:65}),beginGame:run=>{began=run;}});
 ready.select('time');
 assert.equal(began,null);
 const run=await ready.start();
 assert.equal(run.durationSeconds,65);
 assert.equal(began.boost,'time');
 await assert.rejects(ready.start(),/already started/);
});
test('browser refuses mismatched duration or failed server START',async()=>{
 let begins=0;
 const wrong=createBoostBrowserReady({inventory,startOfficialRun:async boost=>({runId:'run',token:'signed',boost,durationSeconds:60}),beginGame:()=>{begins++;}});
 wrong.select('time');
 await assert.rejects(wrong.start(),/duration not confirmed/);
 const failed=createBoostBrowserReady({inventory,startOfficialRun:async()=>{throw Error('offline');},beginGame:()=>{begins++;}});
 failed.select('time');
 await assert.rejects(failed.start(),/offline/);
 assert.equal(begins,0);
});
test('browser NONE keeps 60 seconds',async()=>{
 let began=null;
 const ready=createBoostBrowserReady({inventory,startOfficialRun:async boost=>({runId:'run',token:'signed',boost,durationSeconds:60}),beginGame:run=>{began=run;}});
 await ready.start();
 assert.equal(began.durationSeconds,60);
});

test('real game handoff stays disabled until staging authentication is configured',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../game.js',import.meta.url),'utf8');
 assert.match(source,/function applyConfirmedBoostRun\(run\)/);
 assert.match(source,/const stagingBoostStartEnabled=false/);
 assert.match(source,/run\.durationSeconds!==\(run\.boost==='time'\?65:60\)/);
 assert.doesNotMatch(source,/URLSearchParams\(location\.search\).*GAME_DURATION/);
});

test('staging START client requires official server confirmation',async()=>{
 const {createBoostStartClient}=await import('../js/boost-start-client.mjs');
 let requestPath,requestOptions;
 const start=createBoostStartClient({fetcher:async(path,options)=>{
  requestPath=path;requestOptions=options;
  return {ok:true,json:async()=>({runId:'server-run',token:'signed-token',boost:'time',durationSeconds:65})};
 }});
 const result=await start('time');
 assert.equal(result.durationSeconds,65);
 assert.equal(requestPath,'/api/boost-staging/start');
 assert.equal(requestOptions.credentials,'same-origin');
 assert.equal(JSON.parse(requestOptions.body).boost,'time');
 const mismatch=createBoostStartClient({fetcher:async()=>({ok:true,json:async()=>({runId:'run',token:'token',boost:'time',durationSeconds:60})})});
 await assert.rejects(mismatch('time'),/Invalid official/);
 const offline=createBoostStartClient({fetcher:async()=>({ok:false})});
 await assert.rejects(offline('time'),/unavailable/);
});
test('isolated staging START endpoint remains off unless enabled',async()=>{
 const {createBoostStartHandler}=await import('../server/boost-start-handler.mjs');
 const handler=createBoostStartHandler({
  resolvePlayer:async()=>{throw Error('must not authenticate');},
  readInventory:async()=>{throw Error('must not read inventory');},
  transport:{call:async()=>{throw Error('must not reserve');}},
  secret:'staging-test-secret-isolated-12345678901234567890'
 });
 const response=await handler(new Request('https://staging.example/api/boost-staging/start',{method:'POST'}));
 assert.equal(response.status,403);
});
