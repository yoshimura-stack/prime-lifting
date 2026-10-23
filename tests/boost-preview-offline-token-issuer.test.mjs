import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {verifyPreviewToken} from '../server/boost-preview-auth.mjs';
const script=new URL('../scripts/issue-boost-preview-token.mjs',import.meta.url);
const secret='isolated-staging-session-secret-01234567890123456789';
const playerId='123e4567-e89b-42d3-a456-426614174001';
test('offline issuer emits a short-lived bearer for one staging UUID',async()=>{
 const run=spawnSync(process.execPath,[script.pathname,playerId],{env:{...process.env,BOOST_PREVIEW_SESSION_SECRET:secret},encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 assert.equal(await verifyPreviewToken(run.stdout.trim(),{secret}),playerId);
 assert.equal(await verifyPreviewToken(run.stdout.trim(),{secret:'wrong-secret-012345678901234567890123456789'}),null);
 assert.equal(await verifyPreviewToken(run.stdout.trim(),{secret,now:Date.now()+901000}),null);
});
test('offline issuer fails closed without secret or with invalid identity',()=>{
 const noSecret=spawnSync(process.execPath,[script.pathname,playerId],{env:{PATH:process.env.PATH??''},encoding:'utf8'});
 assert.notEqual(noSecret.status,0);assert.equal(noSecret.stdout,'');
 const invalid=spawnSync(process.execPath,[script.pathname,'not-a-uuid'],{env:{...process.env,BOOST_PREVIEW_SESSION_SECRET:secret},encoding:'utf8'});
 assert.notEqual(invalid.status,0);assert.equal(invalid.stdout,'');
});
