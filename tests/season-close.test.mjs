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
