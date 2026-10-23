import test from 'node:test';
import assert from 'node:assert/strict';
import {attachVerifiedBoostToLeader} from '../server/boost-leaderboard-bridge.mjs';
import {rankingBoostDisplay} from '../js/boost-ranking-display.mjs';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
for(const boost of ['time','score','sc'])test('verified '+boost+' appears as an icon-ready type without score splitting',()=>{
 const baseScore=50000;
 const boostBonus=boost==='score'?5000:0;
 const playScore=baseScore+boostBonus;
 const receipt={playerId,runId,boost,baseScore,boostBonus,playScore};
 const display=rankingBoostDisplay(receipt);
 assert.equal(display.showBreakdown,false);
 const entry={name:'Player',score:playScore+300,playScore,dailyBonus:300};
 const projected=attachVerifiedBoostToLeader(entry,receipt,playerId,runId);
 assert.equal(projected.boost,boost);
 assert.equal(projected.boostBaseScore,baseScore);
 assert.equal(projected.boostBonus,boostBonus);
 assert.equal(projected.score,entry.score);
 assert.equal(projected.playScore,playScore);
});
test('normal runs, forged SCORE bonus and mismatched best run never gain icon',()=>{
 const entry={score:55000,playScore:55000};
 const receipt={playerId,runId,boost:'score',baseScore:50000,boostBonus:5000,playScore:55000};
 assert.equal(attachVerifiedBoostToLeader(entry,receipt,playerId,'123e4567-e89b-42d3-a456-426614174003').boost,undefined);
 assert.equal(attachVerifiedBoostToLeader(entry,{...receipt,boostBonus:9000},playerId,runId).boost,undefined);
 assert.equal(attachVerifiedBoostToLeader(entry,{...receipt,boost:null,baseScore:55000,boostBonus:0},playerId,runId).boost,undefined);
});
