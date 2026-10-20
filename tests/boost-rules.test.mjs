import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleBoosts,slotOutcome,scoreMultiplier,finalScore,ballColor,shouldProtectDrop} from '../js/boost-rules.mjs';
test('slot excludes full items and always returns triple match',()=>{
 assert.deepEqual(eligibleBoosts({time:2,score:0,sc:2}),['score']);
 assert.deepEqual(slotOutcome({time:2,score:0,sc:2},()=>0.9),{type:'score',reels:['score','score','score']});
 assert.equal(slotOutcome({time:2,score:2,sc:2}),null);
});
test('slot boundaries are deterministic and validated',()=>{
 assert.equal(slotOutcome({time:0,score:0,sc:0},()=>0).type,'time');
 assert.equal(slotOutcome({time:0,score:0,sc:0},()=>0.5).type,'score');
 assert.equal(slotOutcome({time:0,score:0,sc:0},()=>0.999).type,'sc');
 assert.throws(()=>slotOutcome({time:0,score:0,sc:0},()=>1),RangeError);
});
test('mobile bonus is additive x1.2 not compounded x1.21',()=>{
 assert.equal(scoreMultiplier('pc','score'),11);
 assert.equal(scoreMultiplier('mobile','score'),12);
 assert.equal(finalScore(50000,'pc','score'),55000);
 assert.equal(finalScore(50000,'mobile','score'),60000);
 assert.equal(finalScore(101,'mobile','score'),121);
 assert.equal(finalScore(50000,'mobile'),55000);
});
test('SC is green until first drop and protects once',()=>{
 assert.equal(ballColor('sc'), '#22C55E');
 assert.equal(shouldProtectDrop('sc',false),true);
 assert.equal(shouldProtectDrop('sc',true),false);
 assert.equal(ballColor('sc',true),null);
 assert.equal(ballColor('time'), '#3B82F6');
 assert.equal(ballColor('score'), '#FACC15');
});
