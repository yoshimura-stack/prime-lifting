import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedBoostBreakdown} from '../js/boost-score-breakdown.mjs';
import {createBoostRun} from '../js/boost-rules.mjs';
test('PC and mobile have identical SCORE BOOST x1.1',()=>{
 for(const device of ['pc','mobile']){
  assert.deepEqual(verifiedBoostBreakdown(50000,device,'score'),{baseScore:50000,boost:'score',boostBonus:5000,playScore:55000});
  assert.deepEqual(verifiedBoostBreakdown(50000,device,null),{baseScore:50000,boost:null,boostBonus:0,playScore:50000});
 }
});
test('preview correctly labels both devices and remains opt-in/disabled',()=>{
 const source=readFileSync(new URL('../js/boost-preview.js',import.meta.url),'utf8');
 assert.match(source,/PC \/ MOBILE 共通 ×1\.1/);
 assert.match(source,/boostPreview/);
 assert.match(source,/button\.disabled=true/);
});
test('time and second chance state remain isolated until replay support',()=>{
 assert.equal(createBoostRun('time').durationSeconds,65);
 const chance=createBoostRun('sc');
 assert.equal(chance.onDrop().protectedCombo,true);
 assert.equal(chance.onDrop().protectedCombo,false);
});

test('play-ready preview stays disconnected and tolerates missing overlay nodes',()=>{
 const source=readFileSync(new URL('../js/boost-preview.js',import.meta.url),'utf8');
 assert.match(source,/サーバー未接続 · BOOST使用不可/);
 assert.match(source,/if\(overlay\)new MutationObserver/);
 assert.match(source,/if\(overlayTitle\)new MutationObserver/);
 assert.match(source,/ゲーム開始・在庫消費・得点変更なし/);
});

test('preview is anchored before START but never hooks the real START action',()=>{
 const source=readFileSync(new URL('../js/boost-preview.js',import.meta.url),'utf8');
 assert.match(source,/getElementById\('start'\)/);
 assert.match(source,/startButton\.before\(section\)/);
 assert.doesNotMatch(source,/startButton\.addEventListener/);
});

test('untrusted DOM inventory events cannot unlock BOOST controls',()=>{
 const source=readFileSync(new URL('../js/boost-preview.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/addEventListener\('boost-preview-inventory'/);
 assert.doesNotMatch(source,/function showInventory\(/);
 assert.match(source,/card\.disabled=true/);
 assert.match(source,/any script can dispatch a custom event/);
});
