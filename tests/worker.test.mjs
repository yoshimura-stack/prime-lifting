import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createWorker} from '../server/worker.mjs';
import {replay,RULESET} from '../server/replay.mjs';
const limiter={limit:async()=>({success:true})};
const env={SESSION_SECRET:'test-only-secret-012345678901234567890',AUTH_LIMITER:limiter,API_LIMITER:limiter,ASSETS:{fetch:()=>new Response('asset')}};
const base='https://test.example';
const request=(path,body,cookie)=>new Request(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
test('unconfigured database fails closed; assets still work',async()=>{
 const worker=createWorker();assert.equal((await worker.fetch(request('/api/leaderboard'),env)).status,503);
 assert.equal(await (await worker.fetch(request('/'),env)).text(),'asset');
});
test('rejects missing auth, cross-origin, weak PIN, missing limit binding and oversized body',async()=>{
 const worker=createWorker();assert.equal((await worker.fetch(request('/api/me'),env)).status,401);
 const cross=request('/api/login',{name:'A',pin:'123456'});cross.headers.set('Origin','https://evil.example');assert.equal((await worker.fetch(cross,env)).status,403);
 assert.equal((await worker.fetch(request('/api/login',{name:'A',pin:'1234'}),env)).status,400);
 assert.equal((await worker.fetch(request('/api/leaderboard'),{...env,API_LIMITER:null})).status,503);
 assert.equal((await worker.fetch(request('/api/login',{name:'A',pin:'1'.repeat(512001)}),env)).status,413);
 assert.equal((await worker.fetch(request('/api/leaderboard'),{...env,API_LIMITER:{limit:async()=>({success:false})}})).status,429);
});
test('mock adapter: register, cross-device login, authenticated replay, retry and top ten',async()=>{
 let time=100000,player={id:'player-one',name:'A',best:15000,rank:1,kit:'japan-01',lastPlayed:null},calls=[];
 const database=()=>({call:async(op,input)=>{calls.push({op,input});if(op==='leaderboard')return {entries:[player]};if(op==='submit'){assert.equal(input.score,0);assert.equal(input.playerId,player.id);return {player,personalBest:false,newChampion:false};}if(op==='login'&&input.pin!=='123456')return {player:null};return {player};}});
 const worker=createWorker({database,now:()=>time});
 const auth=await worker.fetch(request('/api/register',{name:'A',pin:'123456'}),env);assert.equal(auth.status,200);
 const header=auth.headers.get('set-cookie');assert.match(header,/HttpOnly; Secure; SameSite=Strict/);const cookie=header.split(';')[0];
 assert.equal((await worker.fetch(request('/api/login',{name:'A',pin:'654321'}),env)).status,401);
 const mobile=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),env);assert.equal((await mobile.json()).player.id,player.id);
 assert.equal((await worker.fetch(request('/api/me',null,cookie),env)).status,200);
 const run=await (await worker.fetch(request('/api/game/start',{},cookie),env)).json();
 const input={...run,events:[],kit:'japan-01',device:'mobile',score:999999,playerId:'victim'};
 assert.equal((await worker.fetch(request('/api/scores',input,cookie),env)).status,400);
 time+=64000;const saved=await worker.fetch(request('/api/scores',input,cookie),env);assert.equal(saved.status,200);assert.equal((await saved.json()).score,0);
 assert.equal((await worker.fetch(request('/api/scores',{...input,token:input.token+'x'},cookie),env)).status,401);
 assert.equal((await worker.fetch(request('/api/scores',{...input,events:[{t:-1,n:'act'}]},cookie),env)).status,400);
 assert.equal((await worker.fetch(request('/api/scores',input,cookie),env)).status,200);
 const submissions=calls.filter(c=>c.op==='submit');assert.equal(submissions[0].input.runId,submissions[1].input.runId);
 const top=await (await worker.fetch(request('/api/leaderboard'),env)).json();assert.deepEqual(top.entries,[{name:'A',score:15000,rank:1}]);
 const champion=await (await worker.fetch(request('/api/champion'),env)).json();assert.equal(champion.champion.score,15000);
 time+=8*86400000;assert.equal((await worker.fetch(request('/api/me',null,cookie),env)).status,401);
});
test('server replay matches unchanged engine on real timed input',()=>{
 const game=new LiftingGame(structuredClone(PRIME_DEFAULTS));game.reset();const events=[];let tick=0,lastDir=0;
 while(game.phase!=='ended'){
  const p=game.player,b=game.ball,r=game.regions().find(r=>r.name==='FOOT'&&r.side==='LEFT');
  if(game.phase==='playing'&&b.active&&b.vy>0&&Math.hypot(b.x-r.x,b.y-r.y)<r.r*.65&&game.cooldown===0){events.push({t:tick,n:'act'});game.act();}
  const error=b.x-19-p.x,dir=Math.abs(error)<4?0:Math.sign(error);if(dir!==lastDir){events.push({t:tick,n:'move',v:dir});lastDir=dir;}
  game.update(PRIME_DEFAULTS.FIXED_STEP,dir);tick++;
 }
 assert.ok(game.score>0);assert.deepEqual(replay(events),{score:game.score,hits:game.hits,combo:game.bestCombo,drops:game.drops});assert.equal(RULESET,'cockpit-v42');
});
test('admin login requires configured password and reset needs valid short-lived token and confirmation',async()=>{
 let time=100000,resets=0;
 const worker=createWorker({now:()=>time,database:()=>({resetAllPlayers:async()=>{resets++;}})});
 const configured={...env,ADMIN_PASSWORD:'strong-private-password-for-test'};
 assert.equal((await worker.fetch(request('/api/admin/login',{username:'host',password:'anything'}),env)).status,503);
 assert.equal((await worker.fetch(request('/api/admin/login',{username:'host',password:'wrong-password'}),configured)).status,401);
 assert.equal((await worker.fetch(request('/api/admin/login',{username:'someone',password:configured.ADMIN_PASSWORD}),configured)).status,401);
 const login=await worker.fetch(request('/api/admin/login',{username:'host',password:configured.ADMIN_PASSWORD}),configured);
 assert.equal(login.status,200);const {token}=await login.json();
 assert.equal((await worker.fetch(request('/api/admin/reset',{token,confirm:'WRONG'}),configured)).status,400);
 assert.equal(resets,0);
 assert.equal((await worker.fetch(request('/api/admin/reset',{token,confirm:'DELETE ALL PLAYERS'}),configured)).status,200);
 assert.equal(resets,1);
 time+=301000;
 assert.equal((await worker.fetch(request('/api/admin/reset',{token,confirm:'DELETE ALL PLAYERS'}),configured)).status,401);
 assert.equal(resets,1);
});
