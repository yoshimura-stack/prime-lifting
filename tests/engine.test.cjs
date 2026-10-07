const assert=require('node:assert/strict');
require('../js/config.js');require('../js/engine.js');
const fresh=()=>{const g=new LiftingGame(structuredClone(PRIME_DEFAULTS));g.phase='playing';return g;};
const step=(g,t,d=0)=>{for(let s=0;s<t;s+=1/120)g.update(1/120,d);};
const place=(g,name)=>{const r=g.regions().find(r=>r.name===name);Object.assign(g.ball,{x:r.x,y:r.y,vx:23,vy:90});g.cooldown=0;};
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('all four grounded body regions produce their own action',()=>{for(const name of ['FOOT','KNEE','CHEST','HEADER']){const g=fresh();place(g,name);assert.equal(g.act(),name);assert.equal(g.score,g.c.ACTIONS[name].score);}});
test('jump never touches ball without explicit ball action',()=>{const g=fresh();place(g,'HEADER');const before={...g.ball};g.jump();assert.deepEqual(g.ball,before);step(g,.1);assert.equal(g.score,0);assert.equal(g.hits,0);});
test('airborne header requires valid contact and explicit action',()=>{const g=fresh();g.jump();step(g,.12);place(g,'JUMP_HEADER');assert.equal(g.act(),'JUMP_HEADER');assert.equal(g.score,500);});
test('miss leaves trajectory and player position unchanged',()=>{const g=fresh();g.ball.x=900;const ball={...g.ball},x=g.player.x;assert.equal(g.act(),null);assert.deepEqual(g.ball,ball);assert.equal(g.player.x,x);});
test('no automatic lifting at a body region',()=>{const g=fresh();place(g,'CHEST');step(g,.1);assert.equal(g.hits,0);assert.equal(g.score,0);assert.ok(g.ball.vy>0);});
test('spin itself scores zero and locks ball action',()=>{const g=fresh();place(g,'FOOT');g.act();g.spin();step(g,.25);place(g,'CHEST');const ball={...g.ball};assert.equal(g.act(),null);assert.deepEqual(g.ball,ball);assert.equal(g.score,100);});
test('spin bonus is deferred until next successful contact',()=>{const g=fresh();place(g,'FOOT');g.act();g.spin();step(g,.55);assert.equal(g.score,100);assert.equal(g.pendingSpins,1);place(g,'KNEE');g.act();assert.equal(g.score,550);assert.equal(g.pendingSpins,0);});
test('spinning before first contact cannot bank a bonus',()=>{const g=fresh();g.spin();step(g,.55);assert.equal(g.pendingSpins,0);});
test('drop clears pending bonus and respawns without score',()=>{const g=fresh();g.pendingSpins=2;g.eligibleSpin=true;g.ball.y=519;g.ball.vy=100;step(g,.02);assert.equal(g.pendingSpins,0);assert.equal(g.eligibleSpin,false);step(g,1);assert.equal(g.ball.active,true);assert.equal(g.score,0);assert.equal(g.drops,1);});
test('60 second game stops simulation and scoring at time up',()=>{const g=fresh();step(g,60.1);assert.equal(g.phase,'ended');assert.equal(g.remaining,0);const snapshot=JSON.stringify(g.ball);step(g,1);assert.equal(JSON.stringify(g.ball),snapshot);assert.equal(g.act(),null);});
test('countdown does not consume game time',()=>{const g=fresh();g.reset();step(g,2.9);assert.equal(g.phase,'countdown');assert.equal(g.remaining,60);step(g,.12);assert.equal(g.phase,'playing');});
test('continuous movement and timed inputs can connect FOOT KNEE SPIN CHEST SPIN FOOT JUMP HEADER',()=>{
 const g=fresh(),sequence=['FOOT','KNEE','CHEST','FOOT','JUMP_HEADER'];let index=0,jumped=false,spins=0;
 for(let n=0;n<120*15&&index<sequence.length;n++){
  const name=sequence[index],a=g.c.ACTIONS[name],p=g.player,b=g.ball;
  const desiredX=b.x-a.offsetX*p.facing,error=desiredX-p.x;
  const dir=Math.abs(error)<5?0:(error-p.vx*.12>0?1:-1);
  if(name==='JUMP_HEADER'&&!jumped&&b.vy>0&&b.y>270){g.jump();jumped=true;}
  const r=g.regions().find(r=>r.name===name);
  if(r&&b.vy>0&&Math.hypot(b.x-r.x,b.y-r.y)<r.r*.7&&g.cooldown===0&&p.spin===0){
   assert.equal(g.act(),name);index++;
   if(index===2||index===3){g.spin();spins++;}
  }
  g.update(1/120,dir);
 }
 assert.equal(index,sequence.length,'full sequence must be possible without teleporting player or ball');assert.equal(g.drops,0);assert.equal(spins,2);assert.equal(g.score,1650);
});
test('both anatomical feet and knees are independent of facing',()=>{
 for(const name of ['FOOT','KNEE'])for(const side of ['LEFT','RIGHT'])for(const facing of [-1,1]){
  const g=fresh();g.player.facing=facing;const r=g.regions().find(r=>r.name===name&&r.side===side);
  Object.assign(g.ball,{x:r.x,y:r.y});assert.equal(g.act(),name);assert.equal(g.actionSide,side);
  assert.equal(g.events.at(-1).side,side);assert.equal(g.score,g.c.ACTIONS[name].score);
 }
});
test('out of reach on either side still misses without moving the ball',()=>{
 for(const side of [-1,1]){const g=fresh();g.ball.x=g.player.x+side*80;g.ball.y=g.player.y-g.c.ACTIONS.FOOT.height;const before={...g.ball};g.act();assert.deepEqual(g.ball,before);assert.equal(g.score,0);}
});
test('side changes across consecutive kicks and clears on restart',()=>{
 const g=fresh();for(const side of ['LEFT','RIGHT']){const r=g.regions().find(r=>r.name==='FOOT'&&r.side===side);g.cooldown=0;Object.assign(g.ball,{x:r.x,y:r.y});g.act();assert.equal(g.actionSide,side);}g.reset();assert.equal(g.actionSide,null);
});
test('two completed 0.30 second spins fit one flight and score only on the next hit',()=>{
 const g=fresh();let hits=0,spins=0,firstHitScore=0;
 for(let n=0;n<120*10&&hits<2;n++){
  const p=g.player,b=g.ball,a=g.c.ACTIONS.FOOT,error=b.x-a.offsetX-p.x;
  const dir=Math.abs(error)<4?0:(error-p.vx*.12>0?1:-1);
  if(hits===1&&spins<2&&p.spin===0){assert.equal(g.score,firstHitScore);assert.ok(g.spin());spins++;}
  const r=g.regions().find(r=>r.name==='FOOT'&&r.side==='LEFT');
  if(b.vy>0&&Math.hypot(b.x-r.x,b.y-r.y)<r.r*.65&&p.spin===0&&g.cooldown===0){
   if(hits===1){assert.equal(g.pendingSpins,2);assert.equal(g.score,firstHitScore);}
   assert.equal(g.act(),'FOOT');hits++;if(hits===1)firstHitScore=g.score;
  }
  g.update(1/120,dir);
 }
 assert.equal(g.c.SPIN_DURATION,.30);assert.equal(hits,2);assert.equal(spins,2);assert.equal(g.drops,0);assert.equal(g.score,800);
});
test('contact position sends every action left, straight or right',()=>{
 for(const name of ['FOOT','KNEE','CHEST','HEADER','JUMP_HEADER']){
  const velocities=[];
  for(const fraction of [-.4,0,.4]){const g=fresh();if(name==='JUMP_HEADER'){g.player.y-=50;}const r=g.regions().find(r=>r.name===name);Object.assign(g.ball,{x:r.x+fraction*r.r,y:r.y,vx:0,vy:100});const x=g.ball.x;assert.equal(g.act(),name);velocities.push([g.ball.vx,g.ball.vy]);step(g,.5);if(fraction)assert.ok((g.ball.x-x)*Math.sign(fraction)>20);else assert.equal(g.ball.x,x);}
  assert.ok(velocities[0][0]<0);assert.equal(velocities[1][0],0);assert.ok(velocities[2][0]>0);assert.ok(velocities[0][1]>velocities[1][1]);assert.ok(Math.abs(velocities[0][0]+velocities[2][0])<1e-9);
 }
});
test('horizontal launch tuning changes displacement without moving player or ball on contact',()=>{
 const speeds=[];for(const influence of [0,3,6]){const g=fresh();g.c.ACTIONS.FOOT.horizontalInfluence=influence;place(g,'FOOT');g.ball.x+=10;const x=g.ball.x,px=g.player.x;g.act();assert.equal(g.ball.x,x);assert.equal(g.player.x,px);speeds.push(g.ball.vx);}assert.deepEqual(speeds,[0,30,60]);
});
console.log(`${checks} checks passed.`);

