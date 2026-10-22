import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/boost-preview.js',import.meta.url),'utf8');
test('staging BOOST cards remain locked without trusted server inventory',()=>{
 assert.match(source,/lockInventory\(\);/);
 assert.match(source,/card\.disabled=true/);
 assert.match(source,/card\.querySelector\('\.prime-boost-count'\)\.textContent='-- \/ 2'/);
 assert.match(source,/サーバー未接続/);
 assert.match(source,/BOOST使用不可/);
});
test('preview cannot reserve or mutate live inventory',()=>{
 assert.doesNotMatch(source,/\/api\/boost-preview\/reserve/);
 assert.doesNotMatch(source,/localStorage\.getItem\(/);
});
