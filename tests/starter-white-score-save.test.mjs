import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validKit} from '../server/replay.mjs';
import '../js/kits.js';
test('starter-white mandatory uniform is accepted for score saving',()=>{
 assert.equal(globalThis.PRIME_KITS.starter.id,'starter-white');
 assert.equal(validKit('starter-white'),true);
});
test('existing catalog uniforms remain accepted and forged IDs rejected',()=>{
 assert.equal(validKit(globalThis.PRIME_KITS.kits[0].id),true);
 assert.equal(validKit('fake-kit'),false);
 assert.equal(validKit(null),false);
});
