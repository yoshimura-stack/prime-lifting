import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const game=readFileSync(new URL('../game.js',import.meta.url),'utf8');
test('browser only accepts server-confirmed duration and arms SC engine flag',()=>{
 assert.match(game,/run\.durationSeconds!==\(run\.boost==='time'\?65:60\)/);
 assert.match(game,/c\.GAME_DURATION=run\.durationSeconds/);
 assert.match(game,/c\.SC_PROTECT_FIRST_DROP=run\.boost==='sc'/);
});
test('staging BOOST stays disabled until authenticated API is wired',()=>{
 assert.match(game,/const stagingBoostStartEnabled=false/);
 assert.match(game,/if\(stagingBoostStartEnabled\)throw new Error/);
});
