import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorker} from '../server/worker.mjs';
import {dailyChallenges,jstDay} from '../server/daily.mjs';

const origin='https://test.example';
const limiter={limit:async()=>({success:true})};
const env={SESSION_SECRET:'test-only-secret-012345678901234567890',AUTH_LIMITER:limiter,API_LIMITER:limiter,DAILY_REWARDS_ENABLED:'true',ASSETS:{fetch:()=>new Response('asset')}};
const req=(path,body,cookie)=>new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json',Origin:origin}),...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
test('verified daily rewards are one credit per mission, account-wide, and tied to signed JST start day',async()=>{
 let now=Date.parse('2026-10-18T14:59:00Z'); // 23:59 JST
 const player={id:'test-player',name:'Test',best:2000,rank:1,kit:'japan-01',lastPlayed:null,dailyBonus:0};
 const awards=new Map(),calls=[];
 const result={score:1500,combo:100,nextProof:{foot:100,knee:100,chest:100,shoulder:100,spin:100,jump:100},achievementProof:{quadMaster:true}};
 const database=()=>({call:async(op,input)=>{
  calls.push({op,input});
  if(op==='register'||op==='me')return {player};
  if(op==='achievement_merge')return {mask:0};
  if(op==='submit')return {player,personalBest:false,newChampion:false};
  if(op==='daily_award'){
   const selected=dailyChallenges(input.day).map(x=>x.id);
   assert.deepEqual(input.completedIds,selected);
   let earned=0;
   for(const id of input.completedIds){const key=input.playerId+':'+input.day+':'+id;if(!awards.has(key)){awards.set(key,true);earned+=100;}}
   player.dailyBonus=awards.size*100;
   return {earned,day:input.day,todayBonus:selected.length*100,monthlyBonus:player.dailyBonus};
  }
  if(op==='daily_status')return {completedIds:[...awards.keys()].filter(x=>x.includes(':'+input.day+':')).map(x=>x.split(':').at(-1)),monthlyBonus:player.dailyBonus};
  throw new Error('Unexpected DB operation '+op);
 }});
 const worker=createWorker({database,now:()=>now,replayGame:()=>result});
 const auth=await worker.fetch(req('/api/register',{name:'Test',pin:'123456'}),env);
 assert.equal(auth.status,200);
 const cookie=auth.headers.get('set-cookie').split(';')[0];
 const started=await worker.fetch(req('/api/game/start',{},cookie),env);
 assert.equal(started.status,200);
 const {token}=await started.json();
 now=Date.parse('2026-10-18T15:01:00Z'); // 00:01 JST
 const payload={token,ruleset:'cockpit-v42',events:[],kit:'japan-01'};
 const first=await worker.fetch(req('/api/scores',payload,cookie),env);
 assert.equal(first.status,200,await first.clone().text());
 const a=await first.json();
 assert.equal(a.daily.earned,300);
 assert.equal(a.daily.day,'2026-10-18');
 assert.equal(a.player.best,2000,'daily points never overwrite play best');
 const second=await worker.fetch(req('/api/scores',payload,cookie),env);
 assert.equal(second.status,200);
 assert.equal((await second.json()).daily.earned,0,'same run cannot award twice');
 assert.equal(awards.size,3);
 const previous=await worker.fetch(req('/api/daily/status',undefined,cookie),env);
 assert.equal(previous.status,200);
 const status=await previous.json();
 assert.equal(status.day,jstDay(now));
 assert.deepEqual(status.completedIds,[],'new day has no checked challenges');
 assert.equal(status.monthlyBonus,300,'prior-day credit remains in current month');
 assert.equal(calls.filter(x=>x.op==='daily_award').length,2);
});
