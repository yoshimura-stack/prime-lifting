import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ranking=readFileSync(new URL('../js/ranking.js',import.meta.url),'utf8');
test('ranking shows final score and daily credit without BOOST bonus split',()=>{
 assert.match(ranking,/function verifiedBoostIcon\(entry\)/);
 assert.match(ranking,/if\(verifiedBoostIcon\(e\)\)\{part\('Ⓟ',hasBasic\?e\.playScore:e\.score/);
 assert.doesNotMatch(ranking,/part\('⚡',boostBonus/);
 assert.match(ranking,/if\(hasBasic\)part\('Ⓓ',e\.dailyBonus/);
 assert.match(ranking,/total\.textContent=e\.score\.toLocaleString\(\)\+' PTS'/);
});
