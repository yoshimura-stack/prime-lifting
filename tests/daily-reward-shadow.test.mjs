import test from 'node:test';
import assert from 'node:assert/strict';
import {createDailyRewardShadow} from '../server/daily-reward-shadow.mjs';
import {dailyChallenges,jstDay} from '../server/daily.mjs';
const ids=day=>dailyChallenges(day).map(c=>c.id);
const award=(s,day,runId,completedIds=ids(day),playerId='p')=>s.award({playerId,runId,day,completedIds});
test('three daily challenges are 100 each, cap 300 and dedupe same run',()=>{
 const s=createDailyRewardShadow(),day='2026-10-23';
 assert.deepEqual(ids(day).length,3);
 assert.equal(award(s,day,'a').newlyAwarded,300);
 assert.equal(award(s,day,'a').newlyAwarded,0);
 assert.equal(award(s,day,'b').newlyAwarded,0);
 assert.deepEqual(s.snapshot('p',day),{dayPoints:300,monthPoints:300});
});
test('split awards across different runs still cap at three distinct missions',()=>{
 const s=createDailyRewardShadow(),day='2026-10-23',m=ids(day);
 assert.equal(award(s,day,'a',[m[0],m[0]]).newlyAwarded,100);
 assert.equal(award(s,day,'b',[m[0],m[1]]).newlyAwarded,100);
 assert.equal(award(s,day,'c',[m[2]]).newlyAwarded,100);
 assert.equal(s.snapshot('p',day).dayPoints,300);
});
test('month rollover separates ranking monthly daily points',()=>{
 const s=createDailyRewardShadow();
 award(s,'2026-10-31','oct');
 assert.equal(s.snapshot('p','2026-10-31').monthPoints,300);
 assert.deepEqual(s.snapshot('p','2026-11-01'),{dayPoints:0,monthPoints:0});
 award(s,'2026-11-01','nov');
 assert.equal(s.snapshot('p','2026-11-01').monthPoints,300);
 assert.equal(s.snapshot('p','2026-10-31').monthPoints,300);
});
test('JST midnight changes challenge date rather than UTC midnight',()=>{
 assert.equal(jstDay(Date.parse('2026-10-31T14:59:59Z')),'2026-10-31');
 assert.equal(jstDay(Date.parse('2026-10-31T15:00:00Z')),'2026-11-01');
});
test('retry with modified completed challenges is rejected',()=>{
 const s=createDailyRewardShadow(),day='2026-10-23',m=ids(day);
 award(s,day,'run',[m[0]]);
 assert.throws(()=>award(s,day,'run',[m[1]]),/Conflicting run replay/);
 assert.equal(s.snapshot('p',day).dayPoints,100);
});
test('invalid mission and invalid date do not credit points',()=>{
 const s=createDailyRewardShadow();
 assert.throws(()=>award(s,'2026-10-23','x',['forged']),/Invalid challenge/);
 assert.throws(()=>award(s,'2026-02-30','y'),/Invalid day/);
 assert.equal(s.snapshot('p','2026-10-23').monthPoints,0);
});
test('players are isolated for awards',()=>{
 const s=createDailyRewardShadow(),day='2026-10-23';
 award(s,day,'run',ids(day),'p1');
 assert.equal(s.snapshot('p2',day).monthPoints,0);
 assert.equal(s.snapshot('p1',day).monthPoints,300);
});
