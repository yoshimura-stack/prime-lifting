import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
test('staging preview remains double locked',async()=>{
 const config=JSON.parse(await read('../wrangler.boost-preview.jsonc'));
 const client=await read('../js/boost-slot-client.mjs');
 assert.equal(config.vars.BOOST_PREVIEW_ENABLED,'false');
 assert.equal(config.assets.directory,'./boost-preview-public');
 assert.ok(client.includes('SLOT_BROWSER_ENABLED=false'));
});
