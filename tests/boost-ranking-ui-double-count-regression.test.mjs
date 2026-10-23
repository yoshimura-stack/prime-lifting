import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/ranking.js',import.meta.url),'utf8');
test('verified SCORE BOOST breakdown displays base plus bonus, never full playScore plus bonus',()=>{
 const start=source.indexOf("if(hasVerifiedBoost){");
 const end=source.indexOf("}else if(hasSplit)",start);
 assert.ok(start>=0&&end>start,'verified BOOST branch must precede legacy split');
 const branch=source.slice(start,end);
 assert.match(branch,/part\('Ⓟ',boostBase/);
 assert.match(branch,/part\('⚡',boostBonus/);
 assert.doesNotMatch(branch,/part\('Ⓟ',e\.playScore/);
});
test('daily bonus stays separate from verified play score',()=>{
 assert.match(source,/if\(hasBasic\)part\('Ⓓ',e\.dailyBonus/);
 assert.match(source,/boostBase\+boostBonus===\(hasBasic\?e\.playScore:e\.score\)/);
});
