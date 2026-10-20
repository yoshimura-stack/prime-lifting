import test from 'node:test';
import assert from 'node:assert/strict';
import {issuePreviewToken,verifyPreviewToken,createPreviewSessionResolver} from '../server/boost-preview-auth.mjs';
import worker from '../server/boost-preview-worker.mjs';
const secret='test-preview-secret-with-32-or-more-characters';
const player='123e4567-e89b-42d3-a456-426614174001';
test('dedicated preview tokens authenticate and expire',async()=>{
 const token=await issuePreviewToken({playerId:player,secret,now:1000000,ttlSeconds:60});
 assert.equal(await verifyPreviewToken(token,{secret,now:1001000}),player);
 assert.equal(await verifyPreviewToken(token,{secret,now:1060000}),null);
 assert.equal(await verifyPreviewToken(token+'x',{secret,now:1000000}),null);
 assert.equal(await verifyPreviewToken(token,{secret:'another-preview-secret-with-32-or-more-characters',now:1000000}),null);
 const resolve=createPreviewSessionResolver({secret,now:1000000});
 assert.equal(await resolve(new Request('https://preview.example/',{headers:{authorization:'Bearer '+token}})),player);
 assert.equal(await resolve(new Request('https://preview.example/')),null);
});
test('staging Worker fails closed without explicit config',async()=>{
 const res=await worker.fetch(new Request('https://preview.example/api/boost-preview/slot/spin',{method:'POST'}),{});
 assert.equal(res.status,503);
});
test('preview token creation rejects invalid identity and short secret',async()=>{
 await assert.rejects(issuePreviewToken({playerId:'invalid',secret}),TypeError);
 await assert.rejects(issuePreviewToken({playerId:player,secret:'short'}),TypeError);
});
