import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/engine.js',import.meta.url),'utf8');
const ctx=vm.createContext({});vm.runInContext(source,ctx);
const c={WORLD_WIDTH:1000,GROUND_Y:600,BALL_RADIUS:12,BALL_GRAVITY:100,FIELD_MARGIN:0,PLAYER_SPEED:0,SPIN_MOVE_FACTOR:1,GRAVITY:0,SC_PROTECT_FIRST_DROP:true,COUNTDOWN_SECONDS:0,GAME_DURATION:60,RESPAWN_DELAY:0.1,ACTION_COOLDOWN:0,ACTION_DURATION:0.1,SPIN_DURATION:0.2,SPIN_BONUS:100,AIR_STREAK_BONUS:100,MAX_STREAK_LEVEL:10,BALL_MAX_HORIZONTAL_SPEED:500,CONTACT_EDGE_LIFT_LOSS:0,ACTIONS:{FOOT:{score:100,verticalVelocity:200,horizontalInfluence:0,moveInfluence:0}},};
function setup(){const g=new ctx.LiftingGame(c);g.phase='playing';g.combo=6;g.spinStreak=3;g.airStreak=2;return g;}
function drop(g){g.ball.active=true;g.ball.pickup=false;g.ball.y=c.GROUND_Y-c.BALL_RADIUS-1;g.ball.vy=100;g.ball.vx=0;g.update(1/60,0);}
function pickup(g){g.ball.active=true;g.ball.pickup=true;g.ball.x=g.player.x;g.ball.y=c.GROUND_Y-40;g.player.spin=0;g.cooldown=0;assert.equal(g.act(),'PICKUP');}
function touch(g,spins=0,airborne=false){g.ball.active=true;g.ball.pickup=false;g.ball.x=g.player.x;g.ball.y=c.GROUND_Y-40;g.player.spin=0;g.player.y=airborne?c.GROUND_Y-10:c.GROUND_Y;g.pendingSpins=spins;g.cooldown=0;g.regions=()=>[{name:'FOOT',x:g.ball.x,y:g.ball.y,r:100}];assert.equal(g.act(),'FOOT');}
test('rescue protects both gauges through pickup and neutral first scored touch',()=>{
 const g=setup();drop(g);assert.equal(g.scProtectedDropUsed,true);pickup(g);
 assert.equal(g.scIgnoreNextContact,true);assert.equal(g.spinStreak,3);assert.equal(g.airStreak,2);
 touch(g);assert.equal(g.spinStreak,3);assert.equal(g.airStreak,2);assert.equal(g.scIgnoreNextContact,false);
 touch(g);assert.equal(g.spinStreak,0);assert.equal(g.airStreak,0);
});
test('second touch after rescue resumes ordinary skill streaks',()=>{
 const g=setup();drop(g);pickup(g);touch(g);touch(g,1,true);
 assert.equal(g.spinStreak,4);assert.equal(g.airStreak,3);
});
test('next drop after rescue clears all streaks and exemption',()=>{
 const g=setup();drop(g);pickup(g);drop(g);
 assert.equal(g.spinStreak,0);assert.equal(g.airStreak,0);assert.equal(g.scIgnoreNextContact,false);
});
