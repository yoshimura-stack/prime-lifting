import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createWorker,finalScore} from '../server/worker.mjs';
import {replay,RULESET} from '../server/replay.mjs';
const limiter={limit:async()=>({success:true})};
const env={SESSION_SECRET:'test-only-secret-012345678901234567890',AUTH_LIMITER:limiter,API_LIMITER:limiter,ASSETS:{fetch:()=>new Response('asset')}};
const base='https://test.example';
const request=(path,body,cookie,extraHeaders={})=>new Request(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:base}:{}),...(cookie?{Cookie:cookie}:{}),...extraHeaders},body:body?JSON.stringify(body):undefined});
test('device score multiplier is neutral for PC and mobile',()=>{
 assert.equal(finalScore(30000,'pc'),30000);
 assert.equal(finalScore(30000,'mobile'),30000);
 assert.equal(finalScore(0,'pc'),0);
 assert.equal(finalScore(0,'mobile'),0);
});
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
 const database=()=>({call:async(op,input)=>{calls.push({op,input});if(op==='achievement_merge')return {mask:0};if(op==='leaderboard')return {entries:[player]};if(op==='submit'){assert.equal(input.score,0);assert.equal(input.baseScore,0);assert.equal(input.mobileBonus,0);assert.equal(input.playerId,player.id);return {player,personalBest:false,newChampion:false};}if(op==='login'&&input.pin!=='123456')return {player:null};return {player};}});
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
 const top=await (await worker.fetch(request('/api/leaderboard'),env)).json();assert.deepEqual(top.entries,[{name:'A',score:15000,rank:1,device:null,achievementCount:0,baseTitleMask:0,master:false,nextTitleMask:0,nextAchievementCount:0,liftingGod:false}]);
 player={...player,lastPlayed:'2026-10-21T23:30:00+00:00'};
 const dated=await (await worker.fetch(request('/api/leaderboard'),env)).json();assert.equal(dated.entries[0].lastPlayed,'2026-10-21T23:30:00+00:00');
 const all=await (await worker.fetch(request('/api/leaderboard/all'),env)).json();assert.deepEqual(all.entries,dated.entries);assert.ok(calls.some(c=>c.op==='leaderboard'&&c.input.limit===200));
 const champion=await (await worker.fetch(request('/api/champion'),env)).json();assert.equal(champion.champion.score,15000);assert.equal(champion.champion.device,null);
 time+=8*86400000;assert.equal((await worker.fetch(request('/api/me',null,cookie),env)).status,401);
});
test('server replay matches unchanged engine on real timed input',()=>{
 const game=new LiftingGame(structuredClone(PRIME_DEFAULTS));game.reset();const events=[];let tick=0,lastDir=0;
 while(game.phase!=='ended'){
  const p=game.player,b=game.ball,r=game.regions().find(r=>r.name==='FOOT'&&r.side==='LEFT');
  if(game.phase==='playing'&&b.active&&game.cooldown===0&&((b.pickup&&Math.abs(b.x-p.x)<=65&&b.y>=game.c.GROUND_Y-85)||(!b.pickup&&b.vy>0&&Math.hypot(b.x-r.x,b.y-r.y)<r.r*.65))){events.push({t:tick,n:'act'});game.act();}
  const error=b.x-19-p.x,dir=Math.abs(error)<4?0:Math.sign(error);if(dir!==lastDir){events.push({t:tick,n:'move',v:dir});lastDir=dir;}
  game.update(PRIME_DEFAULTS.FIXED_STEP,dir);tick++;
 }
 assert.ok(game.score>0);const verified=replay(events);assert.deepEqual({score:verified.score,hits:verified.hits,combo:verified.combo,drops:verified.drops},{score:game.score,hits:game.hits,combo:game.bestCombo,drops:game.drops});assert.ok(verified.achievementProof);assert.equal(RULESET,'cockpit-v42');
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
test('verified scores use signed server device, update mixed-device best, and retry idempotently',async()=>{
 let time=100000,replayScore=30000;
 const player={id:'player-one',name:'A',best:0,rank:1,kit:null,lastPlayed:null},rows=new Map(),submissions=[];
 const database=()=>({call:async(op,input)=>{
  if(op==='achievement_merge')return {mask:0};
  if(op==='submit'){
   submissions.push(input.runId);
   const old=rows.get(input.runId);
   if(!old){const personalBest=input.score>player.best;rows.set(input.runId,{score:input.score,device:input.device});player.best=Math.max(player.best,input.score);player.rank=1;return {player:{...player},personalBest,newChampion:false};}
   return {player:{...player},personalBest:false,newChampion:false};
  }
  return {player:{...player}};
 }});
 const worker=createWorker({database,now:()=>time,replayGame:()=>({score:replayScore,hits:0,combo:0,drops:0})});
 const auth=await worker.fetch(request('/api/register',{name:'A',pin:'123456'}),env),cookie=auth.headers.get('set-cookie').split(';')[0];
 async function play(userAgent,claimedDevice){
  const start=await worker.fetch(request('/api/game/start',{},cookie,{'User-Agent':userAgent}),env),ticket=await start.json();
  time+=64000;
  const submission={...ticket,events:[],kit:'japan-01',device:claimedDevice,score:999999};
  const response=await worker.fetch(request('/api/scores',submission,cookie),env);
  const duplicate=await worker.fetch(request('/api/scores',submission,cookie),env);
  assert.equal(duplicate.status,response.status);
  assert.equal((await duplicate.json()).score,(await response.clone().json()).score);
  return response;
 }
 const pc=await play('Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0','mobile');
 assert.equal(pc.status,200,await pc.clone().text());assert.equal((await pc.json()).score,30000);
 assert.deepEqual([...rows.values()][0],{score:30000,device:'pc'});
 replayScore=30000;
 const mobile=await play('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0 Mobile','pc');
 assert.equal(mobile.status,200);const mobileResult=await mobile.json();
 assert.equal(mobileResult.score,30000);assert.equal(mobileResult.player.best,30000);
 assert.deepEqual([...rows.values()][1],{score:30000,device:'mobile'});
 replayScore=35000;
 const pcAgain=await play('Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0','pc');
 assert.equal((await pcAgain.json()).player.best,35000);
 assert.equal(rows.size,3);
 replayScore=0;
 const zero=await play('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0 Mobile','mobile');
 const zeroResult=await zero.json();assert.equal(zeroResult.score,0);
 const beforeRetry=rows.size;
 assert.equal(rows.size,beforeRetry);
 assert.equal(rows.size,4);
 assert.equal(submissions.length,8);
 for(let index=0;index<submissions.length;index+=2)assert.equal(submissions[index],submissions[index+1]);
});

test('leaderboard includes verified collection counts with one batch lookup',async()=>{
 const players=[
  {id:'a',name:'A',best:90000,rank:1,bestDevice:'pc'},
  {id:'b',name:'B',best:80000,rank:2,bestDevice:'mobile'},
  {id:'c',name:'C',best:70000,rank:3,bestDevice:null}
 ];
 const calls=[];
 const worker=createWorker({database:()=>({call:async(op,input)=>{
  calls.push({op,input});
  if(op==='leaderboard')return {entries:players};
  if(op==='achievement_list')return {a:255,b:42};
  throw Error('unexpected RPC');
 }})});
 const response=await worker.fetch(request('/api/leaderboard/all'),env);
 assert.equal(response.status,200);
 const {entries}=await response.json();
 assert.deepEqual(entries.map(e=>[e.name,e.achievementCount,e.master]),[['A',8,true],['B',3,false],['C',0,false]]);
 assert.deepEqual(calls.filter(c=>c.op==='achievement_list').map(c=>c.input.playerIds),[['a','b','c']]);
 assert.deepEqual(entries.map(e=>e.score),[90000,80000,70000]);
});
test('leaderboard survives temporary title lookup outage',async()=>{
 const player={id:'a',name:'A',best:100,rank:1,bestDevice:'pc'};
 const worker=createWorker({database:()=>({call:async(op)=>{
  if(op==='leaderboard')return {entries:[player]};
  throw Error('temporary achievement service outage');
 }})});
 const response=await worker.fetch(request('/api/leaderboard'),env);
 assert.equal(response.status,200);
 const {entries}=await response.json();
 assert.equal(entries[0].achievementCount,0);
});

test('failed achievement merge returns retryable error without dropping the signed run',async()=>{
 let time=100000,attempts=0,submitCalls=0;
 const player={id:'player-one',name:'A',best:0,rank:1,kit:'japan-01'};
 const worker=createWorker({now:()=>time,replayGame:()=>({score:0,hits:0,combo:0,drops:0}),
  database:()=>({call:async(op)=>{
   if(op==='submit'){submitCalls++;return {player,personalBest:false,newChampion:false};}
   if(op==='achievement_merge'){attempts++;if(attempts===1)throw Error('temporary outage');return {mask:0};}
   return {player};
  }})});
 const auth=await worker.fetch(request('/api/register',{name:'A',pin:'123456'}),env);
 const cookie=auth.headers.get('set-cookie').split(';')[0];
 const run=await (await worker.fetch(request('/api/game/start',{},cookie),env)).json();
 time+=64000;
 const submission={...run,events:[],kit:'japan-01'};
 const first=await worker.fetch(request('/api/scores',submission,cookie),env);
 assert.equal(first.status,503);
 assert.match((await first.json()).error,/再試行/);
 const retry=await worker.fetch(request('/api/scores',submission,cookie),env);
 assert.equal(retry.status,200);
 assert.deepEqual((await retry.json()).progress.earned,[]);
 assert.equal(submitCalls,2);
 assert.equal(attempts,2);
});

test('authenticated achievement progress accumulates across separately saved runs',async()=>{
 let time=100000,mask=0;
 const player={id:'player-one',name:'A',best:100,rank:1,kit:'japan-01'};
 const masks=[1,4];let next=0;
 const calls=[];
 const worker=createWorker({now:()=>time,
  replayGame:()=>({score:0,hits:0,combo:next===0?30:0,drops:0,
   achievementProof:{spinKing:next===1}}),
  database:()=>({call:async(op,input)=>{
   calls.push(op);
   if(op==='achievement_get')return {mask};
   if(op==='achievement_merge'){mask|=input.mask;return {mask};}
   if(op==='achievement_list')return {[player.id]:mask};
   if(op==='submit')return {player,personalBest:false,newChampion:false};
   if(op==='leaderboard')return {entries:[player]};
   return {player};
  }})});
 assert.equal((await worker.fetch(request('/api/achievements'),env)).status,401);
 const auth=await worker.fetch(request('/api/register',{name:'A',pin:'123456'}),env);
 assert.equal(auth.status,200);
 const cookie=auth.headers.get('set-cookie').split(';')[0];
 const before=await (await worker.fetch(request('/api/achievements',null,cookie),env)).json();
 assert.deepEqual(before.progress.earned,[]);
 for(let i=0;i<2;i++){
  next=i;
  const ticket=await (await worker.fetch(request('/api/game/start',{},cookie),env)).json();
  time+=64000;
  const response=await worker.fetch(request('/api/scores',{...ticket,events:[],kit:'japan-01'},cookie),env);
  assert.equal(response.status,200);
  const saved=await response.json();
  assert.equal(saved.progress.mask,i===0?1:5);
 }
 const after=await (await worker.fetch(request('/api/achievements',null,cookie),env)).json();
 assert.equal(after.progress.mask,5);
 assert.deepEqual(after.progress.earned,['30 KEEPS CLUB','SPIN KING']);
 assert.equal(after.progress.master,false);
 const leaderboard=await (await worker.fetch(request('/api/leaderboard'),env)).json();
 assert.equal(leaderboard.entries[0].achievementCount,2);
 assert.equal(leaderboard.entries[0].master,false);
 assert.equal(calls.filter(op=>op==='achievement_merge').length,2);
});


test('BOOST start fails closed when score persistence is not explicitly ready',async()=>{
 let now=100000;
 const player={id:'player-one',name:'A',best:0,rank:1};
 const calls=[];
 const worker=createWorker({now:()=>now,database:()=>({call:async(op,input)=>{calls.push(op);return {player};}})});
 const feature={...env,PRIME_BOOST_ENABLED:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),feature);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const blocked=await worker.fetch(request('/api/game/start',{boost:'score'},cookie),feature);
 assert.equal(blocked.status,403);
 assert.equal(calls.includes('boost_reserve'),false,'inventory must not be consumed before persistence is ready');
 const ordinary=await worker.fetch(request('/api/game/start',{},cookie),feature);
 assert.equal(ordinary.status,200,'ordinary play must remain available');
});

test('BOOST run requires reservation before signed ticket and uses signed 65-second replay',async()=>{
 let now=100000,submitted=null,verified=null;
 const player={id:'player-one',name:'A',best:0,rank:1};
 const calls=[];
 const worker=createWorker({now:()=>now,replayGame:(events,width,boost)=>{verified=boost;return {score:100,hits:0,combo:0,drops:0,achievementProof:{},nextProof:{}};},
 database:()=>({call:async(op,input)=>{
  calls.push(op);
  if(op==='boost_reserve')return {reserved:true,boost:input.boost,runId:input.runId};
  if(op==='submit'){submitted=input;return {player,personalBest:true,newChampion:true};}
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const feature={...env,PRIME_BOOST_ENABLED:'true',PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),feature);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const start=await worker.fetch(request('/api/game/start',{boost:'time'},cookie),feature);
 assert.equal(start.status,200);
 const run=await start.json();
 assert.equal(run.boost,'time');
 assert.equal(calls.filter(op=>op==='boost_reserve').length,1);
 now+=64000;
 const tooEarly=await worker.fetch(request('/api/scores',{...run,events:[],kit:'japan-01'},cookie),feature);
 assert.equal(tooEarly.status,400);
 assert.equal(calls.filter(op=>op==='submit').length,0);
 now+=2000;
 const saved=await worker.fetch(request('/api/scores',{...run,events:[],kit:'japan-01'},cookie),feature);
 assert.equal(saved.status,200);
 assert.equal(verified,'time');
 assert.equal(submitted.score,100);
 assert.equal(submitted.mobileBonus,0);
});


test('SCORE BOOST uses signed selection and neutral device multiplier',async()=>{
 let now=100000;
 const player={id:'player-one',name:'A',best:0,rank:1};
 const submits=[];
 const worker=createWorker({now:()=>now,replayGame:(events,width,boost)=>{
  assert.equal(boost,'score');return {score:105,hits:0,combo:0,drops:0,achievementProof:{},nextProof:{}};
 },database:()=>({call:async(op,input)=>{
  if(op==='boost_reserve')return {reserved:true,boost:input.boost,runId:input.runId};
  if(op==='submit'){submits.push(input);return {player,personalBest:true,newChampion:false};}
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const feature={...env,PRIME_BOOST_ENABLED:'true',PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),feature);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const start=await worker.fetch(request('/api/game/start',{boost:'score'},cookie),feature);
 assert.equal(start.status,200);
 const run=await start.json();
 now+=61000;
 const saved=await worker.fetch(request('/api/scores',{...run,boost:'time',events:[],kit:'japan-01'},cookie),feature);
 assert.equal(saved.status,200);
 assert.equal((await saved.json()).score,116,'105 x 1.1 rounded to nearest integer');
 assert.equal(submits.length,1);
 assert.equal(submits[0].baseScore,105);
 assert.equal(submits[0].score,116);
 assert.equal(submits[0].mobileBonus,11);
 assert.equal(submits[0].boost,'score','DB must validate the server-signed boost against its reservation');
});


test('BOOST inventory advertises picker only after explicit persistence readiness',async()=>{
 const player={id:'player-one',name:'A',best:0,rank:1};
 const worker=createWorker({database:()=>({call:async(op)=>{
  if(op==='boost_inventory')return {inventory:{time:1,score:1,sc:0}};
  return {player};
 }})});
 const feature={...env,PRIME_BOOST_ENABLED:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),feature);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const off=await worker.fetch(request('/api/boost/inventory',null,cookie),feature);
 assert.equal(off.status,403,'inventory must remain closed while persistence is not ready');
 const on=await worker.fetch(request('/api/boost/inventory',null,cookie),{...feature,PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'});
 assert.equal(on.status,200);
 assert.deepEqual(await on.json(),{inventory:{time:1,score:1,sc:0},selectionEnabled:true});
});


test('BOOST reservation failure never issues a playable run token',async()=>{
 const player={id:'player-one',name:'A',best:0,rank:1};
 const calls=[];
 const worker=createWorker({database:()=>({call:async(op)=>{
  calls.push(op);
  if(op==='boost_reserve')throw Error('BOOST inventory empty');
  return {player};
 }})});
 const feature={...env,PRIME_BOOST_ENABLED:'true',PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),feature);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const denied=await worker.fetch(request('/api/game/start',{boost:'score'},cookie),feature);
 assert.notEqual(denied.status,200);
 const body=await denied.json();
 assert.equal(body.token,undefined,'failed reservation must not expose a signed run');
 assert.equal(calls.filter(op=>op==='boost_reserve').length,1);
 const ordinary=await worker.fetch(request('/api/game/start',{},cookie),feature);
 assert.equal(ordinary.status,200,'normal gameplay remains possible with empty BOOST stock');
 assert.equal(calls.filter(op=>op==='boost_reserve').length,1);
});

test('SCORE BOOST applies the same x1.1 on mobile without legacy x1.2',async()=>{
 let now=100000,submitted=null,deviceSeen=null;
 const player={id:'player-one',name:'A',best:0,rank:1};
 const worker=createWorker({now:()=>now,replayGame:()=>({score:1000,hits:0,combo:0,drops:0,achievementProof:{},nextProof:{}}),
  database:()=>({call:async(op,input)=>{
   if(op==='boost_reserve')return {reserved:true,boost:input.boost,runId:input.runId};
   if(op==='submit'){submitted=input;deviceSeen=input.device;return {player,personalBest:true,newChampion:false};}
   if(op==='achievement_merge')return {mask:0};
   return {player};
  }})});
 const feature={...env,PRIME_BOOST_ENABLED:'true',PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),feature);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const mobileHeaders={'User-Agent':'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0 Mobile'};
 const startRequest=request('/api/game/start',{boost:'score'},cookie);
 for(const [key,value] of Object.entries(mobileHeaders))startRequest.headers.set(key,value);
 const start=await worker.fetch(startRequest,feature);
 assert.equal(start.status,200);
 const run=await start.json();
 now+=61000;
 const scoreRequest=request('/api/scores',{...run,events:[],kit:'japan-01'},cookie);
 for(const [key,value] of Object.entries(mobileHeaders))scoreRequest.headers.set(key,value);
 const response=await worker.fetch(scoreRequest,feature);
 assert.equal(response.status,200);
 assert.equal((await response.json()).score,1100);
 assert.equal(deviceSeen,'mobile');
 assert.equal(submitted.baseScore,1000);
 assert.equal(submitted.mobileBonus,100);
 assert.equal(submitted.boost,'score');
});

test('ordinary play stays neutral and does not reserve inventory when BOOST flags are enabled',async()=>{
 let now=100000,submitted=null;
 const player={id:'player-one',name:'A',best:0,rank:1};
 const calls=[];
 const worker=createWorker({now:()=>now,replayGame:(events,width,boost)=>{
  assert.equal(boost,null);return {score:1000,hits:0,combo:0,drops:0,achievementProof:{},nextProof:{}};
 },database:()=>({call:async(op,input)=>{
  calls.push(op);
  if(op==='submit'){submitted=input;return {player,personalBest:true,newChampion:false};}
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const feature={...env,PRIME_BOOST_ENABLED:'true',PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),feature);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const start=await worker.fetch(request('/api/game/start',{},cookie),feature);
 assert.equal(start.status,200);
 const run=await start.json();
 assert.equal(run.boost,null);
 assert.equal(calls.includes('boost_reserve'),false);
 now+=61000;
 const response=await worker.fetch(request('/api/scores',{...run,events:[],kit:'japan-01'},cookie),feature);
 assert.equal(response.status,200);
 assert.equal((await response.json()).score,1000);
 assert.equal(submitted.baseScore,1000);
 assert.equal(submitted.mobileBonus,0);
 assert.equal(submitted.boost,null);
 assert.equal(calls.includes('boost_reserve'),false);
});

test('SECOND CHANCE is reserved, replayed and saved with unchanged score',async()=>{
 let now=100000,verified=null,submitted=null;
 const player={id:'player-one',name:'A',best:0,rank:1};
 const worker=createWorker({now:()=>now,replayGame:(events,width,boost)=>{
  verified=boost;return {score:850,hits:2,combo:2,drops:1,achievementProof:{},nextProof:{}};
 },database:()=>({call:async(op,input)=>{
  if(op==='boost_reserve')return {reserved:true,boost:input.boost,runId:input.runId};
  if(op==='submit'){submitted=input;return {player,personalBest:true,newChampion:false};}
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const feature={...env,PRIME_BOOST_ENABLED:'true',PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),feature);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const start=await worker.fetch(request('/api/game/start',{boost:'sc'},cookie),feature);
 assert.equal(start.status,200);
 const run=await start.json();
 assert.equal(run.boost,'sc');
 now+=61000;
 const response=await worker.fetch(request('/api/scores',{...run,boost:'score',events:[],kit:'japan-01'},cookie),feature);
 assert.equal(response.status,200);
 assert.equal((await response.json()).score,850);
 assert.equal(verified,'sc','replay must use server-signed SECOND CHANCE');
 assert.equal(submitted.boost,'sc','DB must validate the matching SECOND CHANCE reservation');
 assert.equal(submitted.baseScore,850);
 assert.equal(submitted.mobileBonus,0,'SECOND CHANCE must never alter score multiplier');
});

test('BOOST SQL proposals match Worker RPC names and enforce service-role-only access',async()=>{
 const {readFileSync}=await import('node:fs');
 const sqlFiles=[
  '../sql/prime-boost-login-inventory-proposal-20261027.sql',
  '../sql/prime-boost-reservation-proposal-20261027.sql',
  '../sql/prime-boost-submit-proposal-20261027.sql'
 ];
 const source=sqlFiles.map(path=>readFileSync(new URL(path,import.meta.url),'utf8')).join('\n');
 for(const rpc of ['boost_login_grant','boost_inventory','boost_reserve','submit']){
  const name='public.lifting_api_'+rpc;
  assert.ok(source.includes('create or replace function '+name+'(payload jsonb)'),name+' must exist');
  assert.ok(source.includes('revoke all on function '+name+'(jsonb) from public,anon,authenticated;'),name+' must not be public');
  assert.ok(source.includes('grant execute on function '+name+'(jsonb) to service_role;'),name+' must be service-role-only');
 }
 for(const table of ['lifting_boost_inventory','lifting_boost_reservations']){
  assert.ok(source.includes('alter table public.'+table+' enable row level security;'),table+' must enable RLS');
 }
 assert.match(source,/last_grant_day date/,'daily grant must have JST idempotency column');
 assert.match(source,/where run_id=v_run and player_id=v_id and boost_type=payload->>'boost'/,'score save must match reservation');
});

test('BOOST score submission retry preserves signed run ID and never reserves stock again',async()=>{
 let now=100000,reservations=0,submitAttempts=0,storedRun=null,reservedRun=null;
 const player={id:'player-one',name:'A',best:116,rank:1};
 const worker=createWorker({now:()=>now,replayGame:(events,width,boost)=>{
  assert.equal(boost,'score');return {score:105,hits:0,combo:0,drops:0,achievementProof:{},nextProof:{}};
 },database:()=>({call:async(op,input)=>{
  if(op==='boost_reserve'){reservations++;reservedRun=input.runId;return {reserved:true,boost:input.boost,runId:input.runId};}
  if(op==='submit'){
   submitAttempts++;
   if(submitAttempts===1)throw Error('temporary database outage');
   if(storedRun!==null)assert.equal(input.runId,storedRun,'retry must preserve run ID');
   else storedRun=input.runId;
   return {player,personalBest:true,newChampion:false};
  }
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const feature={...env,PRIME_BOOST_ENABLED:'true',PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),feature);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const start=await worker.fetch(request('/api/game/start',{boost:'score'},cookie),feature);
 assert.equal(start.status,200);
 const run=await start.json();
 now+=61000;
 const payload={...run,events:[],kit:'japan-01'};
 const failed=await worker.fetch(request('/api/scores',payload,cookie),feature);
 assert.notEqual(failed.status,200);
 const retried=await worker.fetch(request('/api/scores',payload,cookie),feature);
 assert.equal(retried.status,200);
 assert.equal((await retried.json()).score,116);
 assert.equal(reservations,1,'retrying score save must not reserve or spend another BOOST');
 assert.equal(submitAttempts,2);
 assert.equal(storedRun,reservedRun,'saved score must use the same run ID as its BOOST reservation');
});

test('BOOST SQL keeps duplicate run submission idempotent before BEST and breakdown writes',async()=>{
 const {readFileSync}=await import('node:fs');
 const sql=readFileSync(new URL('../sql/prime-boost-submit-proposal-20261027.sql',import.meta.url),'utf8');
 const lock=sql.indexOf('perform pg_catalog.pg_advisory_xact_lock(5112026)');
 const lookup=sql.indexOf('select * into v_existing from public.lifting_runs where run_id=v_run');
 const existing=sql.indexOf('if found then',lookup);
 const earlyReturn=sql.indexOf("return jsonb_build_object('player',public.lifting_api_player(v_id)",existing);
 const bestWrite=sql.indexOf('update public.lifting_players set best_score=');
 const breakdownWrite=sql.indexOf('insert into public.lifting_score_breakdowns');
 const runWrite=sql.indexOf('insert into public.lifting_runs(');
 assert.ok(lock>=0&&lock<lookup,'duplicate check must run under global submission lock');
 assert.ok(lookup<existing&&existing<earlyReturn,'existing run must return its saved result');
 assert.ok(earlyReturn<bestWrite&&earlyReturn<breakdownWrite&&earlyReturn<runWrite,'duplicate run must exit before all score writes');
 assert.match(sql,/if v_existing\.player_id<>v_id then raise exception 'Run belongs to another player'/,'run IDs must be bound to their original player');
 assert.match(sql,/where run_id=v_run and player_id=v_id and boost_type=payload->>'boost'/,'BOOST run must match its reservation');
});

test('DAILY BOOST SQL defines JST reset, one use per type, and no random grants',async()=>{
 const {readFileSync}=await import('node:fs');
 const sql=readFileSync(new URL('../sql/prime-boost-daily-one-per-type-20261028.sql',import.meta.url),'utf8');
 assert.match(sql,/now\(\) at time zone 'Asia\/Tokyo'/,'day boundary must use JST');
 assert.match(sql,/create or replace function public\.lifting_boost_daily_refresh\(p_player uuid\)/);
 assert.match(sql,/set time_count=1,score_count=1,sc_count=1,last_grant_day=d/,'next day must restore one of each');
 assert.match(sql,/where public\.lifting_boost_inventory\.last_grant_day is distinct from d/,'same-day reads must not replenish consumed BOOSTs');
 for(const type of ['time','score','sc']){
  assert.match(sql,new RegExp('set '+type+'_count=0'),'using '+type+' must consume its one daily use');
  assert.match(sql,new RegExp('and '+type+'_count=1'),'using '+type+' twice must fail');
 }
 assert.doesNotMatch(sql,/random\s*\(/i,'DAILY BOOST must never grant random stock');
 assert.match(sql,/select \* into v_existing from public\.lifting_boost_reservations where run_id=v_run/,'duplicate reservations must be idempotent');
 assert.match(sql,/grant execute on function public\.lifting_boost_daily_refresh\(uuid\) to service_role/);
});

test('retired random-reward migration is archival and never the active DAILY BOOST contract',async()=>{
 const {readFileSync}=await import('node:fs');
 const legacy=readFileSync(new URL('../sql/prime-boost-login-inventory-proposal-20261027.sql',import.meta.url),'utf8');
 const daily=readFileSync(new URL('../sql/prime-boost-daily-one-per-type-20261028.sql',import.meta.url),'utf8');
 const rollout=readFileSync(new URL('../docs/prime-boost-production-rollout-rollback-20261027.md',import.meta.url),'utf8');
 assert.match(legacy,/HISTORICAL MIGRATION/);
 assert.match(legacy,/DO NOT REAPPLY OR USE THIS FILE/);
 assert.match(daily,/No random draws, accumulating stock, or DAILY SLOT/);
 assert.match(rollout,/legacy random login-grant RPC/);
 assert.match(rollout,/must NOT be rerun/);
});

test('production BOOST rollout keeps both feature flags off until DB gates pass',async()=>{
 const {readFileSync}=await import('node:fs');
 const config=readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8');
 const rollout=readFileSync(new URL('../docs/prime-boost-production-rollout-rollback-20261027.md',import.meta.url),'utf8');
 assert.match(config,/"PRIME_BOOST_ENABLED"\s*:\s*"false"/);
 assert.match(config,/"PRIME_BOOST_SCORE_PERSISTENCE_READY"\s*:\s*"false"/);
 assert.match(rollout,/daily-reset migration was blocked and is NOT applied/);
 assert.match(rollout,/PR #141 remains unmerged/);
});

test('DAILY BOOST SQL serializes same-player reservations and does not replenish on same-day reads',async()=>{
 const {readFileSync}=await import('node:fs');
 const sql=readFileSync(new URL('../sql/prime-boost-daily-one-per-type-20261028.sql',import.meta.url),'utf8');
 const reserve=sql.slice(sql.indexOf('create or replace function public.lifting_api_boost_reserve('));
 const refresh=sql.slice(sql.indexOf('create or replace function public.lifting_boost_daily_refresh('),sql.indexOf('create or replace function public.lifting_api_boost_login_grant('));
 assert.match(reserve,/from public\.lifting_players where id=v_player for update/,'same-player reservations must serialize');
 assert.match(reserve,/perform public\.lifting_boost_daily_refresh\(v_player\)/,'reservation must refresh JST date');
 assert.match(refresh,/where public\.lifting_boost_inventory\.last_grant_day is distinct from d/,'same-day refresh must not restore consumed inventory');
 assert.match(reserve,/if not found then raise exception 'BOOST already used today'/,'duplicate use must be rejected');
 assert.match(reserve,/insert into public\.lifting_boost_reservations\(run_id,player_id,boost_type\)/,'reservation must be persisted');
 assert.match(reserve,/if v_existing\.player_id<>v_player or v_existing\.boost_type<>v_type/,'run reuse must not cross player or type');
});

test('partial BOOST flag activation cannot grant or refresh inventory',async()=>{
 const calls=[];
 const worker=createWorker({database:()=>({call:async(op)=>{
  calls.push(op);
  if(op==='login')return {player:{id:'player-one',name:'A',best:0,rank:1}};
  if(op==='me')return {player:{id:'player-one',name:'A',best:0,rank:1}};
  throw Error('Unexpected database operation: '+op);
 }})});
 for(const flags of [
  {PRIME_BOOST_ENABLED:'true',PRIME_BOOST_SCORE_PERSISTENCE_READY:'false'},
  {PRIME_BOOST_ENABLED:'false',PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'}
 ]){
  calls.length=0;
  const cfg={...env,...flags};
  const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),cfg);
  assert.equal(login.status,200);
  assert.equal((await login.json()).boost,undefined);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await worker.fetch(request('/api/boost/inventory',null,cookie),cfg)).status,403);
  assert.equal(calls.includes('boost_login_grant'),false);
  assert.equal(calls.includes('boost_inventory'),false);
 }
});

test('rollback closes new BOOST starts but permits already-issued BOOST score saves',async()=>{
 let now=100000,submissions=0,reservations=0;
 const player={id:'player-one',name:'A',best:116,rank:1};
 const worker=createWorker({now:()=>now,replayGame:(events,width,boost)=>{
  assert.equal(boost,'score');return {score:105,hits:0,combo:0,drops:0,achievementProof:{},nextProof:{}};
 },database:()=>({call:async(op,input)=>{
  if(op==='boost_reserve'){reservations++;return {reserved:true,boost:input.boost,runId:input.runId};}
  if(op==='submit'){submissions++;assert.equal(input.boost,'score');assert.equal(input.score,116);return {player,personalBest:true,newChampion:false};}
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const active={...env,PRIME_BOOST_ENABLED:'true',PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),active);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const started=await worker.fetch(request('/api/game/start',{boost:'score'},cookie),active);
 assert.equal(started.status,200);
 const run=await started.json();
 const draining={...active,PRIME_BOOST_SCORE_PERSISTENCE_READY:'false'};
 assert.equal((await worker.fetch(request('/api/game/start',{boost:'score'},cookie),draining)).status,403);
 assert.equal((await worker.fetch(request('/api/boost/inventory',null,cookie),draining)).status,403);
 now+=61000;
 const saved=await worker.fetch(request('/api/scores',{...run,events:[],kit:'japan-01'},cookie),draining);
 assert.equal(saved.status,200,'already-issued run must save while BOOST issuance is disabled');
 assert.equal((await saved.json()).score,116);
 assert.equal(reservations,1,'rollback must not reserve another BOOST');
 assert.equal(submissions,1);
});

test('rollback drain preserves already-issued TIME BOOST 65-second save boundary',async()=>{
 let now=100000,submissions=0;
 const player={id:'player-one',name:'A',best:105,rank:1};
 const worker=createWorker({now:()=>now,replayGame:(events,width,boost)=>{
  assert.equal(boost,'time');return {score:105,hits:0,combo:0,drops:0,achievementProof:{},nextProof:{}};
 },database:()=>({call:async(op,input)=>{
  if(op==='boost_reserve')return {reserved:true,boost:input.boost,runId:input.runId};
  if(op==='submit'){submissions++;assert.equal(input.score,105);assert.equal(input.boost,'time');return {player,personalBest:true,newChampion:false};}
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const active={...env,PRIME_BOOST_ENABLED:'true',PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),active);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const start=await worker.fetch(request('/api/game/start',{boost:'time'},cookie),active);
 assert.equal(start.status,200);
 const run=await start.json();
 const draining={...active,PRIME_BOOST_SCORE_PERSISTENCE_READY:'false'};
 now+=64000;
 assert.equal((await worker.fetch(request('/api/scores',{...run,events:[],kit:'japan-01'},cookie),draining)).status,400);
 assert.equal(submissions,0,'early TIME BOOST submissions must not persist');
 now+=1000;
 const saved=await worker.fetch(request('/api/scores',{...run,events:[],kit:'japan-01'},cookie),draining);
 assert.equal(saved.status,200);
 assert.equal((await saved.json()).score,105);
 assert.equal(submissions,1);
});

test('rollback drain preserves already-issued SECOND CHANCE BOOST without extra inventory spend',async()=>{
 let now=100000,reservations=0,submissions=0;
 const player={id:'player-one',name:'A',best:105,rank:1};
 const worker=createWorker({now:()=>now,replayGame:(events,width,boost)=>{
  assert.equal(boost,'sc');return {score:105,hits:0,combo:0,drops:1,achievementProof:{},nextProof:{}};
 },database:()=>({call:async(op,input)=>{
  if(op==='boost_reserve'){reservations++;return {reserved:true,boost:input.boost,runId:input.runId};}
  if(op==='submit'){submissions++;assert.equal(input.boost,'sc');assert.equal(input.score,105);assert.equal(input.baseScore,105);return {player,personalBest:true,newChampion:false};}
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const active={...env,PRIME_BOOST_ENABLED:'true',PRIME_BOOST_SCORE_PERSISTENCE_READY:'true'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),active);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const started=await worker.fetch(request('/api/game/start',{boost:'sc'},cookie),active);
 assert.equal(started.status,200);
 const run=await started.json();
 const draining={...active,PRIME_BOOST_SCORE_PERSISTENCE_READY:'false'};
 assert.equal((await worker.fetch(request('/api/game/start',{boost:'sc'},cookie),draining)).status,403);
 now+=60000;
 const saved=await worker.fetch(request('/api/scores',{...run,events:[],kit:'japan-01'},cookie),draining);
 assert.equal(saved.status,200,'SECOND CHANCE run issued before rollback must remain saveable');
 assert.equal((await saved.json()).score,105);
 assert.equal(reservations,1);
 assert.equal(submissions,1);
});

test('full BOOST shutdown leaves ordinary gameplay and score persistence available',async()=>{
 let now=100000,reservations=0,grants=0,submissions=0;
 const player={id:'player-one',name:'A',best:105,rank:1};
 const worker=createWorker({now:()=>now,replayGame:(events,width,boost)=>{
  assert.equal(boost,null);return {score:105,hits:0,combo:0,drops:0,achievementProof:{},nextProof:{}};
 },database:()=>({call:async(op,input)=>{
  if(op==='boost_login_grant'){grants++;throw Error('BOOST grant must remain off');}
  if(op==='boost_reserve'){reservations++;throw Error('BOOST reservation must remain off');}
  if(op==='submit'){submissions++;assert.equal(input.boost,null);assert.equal(input.score,105);assert.equal(input.mobileBonus,0);return {player,personalBest:true,newChampion:false};}
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const disabled={...env,PRIME_BOOST_ENABLED:'false',PRIME_BOOST_SCORE_PERSISTENCE_READY:'false'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),disabled);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const start=await worker.fetch(request('/api/game/start',{},cookie),disabled);
 assert.equal(start.status,200);
 const run=await start.json();
 assert.equal(run.boost,null);
 now+=60000;
 const saved=await worker.fetch(request('/api/scores',{...run,events:[],kit:'japan-01'},cookie),disabled);
 assert.equal(saved.status,200);
 assert.equal((await saved.json()).score,105);
 assert.equal(grants,0);
 assert.equal(reservations,0);
 assert.equal(submissions,1);
});

test('DAILY BOOST migration preserves historical scores and only resets inventory on a new JST day',async()=>{
 const {readFileSync}=await import('node:fs');
 const sql=readFileSync(new URL('../sql/prime-boost-daily-one-per-type-20261028.sql',import.meta.url),'utf8');
 assert.match(sql,/now\(\) at time zone 'Asia\/Tokyo'/i);
 assert.match(sql,/last_grant_day is distinct from d/i);
 assert.match(sql,/on conflict\(player_id\) do update/i);
 assert.match(sql,/where id=p_player for update/i);
 assert.doesNotMatch(sql,/\b(?:truncate|delete\s+from|drop\s+table)\b/i,'daily migration must never delete historical records');
 assert.doesNotMatch(sql,/\bupdate\s+public\.lifting_(?:players|runs|score_breakdowns)\b/i,'daily migration must not rewrite BEST or score history');
 assert.doesNotMatch(sql,/\brandom\s*\(/i,'daily inventory cannot use roulette');
 assert.match(sql,/where player_id=v_player and time_count=1/i);
 assert.match(sql,/where player_id=v_player and score_count=1/i);
 assert.match(sql,/where player_id=v_player and sc_count=1/i);
 assert.match(sql,/revoke all on function public\.lifting_boost_daily_refresh\(uuid\) from public,anon,authenticated/i);
 assert.match(sql,/grant execute on function public\.lifting_boost_daily_refresh\(uuid\) to service_role/i);
});

test('preview DB target is isolated and neither BOOST flag is enabled by default',async()=>{
 const {readFileSync}=await import('node:fs');
 const raw=readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8');
 const config=JSON.parse(raw.replace(/^\s*\/\/.*$/gm,''));
 assert.equal(config.vars.SUPABASE_URL,'https://ctxhopadmvasxvjspwoi.supabase.co');
 assert.equal(config.previews.vars.SUPABASE_URL,'https://tarnzjkxexlozqqmyqof.supabase.co');
 assert.equal(config.vars.PRIME_BOOST_ENABLED,'false');
 assert.equal(config.vars.PRIME_BOOST_SCORE_PERSISTENCE_READY,'false');
 assert.notEqual(config.previews.vars.SUPABASE_URL,config.vars.SUPABASE_URL,'preview must never use production DB');
});

test('dedicated staging Worker config cannot target production database or Worker name',async()=>{
 const {readFileSync}=await import('node:fs');
 const staging=JSON.parse(readFileSync(new URL('../wrangler.staging.jsonc',import.meta.url),'utf8'));
 const production=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 assert.notEqual(staging.name,production.name);
 assert.equal(staging.vars.SUPABASE_URL,'https://tarnzjkxexlozqqmyqof.supabase.co');
 assert.notEqual(staging.vars.SUPABASE_URL,production.vars.SUPABASE_URL);
 assert.equal(staging.main,production.main);
 assert.equal(staging.assets.directory,production.assets.directory);
 assert.equal(staging.vars.PRIME_BOOST_ENABLED,'true','BOOST integration must run only in dedicated staging');
 assert.equal(staging.vars.PRIME_BOOST_SCORE_PERSISTENCE_READY,'true');
 assert.equal(production.vars.PRIME_BOOST_ENABLED,'false');
 assert.equal(production.vars.PRIME_BOOST_SCORE_PERSISTENCE_READY,'false');
});

test('legacy-shaped mobile ticket is replayed neutrally and client-provided old bonus cannot override score',async()=>{
 let now=100000,submission=null;
 const player={id:'player-one',name:'A',best:0,rank:1};
 const worker=createWorker({now:()=>now,replayGame:()=>({score:1000,hits:1,combo:1,drops:0,achievementProof:{},nextProof:{}}),database:()=>({call:async(op,input)=>{
  if(op==='submit'){submission=input;return {player,personalBest:true,newChampion:true};}
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const mobileHeaders={'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Mobile'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'},null,mobileHeaders),env);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const start=await worker.fetch(request('/api/game/start',{},cookie,mobileHeaders),env);
 assert.equal(start.status,200);
 const ticket=await start.json();
 assert.equal(ticket.ruleset,RULESET);
 const signedTicket=JSON.parse(Buffer.from(ticket.token.split('.')[0],'base64url').toString('utf8'));
 assert.equal(signedTicket.scoringPolicy,'neutral-v1','new run tickets identify their signed scoring policy');
 now+=61000;
 const saved=await worker.fetch(request('/api/scores',{...ticket,events:[],kit:'japan-01',score:1100,baseScore:1000,mobileBonus:100,device:'mobile'},cookie,mobileHeaders),env);
 assert.equal(saved.status,200);
 assert.equal((await saved.json()).score,1000,'new Worker recomputes even legacy-shaped mobile ticket at neutral multiplier');
 assert.equal(submission.score,1000);
 assert.equal(submission.baseScore,1000);
 assert.equal(submission.mobileBonus,0);
 assert.equal(submission.device,'mobile');
 assert.equal(submission.boost,null);
});

test('authentic HMAC legacy-format mobile run ticket remains accepted but uses new neutral score',async()=>{
 let now=100000,submission=null;
 const player={id:'player-one',name:'A',best:0,rank:1};
 const worker=createWorker({now:()=>now,replayGame:()=>({score:1000,hits:1,combo:1,drops:0}),database:()=>({call:async(op,input)=>{
  if(op==='submit'){submission=input;return {player,personalBest:true,newChampion:true};}
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const headers={'User-Agent':'Mozilla/5.0 (iPhone; Mobile)'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'},null,headers),env);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const legacy={kind:'run',sub:'player-one',id:'legacy-mobile-run',started:now-61000,exp:now+86400000,ruleset:RULESET,device:'mobile',worldWidth:1000};
 const bytes=new TextEncoder();
 const base64url=data=>Buffer.from(data).toString('base64url');
 const payload=base64url(bytes.encode(JSON.stringify(legacy)));
 const hmacKey=await crypto.subtle.importKey('raw',bytes.encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=base64url(await crypto.subtle.sign('HMAC',hmacKey,bytes.encode(payload)));
 const saved=await worker.fetch(request('/api/scores',{token:payload+'.'+signature,ruleset:RULESET,events:[],kit:'japan-01',score:1100,device:'mobile'},cookie,headers),env);
 assert.equal(saved.status,200);
 assert.equal(submission.runId,'legacy-mobile-run');
 assert.equal(submission.score,1000,'legacy mobile score 1100 is not preserved for an in-flight ticket');
 assert.equal(submission.mobileBonus,0);
 assert.equal(submission.boost,null);
});

test('legacy mobile ticket cannot forge old bonus or bypass signed expiration',async()=>{
 let now=200000,submits=0;
 const player={id:'player-one',name:'A',best:0,rank:1};
 const worker=createWorker({now:()=>now,replayGame:()=>({score:1000}),database:()=>({call:async(op)=>{
  if(op==='submit'){submits++;return {player,personalBest:true,newChampion:true};}
  if(op==='achievement_merge')return {mask:0};
  return {player};
 }})});
 const headers={'User-Agent':'Mozilla/5.0 (iPhone; Mobile)'};
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'},null,headers),env);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const encode=data=>Buffer.from(data).toString('base64url');
 const bytes=new TextEncoder();
 const signLegacy=async claims=>{
  const payload=encode(bytes.encode(JSON.stringify(claims)));
  const key=await crypto.subtle.importKey('raw',bytes.encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return payload+'.'+encode(await crypto.subtle.sign('HMAC',key,bytes.encode(payload)));
 };
 const legacy={kind:'run',sub:'player-one',id:'old-run',started:now-61000,exp:now+10000,ruleset:RULESET,device:'mobile',worldWidth:1000};
 const valid=await signLegacy(legacy);
 const [signedPayload,signedMac]=valid.split('.');
 const forged=signedPayload+'.'+(signedMac.startsWith('A')?'B':'A')+signedMac.slice(1);
 const body={ruleset:RULESET,events:[],kit:'japan-01',score:1100,mobileBonus:100,device:'mobile'};
 assert.equal((await worker.fetch(request('/api/scores',{...body,token:forged},cookie,headers),env)).status,401);
 assert.equal(submits,0);
 now+=10001;
 assert.equal((await worker.fetch(request('/api/scores',{...body,token:valid},cookie,headers),env)).status,401);
 assert.equal(submits,0);
});

test('unknown signed scoring policy is rejected before score persistence',async()=>{
 let now=200000,submits=0;
 const player={id:'player-one',name:'A',best:0,rank:1};
 const worker=createWorker({now:()=>now,database:()=>({call:async(op)=>{
  if(op==='submit'){submits++;return {player,personalBest:false,newChampion:false};}
  return {player};
 }})});
 const login=await worker.fetch(request('/api/login',{name:'A',pin:'123456'}),env);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const bytes=new TextEncoder(),encode=data=>Buffer.from(data).toString('base64url');
 const claims={kind:'run',sub:'player-one',id:'unknown-policy',started:now-61000,exp:now+10000,ruleset:RULESET,scoringPolicy:'unsupported-v999',device:'pc',worldWidth:1000};
 const payload=encode(bytes.encode(JSON.stringify(claims)));
 const key=await crypto.subtle.importKey('raw',bytes.encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const token=payload+'.'+encode(await crypto.subtle.sign('HMAC',key,bytes.encode(payload)));
 const response=await worker.fetch(request('/api/scores',{token,ruleset:RULESET,events:[],kit:'japan-01'},cookie),env);
 assert.equal(response.status,403);
 assert.equal(submits,0);
});
