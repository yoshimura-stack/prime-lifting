import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostRankingReader} from '../server/boost-ranking-reader.mjs';
const a='123e4567-e89b-42d3-a456-426614174001';
const b='123e4567-e89b-42d3-a456-426614174002';
const runId='123e4567-e89b-42d3-a456-426614174010';
const players=[{id:a,best:55000},{id:b,best:33000}];
const entries=[{name:'A',score:55300,playScore:55000,dailyBonus:300},{name:'B',score:33000}];
test('two private batch RPC reads add BOOST only to verified best run',async()=>{
 const calls=[];
 const reader=createBoostRankingReader({call:async(op,input)=>{
  calls.push({op,input});
  if(op==='boost_best_run_lookup')return {[a]:{bestRunId:runId,bestScore:55000}};
  if(op==='boost_verified_receipt_list')return {[a]:{playerId:a,runId,playScore:55000,baseScore:50000,boostBonus:5000,boost:'score'}};
  throw Error('unexpected RPC');
 }});
 const result=await reader.enrich(players,entries);
 assert.deepEqual(calls.map(c=>c.op),['boost_best_run_lookup','boost_verified_receipt_list']);
 assert.deepEqual(calls[0].input.playerIds,[a,b]);
 assert.deepEqual(calls[1].input.runIds,[runId]);
 assert.deepEqual(result[0],{...entries[0],boost:'score',boostBaseScore:50000,boostBonus:5000});
 assert.deepEqual(result[1],entries[1]);
 assert.equal(Object.hasOwn(result[0],'playerId'),false);
});
test('missing best-run IDs avoid unnecessary receipt query and leave historical scores untouched',async()=>{
 const calls=[];const reader=createBoostRankingReader({call:async(op)=>{calls.push(op);return {};}});
 assert.deepEqual(await reader.enrich(players,entries),entries);
 assert.deepEqual(calls,['boost_best_run_lookup']);
});
test('private lookup or receipt outage never removes leaderboard',async()=>{
 for(const failing of ['boost_best_run_lookup','boost_verified_receipt_list']){
  const reader=createBoostRankingReader({call:async(op)=>{
   if(op===failing)throw Error('offline');
   if(op==='boost_best_run_lookup')return {[a]:{bestRunId:runId,bestScore:55000}};
   return {};
  }});
  assert.deepEqual(await reader.enrich(players,entries),entries);
 }
});
test('stale best-run score cannot attach BOOST to newer best',async()=>{
 const calls=[];
 const reader=createBoostRankingReader({call:async(op)=>{
  calls.push(op);return {[a]:{bestRunId:runId,bestScore:54000}};
 }});
 assert.deepEqual(await reader.enrich(players,entries),entries);
 assert.deepEqual(calls,['boost_best_run_lookup']);
});
