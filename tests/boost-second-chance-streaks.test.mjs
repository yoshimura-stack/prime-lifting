import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/engine.js',import.meta.url),'utf8');
const context=vm.createContext({});vm.runInContext(source,context);
function game(protect){
 const c={WORLD_WIDTH:1000,GROUND_Y:600,BALL_RADIUS:12,SC_PROTECT_FIRST_DROP:protect,COUNTDOWN_SECONDS:0,GAME_DURATION:60,FIELD_MARGIN:0,RESPAWN_DELAY:1,FIXED_STEP:1/60,PLAYER_SPEED:0,SPIN_MOVE_FACTOR:1,GRAVITY:0,BALL_GRAVITY:100,MAX_SPIN_BONUSES:4};
 const g=new context.LiftingGame(c);g.phase='playing';return g;
}
function drop(g){g.ball.pickup=false;g.ball.active=true;g.ball.y=g.c.GROUND_Y-g.c.BALL_RADIUS-1;g.ball.vy=100;g.update(1/60,0);}
test('first SECOND CHANCE drop preserves all three earned streaks',()=>{
 const g=game(true);g.combo=6;g.spinStreak=3;g.airStreak=2;drop(g);
 assert.equal(g.scProtectedDropUsed,true);assert.equal(g.combo,6);assert.equal(g.spinStreak,3);assert.equal(g.airStreak,2);
});
test('second drop resets all three streaks',()=>{
 const g=game(true);g.combo=6;g.spinStreak=3;g.airStreak=2;drop(g);
 g.ball.active=true;g.ball.pickup=false;g.ball.y=g.c.GROUND_Y-g.c.BALL_RADIUS-1;g.ball.vy=100;g.update(1/60,0);
 assert.equal(g.combo,0);assert.equal(g.spinStreak,0);assert.equal(g.airStreak,0);
});
test('normal first drop resets all streaks',()=>{
 const g=game(false);g.combo=6;g.spinStreak=3;g.airStreak=2;drop(g);
 assert.equal(g.combo,0);assert.equal(g.spinStreak,0);assert.equal(g.airStreak,0);
});
