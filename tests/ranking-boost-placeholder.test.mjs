import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/ranking.js',import.meta.url),'utf8');
test('ranking keeps historical totals and removes the mobile bonus row',()=>{
 assert.match(source,/part\('Ⓟ',hasBasic\?e\.playScore:e\.score/);
 assert.match(source,/boostPart\.textContent='⚡ —'/);
 assert.doesNotMatch(source,/part\('📱'/);
 assert.match(source,/旧スマホ補正を含む/);
});
