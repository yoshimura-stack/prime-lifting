import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleBoosts,slotOutcome,scoreMultiplier,finalScore,ballColor,shouldProtectDrop,createBoostRun,validateBoostSelection} from '../js/boost-rules.mjs';
test('slot excludes full items and preserves miss as an eligible outcome',()=>{
 assert.deepEqual(eligibleBoosts({time:2,score:0,sc:2}),['score']);
 assert.deepEqual(slotOutcome({time:2,score:0,sc:2},()=>0),{type:'miss',reels:['miss','miss','miss']});
 assert.deepEqual(slotOutcome({time:2,score:0,sc:2},()=>0.9),{type:'score',reels:['score','score','score']});
 assert.equal(slotOutcome({time:2,score:2,sc:2}),null);
});
test('slot weights use 40 percent miss and 20 percent each boost',()=>{
 const empty={time:0,score:0,sc:0};
 for(const [roll,type] of [[0,'miss'],[.3999,'miss'],[.4,'time'],[.5999,'time'],[.6,'score'],[.7999,'score'],[.8,'sc'],[.9999,'sc']]){
  assert.equal(slotOutcome(empty,()=>roll).type,type);
 }
 const onlyScore={time:2,score:1,sc:2};
 assert.equal(slotOutcome(onlyScore,()=>0.6666).type,'miss');
 assert.equal(slotOutcome(onlyScore,()=>0.6667).type,'score');
 assert.throws(()=>slotOutcome(empty,()=>1),RangeError);
 assert.throws(()=>slotOutcome(empty,()=>-0.1),RangeError);
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

test('run duration and second chance preserve normal respawn and history icon',()=>{
 const time=createBoostRun('time');
 assert.equal(time.durationSeconds,65);
 assert.equal(createBoostRun().durationSeconds,60);
 const sc=createBoostRun('sc');
 assert.equal(sc.activeBallColor,'#22C55E');
 assert.deepEqual(sc.onDrop(),{protectedCombo:true,allowExistingRespawn:true});
 assert.equal(sc.activeBallColor,null);
 assert.equal(sc.historyBallColor,'#22C55E');
 assert.deepEqual(sc.onDrop(),{protectedCombo:false,allowExistingRespawn:true});
 assert.deepEqual(createBoostRun('score').onDrop(),{protectedCombo:false,allowExistingRespawn:true});
});
test('score follows current production Math.round convention',()=>{
 assert.equal(finalScore(105,'pc','score'),116);
 assert.equal(finalScore(105,'mobile','score'),126);
});

test('one BOOST maximum: duplicates and combinations are invalid',()=>{
 assert.equal(validateBoostSelection(null),null);
 for(const type of ['time','score','sc'])assert.equal(validateBoostSelection(type),type);
 for(const invalid of [['time','time'],['time','score'],['time','score','sc'],[],{},'unknown'])assert.throws(()=>validateBoostSelection(invalid),TypeError);
});
