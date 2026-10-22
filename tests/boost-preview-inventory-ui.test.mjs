import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/boost-preview.js',import.meta.url),'utf8');
test('staging selection is locked until validated inventory',()=>{
 assert.match(source,/lockInventory\(\);/);
 assert.match(source,/card\.disabled=true/);
 assert.match(source,/Number\.isInteger\(counts\[type\]\)/);
 assert.match(source,/card\.disabled=count===0/);
 assert.match(source,/none\.click\(\)/);
});
test('preview cannot reserve or mutate live inventory',()=>{
 assert.doesNotMatch(source,/\/api\/boost-preview\/reserve/);
 assert.doesNotMatch(source,/localStorage\.getItem\(/);
});
