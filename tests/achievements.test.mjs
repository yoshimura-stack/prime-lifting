import test from 'node:test';
import assert from 'node:assert/strict';
import {achievementMask,publicProgress,TITLES} from '../server/achievements.mjs';
test('all eight titles map to stable distinct bits',()=>{
 assert.equal(TITLES.length,8);
 const mask=achievementMask({combo:30,achievementProof:{maxAirStreak:3,spinKing:true,shoulderHits:1,quadMaster:true,airQuad:true,doubleAir:true}},50000);
 assert.equal(mask,255);
 assert.equal(publicProgress({mask}).master,true);
 assert.equal(publicProgress({mask}).earned.length,8);
});
test('progress is cumulative across sessions via bitwise OR',()=>{
 const first=achievementMask({combo:12,achievementProof:{maxAirStreak:3,spinKing:true,shoulderHits:1,quadMaster:true,airQuad:true,doubleAir:true}},41000);
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
