import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedBoostGameConfig} from '../server/boost-game-config.mjs';
import {issueBoostRunToken} from '../server/boost-run-token.mjs';
import '../js/config.js';
import '../js/engine.js';
const playerId='123e4567-e89b-42d3-a456-426614174001';
const runId='123e4567-e89b-42d3-a456-426614174002';
const secret='staging-integration-secret-12345678901234567890';
const now=Date.UTC(2026,9,21);
const baseConfig=globalThis.PRIME_DEFAULTS;
for(const boost of [null,'time','score','sc'])test('signed '+(boost??'NONE')+' creates correct isolated timer',async()=>{
 const token=await issueBoostRunToken({playerId,runId,boost,secret,now});
 const {config,boost:selected}=await verifiedBoostGameConfig({token,playerId,runId,secret,now,baseConfig});
 assert.equal(selected,boost);
 assert.equal(config.GAME_DURATION,boost==='time'?65:60);
 assert.equal(baseConfig.GAME_DURATION,60);
 const game=new globalThis.LiftingGame(config);
 game.reset();
 assert.equal(game.remaining,boost==='time'?65:60);
});
test('forged, mismatched or expired token cannot change duration',async()=>{
 const token=await issueBoostRunToken({playerId,runId,boost:'time',secret,now});
 const options={token,playerId,runId,secret,now,baseConfig};
 await assert.rejects(verifiedBoostGameConfig({...options,token:token+'x'}),/Valid server-issued/);
 await assert.rejects(verifiedBoostGameConfig({...options,runId:'123e4567-e89b-42d3-a456-426614174003'}),/Valid server-issued/);
 await assert.rejects(verifiedBoostGameConfig({...options,now:now+3600_000}),/Valid server-issued/);
 assert.equal(baseConfig.GAME_DURATION,60);
});
