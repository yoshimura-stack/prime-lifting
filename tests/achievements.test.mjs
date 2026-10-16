import test from 'node:test';
import assert from 'node:assert/strict';
import {achievementMask,publicProgress,TITLES,nextLevelMask,NEXT_TITLES} from '../server/achievements.mjs';
test('all eight titles map to stable distinct bits',()=>{
 assert.equal(TITLES.length,8);
 const mask=achievementMask({combo:30,achievementProof:{maxAirStreak:3,spinKing:true,shoulderHits:3,quadMaster:true,airQuad:true,doubleAir:true}},50000);
 assert.equal(mask,255);
 assert.equal(publicProgress({mask}).master,true);
 assert.equal(publicProgress({mask}).earned.length,8);
});
test('progress is cumulative across sessions via bitwise OR',()=>{
 const first=achievementMask({combo:12,achievementProof:{maxAirStreak:3,spinKing:true,shoulderHits:3,quadMaster:true,airQuad:true,doubleAir:true}},41000);
 const second=achievementMask({combo:30,achievementProof:{}},50000);
 assert.equal(first|second,255);
});
test('score threshold uses verified final score',()=>{
 const result={combo:0,achievementProof:{}};
 assert.equal(achievementMask(result,49999)&16,0);
 assert.equal(achievementMask(result,50000)&16,16);
});
test('malformed progress is rejected',()=>{
 for(const mask of [-1,256,2.5,'255',null])assert.throws(()=>publicProgress({mask}));
});

test('30 keeps unlocks the first title, while 29 does not',()=>{
 assert.equal(achievementMask({combo:29,achievementProof:{}},0)&1,0);
 assert.equal(achievementMask({combo:30,achievementProof:{}},0)&1,1);
 assert.equal(achievementMask({combo:50,achievementProof:{}},0)&1,1);
 assert.equal(TITLES[0],'30 KEEPS CLUB');
});

test('SHOULDER ACE requires three shoulder hits in a single verified run',()=>{
 for(const n of [0,1,2])assert.equal(achievementMask({combo:0,achievementProof:{shoulderHits:n}},0)&8,0);
 assert.equal(achievementMask({combo:0,achievementProof:{shoulderHits:3}},0)&8,8);
 assert.equal(achievementMask({combo:0,achievementProof:{shoulderHits:4}},0)&8,8);
});

test('six masters unlock at 30 uninterrupted matching keeps and remain earned afterward',()=>{
 assert.equal(NEXT_TITLES.length,8);
 for(const [key,bit] of [['foot',1],['knee',2],['chest',4],['heading',8],['spin',16],['jump',32]]){
  const prefix={hits:30,unbroken:true,[key]:30};
  assert.equal(nextLevelMask({nextProof:{totalHits:30,first30:prefix}})&bit,bit);
  assert.equal(nextLevelMask({nextProof:{totalHits:50,first30:prefix}})&bit,bit);
  assert.equal(nextLevelMask({nextProof:{totalHits:29,first30:null}})&bit,0);
  assert.equal(nextLevelMask({nextProof:{totalHits:30,first30:{...prefix,[key]:29}}})&bit,0);
  assert.equal(nextLevelMask({nextProof:{totalHits:30,first30:{...prefix,unbroken:false}}})&bit,0);
 }
});
test('shoulder master needs ten; legend needs four each',()=>{
 const p={totalHits:28,foot:4,knee:4,chest:4,heading:4,shoulder:4,spin:4,jump:4};
 assert.equal(nextLevelMask({nextProof:p})&128,128);
 assert.equal(nextLevelMask({nextProof:{...p,shoulder:3}})&128,0);
 assert.equal(nextLevelMask({nextProof:{...p,shoulder:9}})&64,0);
 assert.equal(nextLevelMask({nextProof:{...p,shoulder:10}})&64,64);
});
