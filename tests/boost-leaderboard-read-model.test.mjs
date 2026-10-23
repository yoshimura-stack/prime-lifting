import test from 'node:test';
import assert from 'node:assert/strict';
import {projectVerifiedBoostLeaderboard} from '../server/boost-leaderboard-read-model.mjs';
const a='123e4567-e89b-42d3-a456-426614174001';
const b='123e4567-e89b-42d3-a456-426614174002';
const players=[{id:a},{id:b}];
const entries=[{name:'A',score:55300,playScore:55000,dailyBonus:300},{name:'B',score:33000}];
test('private batch read attaches verified SCORE BOOST only to matching best, preserving public shape',async()=>{
 let calls=0;
 const result=await projectVerifiedBoostLeaderboard(players,entries,{readReceipts:async({playerIds})=>{
  calls++;assert.deepEqual(playerIds,[a,b]);return {[a]:{playerId:a,playScore:55000,baseScore:50000,boostBonus:5000,boost:'score'},[b]:{playerId:b,playScore:33000,baseScore:30000,boostBonus:3000,boost:'score'}};
 }});
 assert.equal(calls,1);
 assert.deepEqual(result[0],{...entries[0],boost:'score',boostBaseScore:50000,boostBonus:5000});
 assert.equal(Object.hasOwn(result[0],'playerId'),false);
 assert.deepEqual(result[1],entries[1]); // historical record without saved run identity stays unchanged in public API
});
test('unavailable receipt reader leaves the ranking usable and untouched',async()=>{
 const result=await projectVerifiedBoostLeaderboard(players,entries,{readReceipts:async()=>{throw Error('offline');}});
 assert.deepEqual(result,entries);assert.notEqual(result,entries);
});
test('invalid, forged, or unrelated receipt never leaks into public leaderboard',async()=>{
 const result=await projectVerifiedBoostLeaderboard(players,entries,{readReceipts:async()=>({[a]:{playerId:b,playScore:55000,baseScore:50000,boostBonus:5000,boost:'score'},[b]:{playerId:b,playScore:33000,baseScore:30000,boostBonus:5000,boost:'score'}})});
 assert.deepEqual(result,entries);
});
test('duplicate or malformed private IDs are rejected before DB read',async()=>{
 let calls=0;const readReceipts=async()=>{calls++;return {};};
 await assert.rejects(projectVerifiedBoostLeaderboard([{id:a},{id:a}],entries,{readReceipts}),TypeError);
 await assert.rejects(projectVerifiedBoostLeaderboard([{id:'not-uuid'},players[1]],entries,{readReceipts}),TypeError);
 assert.equal(calls,0);
});
