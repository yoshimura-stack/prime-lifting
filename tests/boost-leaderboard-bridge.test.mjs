import test from 'node:test';
import assert from 'node:assert/strict';
import {attachVerifiedBoostToLeader} from '../server/boost-leaderboard-bridge.mjs';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const entry={playerId,name:'PLAYER',rank:1,score:55300,playScore:55000,dailyBonus:300,device:'pc'};
const receipt={playerId,playScore:55000,baseScore:50000,boostBonus:5000,boost:'score'};
test('trusted SCORE BOOST receipt adds a separate line without changing ranking total or daily credits',()=>{
 assert.deepEqual(attachVerifiedBoostToLeader(entry,receipt),{...entry,boost:'score',boostBaseScore:50000,boostBonus:5000});
 assert.equal(entry.score,55300);
});
test('old, missing, different player, or different personal best receipts do not invent BOOST points',()=>{
 for(const invalid of [null,{...receipt,playerId:'123e4567-e89b-42d3-a456-426614174002'},{...receipt,playScore:54000}])assert.deepEqual(attachVerifiedBoostToLeader(entry,invalid),entry);
 assert.deepEqual(attachVerifiedBoostToLeader({name:'LEGACY',score:33000},receipt),{name:'LEGACY',score:33000});
});
test('non-SCORE boosts do not produce bonus display fields',()=>{
 assert.deepEqual(attachVerifiedBoostToLeader(entry,{...receipt,boost:'time',boostBonus:0,baseScore:55000}),entry);
});
test('inconsistent SCORE BOOST receipt is rejected rather than displayed',()=>{
 assert.throws(()=>attachVerifiedBoostToLeader(entry,{...receipt,boostBonus:2000}),RangeError);
});
