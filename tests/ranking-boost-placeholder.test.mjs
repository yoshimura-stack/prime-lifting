import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/ranking.js',import.meta.url),'utf8');
test('ranking keeps historical totals and removes the mobile bonus row',()=>{
 assert.match(source,/part\('Ⓟ',hasBasic\?e\.playScore:e\.score/);
 assert.match(source,/boostPart\.textContent=verifiedScoreBoost\?'⚡ 🟡':'⚡ —'/);
 assert.match(source,/e\.bestBoost==='score'&&hasSplit&&e\.mobileBonus>0/);
 assert.doesNotMatch(source,/part\('📱'/);
 assert.match(source,/旧スマホ補正を含む/);
});

test('DAILY BOOST picker uses server inventory with one use per type',()=>{
 assert.match(source,/let boostInventory=null;/);
 assert.match(source,/boostInventory=data\?\.inventory\?\?null;/);
 assert.match(source,/Math\.min\(1,inventory\[kind\]\)/);
 assert.match(source,/renderBoostPicker\(boostInventory\);/);
 assert.doesNotMatch(source,/Math\.min\(2,inventory\[kind\]\)/);
 assert.doesNotMatch(source,/Object\.fromEntries\(\[\.\.\.boostPanel/);
});

test('first-release picker exposes SCORE only with production flags enabled after DB readiness',()=>{
 assert.match(source,/button\.hidden=kind!=='score'/);
 assert.match(source,/button\.disabled=kind!=='score'\|\|!boostReady\|\|count===0/);
 const config=readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8');
 assert.match(config,/"PRIME_BOOST_ENABLED": "true"/);
 assert.match(config,/"PRIME_BOOST_SCORE_PERSISTENCE_READY": "true"/);
});
