import test from 'node:test';
import assert from 'node:assert/strict';
import {DAILY_POOLS,jstDay,dailyChallenges,completedDailyChallenges,earnedPlayCoins,rankingTotal,jstMonth} from '../server/daily.mjs';
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

test('daily bonus can overtake a higher play best',()=>{
 assert.equal(rankingTotal(67000,40),71000);
 assert.ok(rankingTotal(67000,40)>rankingTotal(70000,0));
 assert.equal(jstMonth('2026-10-31'),'2026-10');
 assert.equal(jstMonth('2026-11-01'),'2026-11');
 assert.throws(()=>rankingTotal(-1,2));
});

test('signed start day remains stable when a play ends after JST midnight',()=>{
 const started=Date.parse('2026-10-18T14:59:00Z'); // 23:59 JST
 const ended=Date.parse('2026-10-18T15:01:00Z'); // 00:01 JST
 assert.equal(jstDay(started),'2026-10-18');
 assert.equal(jstDay(ended),'2026-10-19');
 const result={combo:100,nextProof:{foot:100,knee:100,chest:100,shoulder:100,spin:100,jump:100},achievementProof:{quadMaster:true}};
 assert.deepEqual(completedDailyChallenges(jstDay(started),result),dailyChallenges('2026-10-18').map(c=>c.id));
 assert.deepEqual(completedDailyChallenges(jstDay(ended),result),dailyChallenges('2026-10-19').map(c=>c.id));
});

test('thirty unique bank missions rotate for everyone without repeats across ten days',()=>{
 const difficulties=['easy','normal','hard'];
 for(const difficulty of difficulties){
  const pool=DAILY_POOLS[difficulty];
  assert.equal(pool.length,10);
  assert.equal(new Set(pool.map(c=>c.id)).size,10);
  assert.ok(pool.every(c=>['combo','foot','knee','chest','shoulder','spin','jump','quad'].includes(c.metric)&&Number.isSafeInteger(c.target)&&c.target>0));
  const chosen=[];
  for(let offset=0;offset<11;offset++){
   const day=new Date(Date.parse('2026-10-20T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
   const selected=dailyChallenges(day).find(c=>c.difficulty===difficulty);
   assert.deepEqual(selected,dailyChallenges(day).find(c=>c.difficulty===difficulty));
   chosen.push(selected.id);
  }
  assert.equal(new Set(chosen.slice(0,10)).size,10);
  for(let i=1;i<chosen.length;i++)assert.notEqual(chosen[i],chosen[i-1]);
  assert.equal(chosen[0],chosen[10]);
 }
});

test('October 20 missions remain identical to the pre-bank production release',()=>{
 const hash=value=>{let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
 const legacy={easy:['keep10','keep15','foot10'],normal:['spin3','jump5','knee8','chest6'],hard:['shoulder2','keep30','quad1']};
 const day='2026-10-20';
 assert.deepEqual(dailyChallenges(day).map(c=>c.id),Object.entries(legacy).map(([difficulty,ids])=>ids[hash(day+':'+difficulty)%ids.length]));
 assert.equal(dailyChallenges('2026-10-21').length,3);
});
