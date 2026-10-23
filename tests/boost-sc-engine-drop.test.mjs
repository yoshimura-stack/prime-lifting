import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/config.js';
import '../js/engine.js';
function game(sc){
 const c=structuredClone(globalThis.PRIME_DEFAULTS);
 c.SC_PROTECT_FIRST_DROP=sc;
 const g=new globalThis.LiftingGame(c);
 g.reset();g.phase='playing';
 return g;
}
function forceDrop(g){
 g.ball.pickup=false;
 g.ball.active=true;
 g.ball.x=g.c.WORLD_WIDTH/2;
 g.ball.y=g.c.GROUND_Y-g.c.BALL_RADIUS+1;
 g.ball.vy=0;
 g.update(g.c.FIXED_STEP,0);
 return g.events.some(e=>e.type==='drop');
}
test('SC preserves combo on first drop but still counts drop and respawns',()=>{
 const g=game(true);
 g.combo=7;
 assert.equal(forceDrop(g),true);
 assert.equal(g.combo,7);
 assert.equal(g.drops,1);
 assert.equal(g.scProtectedDropUsed,true);
 assert.equal(g.ball.active,false);
 assert.ok(g.respawn>0);
 g.events.length=0;
 g.respawnAtFeet();
 g.combo=9;
 assert.equal(forceDrop(g),true);
 assert.equal(g.combo,0);
 assert.equal(g.drops,2);
});
test('normal play resets combo on first drop and never consumes SC',()=>{
 const g=game(false);g.combo=7;
 assert.equal(forceDrop(g),true);
 assert.equal(g.combo,0);
 assert.equal(g.scProtectedDropUsed,false);
});
test('SC usage resets between new games',()=>{
 const g=game(true);g.combo=4;forceDrop(g);
 assert.equal(g.scProtectedDropUsed,true);
 g.reset();
 assert.equal(g.scProtectedDropUsed,false);
});
