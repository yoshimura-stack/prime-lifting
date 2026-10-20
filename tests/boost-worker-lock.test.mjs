import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorker} from '../server/worker.mjs';
const origin='https://boost-test.example';
const limiter={limit:async()=>({success:true})};
const env={SESSION_SECRET:'test-only-secret-012345678901234567890',AUTH_LIMITER:limiter,API_LIMITER:limiter,ASSETS:{fetch:()=>new Response('asset')}};
const request=(path,body,cookie)=>new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json',Origin:origin}),...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
test('BOOST endpoints are hard locked and never invoke the database',async()=>{
 let calls=0;
 const worker=createWorker({database:()=>({call:async()=>{calls++;throw Error('DB must not be called');}})});
 for(const path of ['/api/boost/status','/api/boost/slot/spin','/api/boost/reserve']){
  const response=await worker.fetch(request(path,{boost:'time'}),env);
  assert.equal(response.status,403,path);
 }
 assert.equal(calls,0);
});
test('normal game start rejects BOOST payload before issuing signed run',async()=>{
 const player={id:'test-player',name:'Tester',best:0,rank:1},calls=[];
 const worker=createWorker({database:()=>({call:async(op)=>{calls.push(op);return {player};}})});
 const login=await worker.fetch(request('/api/register',{name:'Tester',pin:'123456'}),env);
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 for(const boost of ['time','score','sc',null,['time','score']]){
  const response=await worker.fetch(request('/api/game/start',{worldWidth:1000,boost},cookie),env);
  assert.equal(response.status,403,JSON.stringify(boost));
 }
 const duplicate=await worker.fetch(request('/api/game/start',{worldWidth:1000,boosts:['time','time']},cookie),env);
 assert.equal(duplicate.status,403);
 const plain=await worker.fetch(request('/api/game/start',{worldWidth:1000},cookie),env);
 assert.equal(plain.status,200);
 const ticket=await plain.json();
 assert.equal(typeof ticket.token,'string');
 const rejected=await worker.fetch(request('/api/scores',{token:ticket.token,ruleset:ticket.ruleset,events:[],kit:'japan-01',boost:'score'},cookie),env);
 assert.equal(rejected.status,403);
 assert.ok(!calls.includes('submit'));
});
