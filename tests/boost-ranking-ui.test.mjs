import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ranking=readFileSync(new URL('../js/ranking.js',import.meta.url),'utf8');
test('ranking dialog keeps separate SCORE BOOST bonus, existing daily credits, and total',()=>{
 assert.match(ranking,/const boostBase=e\.boostBaseScore,boostBonus=e\.boostBonus,boostType=e\.boost/);
 assert.match(ranking,/Math\.round\(boostBase\*1\.1\)===boostBase\+boostBonus/);
 assert.match(ranking,/if\(hasVerifiedBoost\)part\('⚡',boostBonus,'SCORE BOOSTによる加点'\)/);
 assert.match(ranking,/if\(hasBasic\)part\('Ⓓ',e\.dailyBonus/);
 assert.match(ranking,/total\.textContent=e\.score\.toLocaleString\(\)\+' PTS'/);
});
