import test from 'node:test';
import assert from 'node:assert/strict';
import {rankingBoostDisplay} from '../js/boost-ranking-display.mjs';
test('ranking retains total and separately displays verified SCORE BOOST bonus',()=>{
 assert.deepEqual(rankingBoostDisplay({playScore:55000,baseScore:50000,boostBonus:5000,boost:'score'}),{score:55000,baseScore:50000,boostBonus:5000,boost:'score',showBreakdown:true});
});
test('old scores are unchanged and no imaginary bonus is shown',()=>{
 assert.deepEqual(rankingBoostDisplay({playScore:33000}),{score:33000,baseScore:null,boostBonus:null,boost:null,showBreakdown:false});
});
test('TIME and SECOND CHANCE never claim multiplier points',()=>{
 for(const boost of ['time','sc',null])assert.deepEqual(rankingBoostDisplay({playScore:50000,baseScore:50000,boostBonus:0,boost}),{score:50000,baseScore:50000,boostBonus:0,boost,showBreakdown:false});
});
test('forged or inconsistent ranking bonus fails closed',()=>{
 assert.throws(()=>rankingBoostDisplay({playScore:55000,baseScore:50000,boostBonus:5000,boost:'time'}),RangeError);
 assert.throws(()=>rankingBoostDisplay({playScore:55000,baseScore:50000,boostBonus:2000,boost:'score'}),RangeError);
});
