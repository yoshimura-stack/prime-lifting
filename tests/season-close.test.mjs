import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createWorker,OCTOBER_CLOSE_AT} from '../server/worker.mjs';
const origin='https://test.example';
const limiter={limit:async()=>({success:true})};
const env={ASSETS:{fetch:()=>new Response('normal game')},AUTH_LIMITER:limiter,API_LIMITER:limiter};
const req=(path,method='GET')=>new Request(origin+path,{method,headers:method==='POST'?{Origin:origin}:{}});
test('JST midnight is the exact season cutoff, without a client-clock dependency',async()=>{
 const before=createWorker({now:()=>OCTOBER_CLOSE_AT-1});
 const after=createWorker({now:()=>OCTOBER_CLOSE_AT});
 assert.equal(await (await before.fetch(req('/'),env)).text(),'normal game');
 assert.equal((await (await before.fetch(req('/api/season/status'),env)).json()).closed,false);
 const page=await after.fetch(req('/'),env);assert.equal(page.status,200);assert.match(await page.text(),/MAINTENANCE/);
 assert.equal((await (await after.fetch(req('/api/season/status'),env)).json()).closed,true);
 for(const path of ['/api/leaderboard','/api/leaderboard/all','/api/champion','/api/game/start','/api/scores','/api/daily/status','/api/register','/api/login','/api/admin/reset']){
  const res=await after.fetch(req(path,path==='/api/game/start'||path==='/api/scores'||path==='/api/admin/reset'?'POST':'GET'),env);
  assert.equal(res.status,423,path);
 }
 assert.equal(await (await after.fetch(req('/style.css'),env)).text(),'normal game');
});

test('preview flag restores game screen but keeps October API locked',async()=>{
 const worker=createWorker({now:()=>OCTOBER_CLOSE_AT+86400000});
 const preview={...env,SEASON_PREVIEW_ENABLED:'true'};
 assert.equal(await (await worker.fetch(req('/'),preview)).text(),'normal game');
 const status=await (await worker.fetch(req('/api/season/status'),preview)).json();
 assert.equal(status.closed,false);
 assert.equal(status.preview,true);
 assert.equal(status.scoresLocked,true);
 assert.equal((await worker.fetch(req('/api/game/start','POST'),preview)).status,423);
 assert.equal((await worker.fetch(req('/api/scores','POST'),preview)).status,423);
});

test('November reopens only with explicit readiness flag and locks after November',async()=>{
 const november=Date.parse('2026-11-11T08:00:00Z');
 const worker=createWorker({now:()=>november});
 const locked=await (await worker.fetch(req('/api/season/status'),env)).json();
 assert.equal(locked.closed,true);
 assert.equal(locked.scoresLocked,true);
 const ready={...env,SEASON_02_READY:'true'};
 assert.equal(await (await worker.fetch(req('/'),ready)).text(),'normal game');
 const active=await (await worker.fetch(req('/api/season/status'),ready)).json();
 assert.equal(active.closed,false);
 assert.equal(active.scoresLocked,false);
 assert.equal(active.closesAt,'2026-12-01T00:00:00+09:00');
 const ended=createWorker({now:()=>Date.parse('2026-11-30T15:00:00Z')});
 assert.equal((await (await ended.fetch(req('/api/season/status'),ready)).json()).closed,true);
 assert.equal((await ended.fetch(req('/api/game/start','POST'),ready)).status,423);
});

test('November season refuses legacy destructive account reset even with an active season',async()=>{
 const worker=createWorker({now:()=>Date.parse('2026-11-12T10:00:00Z')});
 const ready={...env,SEASON_02_READY:'true'};
 const response=await worker.fetch(req('/api/admin/reset','POST'),ready);
 assert.equal(response.status,403);
 assert.match((await response.json()).error,/一括削除は禁止/);
});
