import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const game=readFileSync(new URL('../game.js',import.meta.url),'utf8');
test('staging game uses server-confirmed START and never submits legacy score twice',()=>{
 assert.match(game,/const stagingRunFlow=window\.PRIME_STAGING_RUN_FLOW\?\?null/);
 assert.match(game,/confirmed=await stagingRunFlow\.start\(\);applyConfirmedBoostRun\(confirmed\)/);
 assert.match(game,/if\(stagingRunFlow\)\{\s*stagingFinishRun/);
 assert.match(game,/else\{\s*window\.PRIME_RANKING\.finish/);
 assert.match(game,/if\(stagingRunFlow\.activeRun\)/);
});
test('score boost claim includes 10% but other boosts do not change final points',()=>{
 assert.match(game,/boost==='score'\?Math\.round\(result\.score\*1\.1\):result\.score/);
 assert.match(game,/stagingRunFlow\.finish\(payload\)/);
 assert.match(game,/structuredClone\(events\)/);
});
test('staging cannot be enabled by URL alone',()=>{
 assert.doesNotMatch(game,/URLSearchParams|location\.search.*BOOST/);
});
