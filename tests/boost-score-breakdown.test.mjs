import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedBoostBreakdown,rankingBoostBreakdown} from '../js/boost-score-breakdown.mjs';
test('same BOOST delta on PC and mobile',()=>{
 for(const device of ['pc','mobile']){
  assert.deepEqual(verifiedBoostBreakdown(50000,device,'score'),{baseScore:50000,boost:'score',boostBonus:5000,playScore:55000});
  assert.deepEqual(verifiedBoostBreakdown(50000,device,null),{baseScore:50000,boost:null,boostBonus:0,playScore:50000});
  assert.equal(verifiedBoostBreakdown(105,device,'score').boostBonus,11);
 }
});
test('historical score is preserved without inventing BOOST credit',()=>{
 assert.deepEqual(rankingBoostBreakdown({playScore:33000}),{playScore:33000,boostBonus:null,boost:null,legacy:true});
 assert.deepEqual(rankingBoostBreakdown({playScore:55000,baseScore:50000,boostBonus:5000,boost:'score'}),{playScore:55000,baseScore:50000,boostBonus:5000,boost:'score',legacy:false});
});
test('inconsistent or forged BOOST breakdown is rejected',()=>{
 for(const record of [
  {playScore:55000,baseScore:50000,boostBonus:5000,boost:'time'},
  {playScore:55000,baseScore:50000,boostBonus:3000,boost:'score'},
  {playScore:55000,baseScore:50000,boostBonus:-1,boost:'score'},
 ])assert.throws(()=>rankingBoostBreakdown(record),RangeError);
 assert.throws(()=>verifiedBoostBreakdown(-1,'mobile','score'),RangeError);
});
