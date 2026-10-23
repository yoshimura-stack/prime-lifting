import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostRankingReader} from '../server/boost-ranking-reader.mjs';
import {planAtomicBestRunUpdate} from '../server/boost-atomic-best-plan.mjs';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const boostedRun='123e4567-e89b-42d3-a456-426614174002';
const normalRun='123e4567-e89b-42d3-a456-426614174003';
const players=[{id:playerId}];
const receipt={playerId,runId:boostedRun,boost:'score',baseScore:50000,boostBonus:5000,playScore:55000};
function reader(bestRunId,receipts={[playerId]:receipt}){
 const calls=[];
 const service=createBoostRankingReader({async call(name,payload){
  calls.push(name);
  if(name==='boost_best_run_lookup')return {[playerId]:{bestRunId,bestScore:bestRunId===null?60000:55000}};
  if(name==='boost_verified_receipt_list')return receipts;
  throw new Error('Unexpected operation');
 }});
 return {service,calls};
}
test('verified BOOST personal best receives separate 5000 bonus',async()=>{
 const {service}=reader(boostedRun);
 const enriched=await service.enrich(players,[{score:55000,playScore:55000}]);
 assert.equal(enriched[0].boost,'score');
 assert.equal(enriched[0].boostBaseScore,50000);
 assert.equal(enriched[0].boostBonus,5000);
});
test('higher normal best clears BOOST pointer and bonus',async()=>{
 const next=planAtomicBestRunUpdate({currentBest:55000,currentBestRunId:boostedRun,runId:normalRun,verifiedScore:60000});
 assert.equal(next.nextBest,60000);
 assert.equal(next.nextBestRunId,null);
 const {service,calls}=reader(next.nextBestRunId);
 const enriched=await service.enrich(players,[{score:60000,playScore:60000}]);
 assert.equal(enriched[0].boostBonus,undefined);
 assert.deepEqual(calls,['boost_best_run_lookup']);
});
test('lower score, tie, and exact replay retain original BOOST best',()=>{
 for(const [verifiedScore,replayed] of [[54000,false],[55000,false],[60000,true]]){
  const next=planAtomicBestRunUpdate({currentBest:55000,currentBestRunId:boostedRun,runId:normalRun,verifiedScore,replayed});
  assert.equal(next.changed,false);
  assert.equal(next.nextBestRunId,boostedRun);
 }
});
test('mismatched receipt run and forged bonus do not appear on ranking',async()=>{
 for(const forged of [{...receipt,runId:normalRun},{...receipt,boostBonus:9999}]){
  const {service}=reader(boostedRun,{[playerId]:forged});
  const enriched=await service.enrich(players,[{score:55000,playScore:55000}]);
  assert.equal(enriched[0].boostBonus,undefined);
 }
});
test('private receipt failure preserves normal ranking',async()=>{
 const service=createBoostRankingReader({async call(name){
  if(name==='boost_best_run_lookup')return {[playerId]:{bestRunId:boostedRun,bestScore:55000}};
  throw new Error('private store unavailable');
 }});
 const original=[{score:55000,playScore:55000}];
 assert.deepEqual(await service.enrich(players,original),original);
});
