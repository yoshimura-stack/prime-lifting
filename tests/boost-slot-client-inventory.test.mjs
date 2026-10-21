import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/boost-slot-client.mjs',import.meta.url),'utf8');
test('preview remains disabled and requires authenticated inventory',()=>{
 assert.match(source,/SLOT_BROWSER_ENABLED=false/);
 assert.match(source,/\/api\/boost-preview\/inventory/);
 assert.match(source,/authorization:'Bearer '\+token/);
 assert.match(source,/Number\.isInteger\(value\?\.\[type\]\)/);
 assert.match(source,/token='';view\.setStatus/);
});
