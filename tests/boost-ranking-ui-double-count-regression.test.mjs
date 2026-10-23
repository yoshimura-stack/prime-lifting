import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/ranking.js',import.meta.url),'utf8');
test('ranking displays verified BOOST as an icon, never as separate bonus points',()=>{
 assert.match(source,/function verifiedBoostIcon\(entry\)/);
 assert.match(source,/rank-boost-icon rank-boost-/);
 assert.match(source,/boostIcon=verifiedBoostIcon\(entry\)/);
 assert.doesNotMatch(source,/part\('⚡',boostBonus/);
 assert.match(source,/if\(verifiedBoostIcon\(e\)\)\{part\('Ⓟ',hasBasic\?e\.playScore:e\.score/);
});
test('SCORE BOOST icon requires consistent verified bonus; TIME and SC require zero bonus',()=>{
 assert.match(source,/Math\.round\(base\*1\.1\)!==play\|\|base\+bonus!==play/);
 assert.match(source,/bonus!==0\|\|base!==play/);
});
test('daily bonus remains separate from play score',()=>{
 assert.match(source,/if\(hasBasic\)part\('Ⓓ',e\.dailyBonus/);
});
