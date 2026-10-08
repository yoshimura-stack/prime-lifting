const assert=require('node:assert/strict');
require('../js/config.js');require('../js/engine.js');
const fresh=()=>{const g=new LiftingGame(structuredClone(PRIME_DEFAULTS));g.phase='playing';return g};
const place=(g,name)=>{const r=g.regions().find(x=>x.name===name);Object.assign(g.ball,{x:r.x,y:r.y,vx:0,vy:80});g.cooldown=0};
for(const [count,expected] of [[0,0],[1,100],[2,200],[3,300],[4,1000],[5,1100],[6,1200]]){
 const g=fresh();g.pendingSpins=count;place(g,'FOOT');g.act();const e=g.events.find(e=>e.type==='hit');assert.equal(e.rotationBonus,expected);assert.equal(e.quadSpin,count>=4);assert.equal(g.score,100+expected);console.log('PASS '+count+' rotations -> '+expected);
}
{
 const g=fresh();g.pendingSpins=1;place(g,'FOOT');g.act();g.pendingSpins=1;place(g,'KNEE');g.act();assert.equal(g.score,100+100+150+200);assert.equal(g.spinStreak,2);console.log('PASS spin streak additional +100 on second consecutive hit');
}
{
 const g=fresh();g.player.y-=45;g.pendingSpins=4;place(g,'JUMP_HEADER');g.act();const e=g.events.find(e=>e.type==='hit');assert.equal(e.airBonus,150);assert.equal(e.rotationBonus,1000);assert.equal(g.score,1650);console.log('PASS simultaneous jump header AIR + QUAD SPIN');
}
{
 const g=fresh();g.pendingSpins=4;g.eligibleSpin=true;g.ball.y=519;g.ball.vy=100;g.update(.02,0);assert.equal(g.pendingSpins,0);console.log('PASS drop clears rotations');
}
