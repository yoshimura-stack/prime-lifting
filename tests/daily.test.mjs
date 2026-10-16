import test from 'node:test';
import assert from 'node:assert/strict';
import {jstDay,dailyChallenges,completedDailyChallenges,earnedPlayCoins} from '../server/daily.mjs';
test('JST day boundary, not UTC',()=>{
 assert.equal(jstDay(Date.parse('2026-10-16T14:59:59Z')),'2026-10-16');
 assert.equal(jstDay(Date.parse('2026-10-16T15:00:00Z')),'2026-10-17');
});
test('three shared, deterministic missions, one per difficulty',()=>{
 const a=dailyChallenges('2026-10-16');
 assert.deepEqual(a,dailyChallenges('2026-10-16'));
 assert.deepEqual(a.map(x=>x.difficulty),['easy','normal','hard']);
 assert.equal(new Set(a.map(x=>x.id)).size,3);
 assert.ok(a.every(x=>x.reward===100));
 assert.throws(()=>dailyChallenges('2026-02-30'));
});
test('server verified run metrics complete only matching missions',()=>{
 const day='2026-10-16';
 const all={combo:100,nextProof:{foot:100,knee:100,chest:100,shoulder:100,spin:100,jump:100},achievementProof:{quadMaster:true}};
 assert.equal(completedDailyChallenges(day,all).length,3);
 assert.deepEqual(completedDailyChallenges(day,{combo:0,nextProof:{},achievementProof:{}}),[]);
});
test('coin conversion and daily cap',()=>{
 assert.equal(earnedPlayCoins(999),0);
 assert.equal(earnedPlayCoins(70000),700);
 assert.equal(earnedPlayCoins(70000,1900),100);
 assert.equal(earnedPlayCoins(70000,2000),0);
 assert.throws(()=>earnedPlayCoins(-1));
});
