import test from 'node:test';
import assert from 'node:assert/strict';
import {projectVerifiedBoostLeaderboard} from '../server/boost-leaderboard-read-model.mjs';
const a='123e4567-e89b-42d3-a456-426614174001';
const b='123e4567-e89b-42d3-a456-426614174002';
const runId='123e4567-e89b-42d3-a456-426614174010';
const players=[{id:a,bestRunId:runId},{id:b}];
const entries=[{name:'A',score:55300,playScore:55000,dailyBonus:300},{name:'B',score:33000}];
test('private batch read attaches verified SCORE BOOST only to matching best, preserving public shape',async()=>{
 let calls=0;
 const result=await projectVerifiedBoostLeaderboard(players,entries,{readReceipts:async({playerIds,runIds})=>{
  calls++;assert.deepEqual(playerIds,[a,b]);assert.deepEqual(runIds,[runId]);return {[a]:{playerId:a,runId,playScore:55000,baseScore:50000,boostBonus:5000,boost:'score'}};
 }});
 assert.equal(calls,1);
 assert.deepEqual(result[0],{...entries[0],boost:'score',boostBaseScore:50000,boostBonus:5000});
 assert.equal(Object.hasOwn(result[0],'playerId'),false);
 assert.deepEqual(result[1],entries[1]); // no verified BOOST receipt: unchanged legacy ranking
});
test('unavailable receipt reader leaves the ranking usable and untouched',async()=>{
 const result=await projectVerifiedBoostLeaderboard(players,entries,{readReceipts:async()=>{throw Error('offline');}});
 assert.deepEqual(result,entries);assert.notEqual(result,entries);
});
test('invalid, forged, or unrelated receipt never leaks into public leaderboard',async()=>{
 const result=await projectVerifiedBoostLeaderboard(players,entries,{readReceipts:async()=>({[a]:{playerId:b,runId,playScore:55000,baseScore:50000,boostBonus:5000,boost:'score'},[b]:{playerId:b,playScore:33000,baseScore:30000,boostBonus:5000,boost:'score'}})});
 assert.deepEqual(result,entries);
});
test('duplicate or malformed private IDs are rejected before DB read',async()=>{
 let calls=0;const readReceipts=async()=>{calls++;return {};};
 await assert.rejects(projectVerifiedBoostLeaderboard([{id:a},{id:a}],entries,{readReceipts}),TypeError);
 await assert.rejects(projectVerifiedBoostLeaderboard([{id:'not-uuid'},players[1]],entries,{readReceipts}),TypeError);
 assert.equal(calls,0);
});

test('same player and identical score on a different best run does not receive BOOST points',async()=>{
 const wrongRun='123e4567-e89b-42d3-a456-426614174011';
 const result=await projectVerifiedBoostLeaderboard(players,entries,{readReceipts:async()=>({[a]:{playerId:a,runId:wrongRun,playScore:55000,baseScore:50000,boostBonus:5000,boost:'score'}})});
 assert.deepEqual(result,entries);
});
