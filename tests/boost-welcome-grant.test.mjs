import test from 'node:test';
import assert from 'node:assert/strict';
import {planWelcomeBoostGrant,WELCOME_BOOST_CAMPAIGN} from '../js/boost-welcome-grant.mjs';
test('WELCOME BOOST adds one of each to an empty account',()=>{
 const p=planWelcomeBoostGrant({time:0,score:0,sc:0});
 assert.equal(p.campaign,WELCOME_BOOST_CAMPAIGN);
 assert.deepEqual(p.grant,{time:1,score:1,sc:1});
 assert.deepEqual(p.resultingInventory,{time:1,score:1,sc:1});
});
test('WELCOME BOOST respects per-type cap even for existing stock',()=>{
 const p=planWelcomeBoostGrant({time:2,score:1,sc:0});
 assert.deepEqual(p.grant,{time:0,score:1,sc:1});
 assert.deepEqual(p.resultingInventory,{time:2,score:2,sc:1});
});
test('previously granted accounts cannot receive another welcome pack',()=>{
 const p=planWelcomeBoostGrant({time:0,score:0,sc:0},{alreadyGranted:true});
 assert.deepEqual(p.grant,{time:0,score:0,sc:0});
});
test('reject invalid or unverified inventory and grant state',()=>{
 assert.throws(()=>planWelcomeBoostGrant({time:-1,score:0,sc:0}),TypeError);
 assert.throws(()=>planWelcomeBoostGrant({time:3,score:0,sc:0}),TypeError);
 assert.throws(()=>planWelcomeBoostGrant({time:0,score:0,sc:0},{alreadyGranted:'false'}),TypeError);
});

test('staging SQL contract enforces serialized one-time welcome grant and service-only access',async()=>{
 const {readFile}=await import('node:fs/promises');
 const sql=await readFile(new URL('../docs/sql/prime-boost-preview-welcome-grant.sql',import.meta.url),'utf8');
 assert.match(sql,/from public\.lifting_players where id=v_player for update/i);
 assert.match(sql,/where player_id=v_player for update/i);
 assert.match(sql,/primary key \\(player_id\\)/i);
 assert.match(sql,/where player_id=v_player/i);
 assert.match(sql,/least\(1,2-v_inventory\.time_count\)/i);
 assert.match(sql,/least\(1,2-v_inventory\.score_count\)/i);
 assert.match(sql,/least\(1,2-v_inventory\.sc_count\)/i);
 assert.match(sql,/revoke all on function public\.lifting_api_boost_welcome_grant\(jsonb\) from public,anon,authenticated/i);
 assert.match(sql,/grant execute on function public\.lifting_api_boost_welcome_grant\(jsonb\) to service_role/i);
});
