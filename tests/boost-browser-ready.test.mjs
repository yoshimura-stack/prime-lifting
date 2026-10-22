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
