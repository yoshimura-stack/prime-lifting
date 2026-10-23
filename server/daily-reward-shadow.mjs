// STAGING ONLY. Deterministic in-memory model, NOT production DB award logic.
// Uses the actual dailyChallenges rotation and JST month grouping.
import {dailyChallenges,jstMonth,rankingTotal} from './daily.mjs';
export function createDailyRewardShadow(){
 const earned=new Map(),runPayloads=new Map();
 return Object.freeze({
  award({playerId,runId,day,completedIds}){
   if(typeof playerId!=='string'||!playerId||typeof runId!=='string'||!runId||!Array.isArray(completedIds))
    throw new TypeError('Invalid award');
   const challenges=dailyChallenges(day),allowed=new Set(challenges.map(x=>x.id));
   if(completedIds.some(id=>typeof id!=='string'||!allowed.has(id)))throw new TypeError('Invalid challenge');
   const normalized=[...new Set(completedIds)].sort();
   const runKey=JSON.stringify([playerId,runId]);
   const payload=JSON.stringify([day,normalized]);
   if(runPayloads.has(runKey)&&runPayloads.get(runKey)!==payload)throw new Error('Conflicting run replay');
   runPayloads.set(runKey,payload);
   const key=JSON.stringify([playerId,day]);
   let daySet=earned.get(key);
   if(!daySet){daySet=new Set();earned.set(key,daySet);}
   const before=daySet.size;
   for(const id of normalized)daySet.add(id);
   const month=jstMonth(day);
   let monthlyCount=0;
   for(const [k,ids] of earned){const [player,d]=JSON.parse(k);if(player===playerId&&jstMonth(d)===month)monthlyCount+=ids.size;}
   return Object.freeze({newlyAwarded:(daySet.size-before)*100,dayTotal:daySet.size*100,monthTotal:monthlyCount*100,month,rankingTotal:rankingTotal(0,monthlyCount)});
  },
  snapshot(playerId,day){
   const month=jstMonth(day);let monthlyCount=0,dayCount=0;
   for(const [k,ids] of earned){const [player,d]=JSON.parse(k);if(player!==playerId)continue;if(d===day)dayCount+=ids.size;if(jstMonth(d)===month)monthlyCount+=ids.size;}
   return Object.freeze({dayPoints:dayCount*100,monthPoints:monthlyCount*100});
  }
 });
}
