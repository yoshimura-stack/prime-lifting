import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostInventoryModel} from '../js/boost-inventory-model.mjs';
test('six stock units can be used in six separate runs on the same day',()=>{
 const m=createBoostInventoryModel({time:2,score:2,sc:2});
 for(const [i,type] of ['time','time','score','score','sc','sc'].entries())m.reserve({runId:'run-'+i,boost:type});
 assert.deepEqual(m.snapshot(),{time:0,score:0,sc:0});
 assert.throws(()=>m.reserve({runId:'run-7',boost:'time'}),/exhausted/);
});
test('new award permits seventh BOOST use on same day',()=>{
 const m=createBoostInventoryModel({time:2,score:2,sc:2});
 for(const [i,type] of ['time','time','score','score','sc','sc'].entries())m.reserve({runId:'run-'+i,boost:type});
 const prize=m.spin({day:'2026-10-20',random:()=>0.5});
 assert.equal(prize.outcome.type,'time');
 assert.equal(m.reserve({runId:'run-7',boost:'time'}).inventory.time,0);
});
test('same run id never consumes twice and cannot switch types',()=>{
 const m=createBoostInventoryModel({time:2,score:2});
 m.reserve({runId:'abc',boost:'time'});
 assert.equal(m.reserve({runId:'abc',boost:'time'}).replayed,true);
 assert.equal(m.snapshot().time,1);
 assert.throws(()=>m.reserve({runId:'abc',boost:'score'}),/different/);
 assert.throws(()=>m.reserve({runId:'multi',boost:['time','score']}),TypeError);
});
test('one slot per JST day; repeat returns stored prize without another award',()=>{
 const m=createBoostInventoryModel();
 const first=m.spin({day:'2026-10-20',random:()=>0.7});
 assert.equal(first.outcome.type,'score');
 assert.equal(m.spin({day:'2026-10-20',random:()=>0}).replayed,true);
 assert.deepEqual(m.snapshot(),{time:0,score:1,sc:0});
 const next=m.spin({day:'2026-10-21',random:()=>0.5});
 assert.equal(next.outcome.type,'time');
});
test('full inventory skips slot and does not count as a spin',()=>{
 const m=createBoostInventoryModel({time:2,score:2,sc:2});
 assert.equal(m.spin({day:'2026-10-20'}).outcome,null);
 m.reserve({runId:'run-a',boost:'sc'});
 assert.equal(m.spin({day:'2026-10-20',random:()=>0.9}).outcome.type,'sc');
 assert.deepEqual(m.snapshot(),{time:2,score:2,sc:2});
});
test('none selection does not consume any item',()=>{
 const m=createBoostInventoryModel({time:1});
 assert.equal(m.reserve({runId:'plain',boost:null}).boost,null);
 assert.deepEqual(m.snapshot(),{time:1,score:0,sc:0});
});

test('miss uses daily spin without awarding stock',()=>{
 const m=createBoostInventoryModel();
 assert.equal(m.spin({day:'2026-10-21',random:()=>0.1}).outcome.type,'miss');
 assert.equal(m.spin({day:'2026-10-21',random:()=>0.99}).replayed,true);
 assert.deepEqual(m.snapshot(),{time:0,score:0,sc:0});
});
