import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/config.js';
import '../js/engine.js';
import {replay} from '../server/replay.mjs';
function create(sc=true){
 const config=structuredClone(globalThis.PRIME_DEFAULTS);
 config.SC_PROTECT_FIRST_DROP=sc;
 const game=new globalThis.LiftingGame(config);
 game.reset();game.phase='playing';
 return game;
}
function drop(game,side='ground'){
 game.ball.pickup=false;game.ball.active=true;game.ball.vx=0;game.ball.vy=0;
 game.ball.x=side==='left'?-game.c.BALL_RADIUS-1:side==='right'?game.c.WORLD_WIDTH+game.c.BALL_RADIUS+1:game.c.WORLD_WIDTH/2;
 game.ball.y=side==='ground'?game.c.GROUND_Y-game.c.BALL_RADIUS+1:game.c.GROUND_Y-200;
 game.events.length=0;
 game.update(game.c.FIXED_STEP,0);
 assert.equal(game.events.filter(e=>e.type==='drop').length,1);
}
test('first out-of-bounds drop also consumes SC without cancelling NEXT BALL',()=>{
 const game=create();game.combo=12;
 drop(game,'left');
 assert.equal(game.combo,12);
 assert.equal(game.drops,1);
 assert.equal(game.scProtectedDropUsed,true);
 assert.equal(game.respawnMode,'throw');
 assert.ok(game.respawn>0);
 game.respawn=0;
 game.update(game.c.FIXED_STEP,0);
 assert.equal(game.ball.active,true);
 game.combo=8;
 drop(game,'right');
 assert.equal(game.combo,0);
 assert.equal(game.drops,2);
});
test('first drop with zero combo still consumes the single protection',()=>{
 const game=create();
 drop(game);
 assert.equal(game.combo,0);
 assert.equal(game.scProtectedDropUsed,true);
 game.respawnAtFeet();
 game.combo=10;
 drop(game);
 assert.equal(game.combo,0);
});
test('SC never protects a second drop, including repeated ground drops',()=>{
 const game=create();game.combo=20;
 drop(game);
 assert.equal(game.combo,20);
 game.respawnAtFeet();
 game.combo=23;
 drop(game);
 assert.equal(game.combo,0);
 assert.equal(game.drops,2);
});
test('server replay accepts SC without adding points or extra seconds on empty run',()=>{
 const normal=replay([],1000);
 const sc=replay([],1000,'sc');
 assert.equal(sc.score,normal.score);
 assert.equal(sc.drops,normal.drops);
 assert.equal(sc.hits,normal.hits);
 assert.throws(()=>replay([{t:8100,n:'move',v:0}],1000,'sc'),{status:400});
});
