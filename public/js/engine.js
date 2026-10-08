(function(root){
'use strict';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const approach=(v,target,amount)=>v<target?Math.min(v+amount,target):Math.max(v-amount,target);

class LiftingGame{
 constructor(config){
  this.c=config;
  this.events=[];
  this.reset();
  this.phase='ready';
 }

 reset(){
  const c=this.c;
  this.phase='countdown';
  this.countdown=c.COUNTDOWN_SECONDS;
  this.remaining=c.GAME_DURATION;
  this.score=0;
  this.combo=0;
  this.bestCombo=0;
  this.drops=0;
  this.hits=0;
  this.pendingSpins=0;
  this.eligibleSpin=false;
  this.spinStreak=0;
  this.airStreak=0;
  this.respawn=0;
  this.elapsed=0;
  this.cooldown=0;
  this.action='IDLE';
  this.actionSide=null;
  this.actionTime=0;
  this.events=[];
  this.player={
   x:c.WORLD_WIDTH/2,
   y:c.GROUND_Y,
   vx:0,
   vy:0,
   facing:1,
   spin:0,
   spinEligible:false
  };
  this.spawn();
 }

 spawn(){
  this.ball={
   x:this.c.WORLD_WIDTH/2,
   y:this.c.GROUND_Y-this.c.BALL_SPAWN_HEIGHT,
   vx:this.c.BALL_SPAWN_VX,
   vy:0,
   rotation:0,
   active:true
  };
  this.trail=[];
 }

 emit(type,data={}){
  this.events.push({type,...data});
 }

 // LEFT/RIGHT are the player's anatomical sides: front-facing LEFT is screen-right.
 regions(){
  const p=this.player,result=[];
  for(const name of ['FOOT','KNEE','SHOULDER','CHEST',p.y<this.c.GROUND_Y-0.5?'JUMP_HEADER':'HEADER']){
   const a=this.c.ACTIONS[name];
   for(const side of name==='FOOT'||name==='KNEE'||name==='SHOULDER'?['LEFT','RIGHT']:[null])
    result.push({
     name,
     side,
     x:p.x+(side==='LEFT'?a.offsetX:side==='RIGHT'?-a.offsetX:0),
     y:p.y-a.height,
     r:a.contactRadius
    });
  }
  return result;
 }

 jump(){
  if(this.phase!=='playing'||this.player.y<this.c.GROUND_Y-0.5||this.player.spin>0)return false;
  this.player.vy=-this.c.PLAYER_JUMP_POWER;
  this.action='JUMP';
  this.actionSide=null;
  this.actionTime=this.c.ACTION_DURATION;
  return true;
 }

 spin(){
  if(this.phase!=='playing'||this.player.spin>0||!this.ball.active)return false;
  this.player.spin=this.c.SPIN_DURATION;
  this.player.spinEligible=this.eligibleSpin;
  this.action='SPIN';
  this.actionSide=null;
  this.emit('spin');
  return true;
 }

 act(){
  if(this.phase!=='playing'||this.cooldown>0)return null;
  this.cooldown=this.c.ACTION_COOLDOWN;
  this.actionTime=this.c.ACTION_DURATION;

  const p=this.player,b=this.ball;
  let hit=null;

  if(b.active&&p.spin<=0){
   for(const region of this.regions()){
    const distance=Math.hypot(b.x-region.x,b.y-region.y);
    if(distance<=region.r&&(!hit||distance/region.r<hit.ratio))
     hit={...region,ratio:distance/region.r};
   }
  }

  if(!hit){
   this.action='MISS';
   this.actionSide=b.x>=p.x?'LEFT':'RIGHT';
   this.emit('miss');
   return null;
  }

  const a=this.c.ACTIONS[hit.name];
  const spinCount=this.pendingSpins;
  const airborne=p.y<this.c.GROUND_Y-0.5;

  // Skill streaks reward players who keep adding a spin or an airborne touch
  // on every successful contact. Missing the condition on the next touch resets
  // that streak, while dropping the ball resets both.
  if(spinCount>0)this.spinStreak++;else this.spinStreak=0;
  if(airborne)this.airStreak++;else this.airStreak=0;
  const spinLevel=Math.min(this.spinStreak,this.c.MAX_STREAK_LEVEL);
  const airLevel=Math.min(this.airStreak,this.c.MAX_STREAK_LEVEL);
  // Rotation score: 100 per completed spin, plus a 600-point QUAD milestone.
  // The consecutive successful-touch streak remains a separate bonus.
  const quadSpin=spinCount>=4;
  const rotationBonus=spinCount*this.c.SPIN_BONUS+(quadSpin?600:0);
  const spinStreakBonus=spinCount>0?(spinLevel-1)*this.c.SPIN_BONUS:0;
  const spinBonus=rotationBonus+spinStreakBonus;
  const airBonus=airborne?airLevel*this.c.AIR_STREAK_BONUS:0;
  const bonus=spinBonus+airBonus;

  // Signed contact offset controls direction; edge contacts trade some height for width.
  const contactOffset=b.x-hit.x,edge=Math.min(1,Math.abs(contactOffset)/hit.r);

  b.vy=-a.verticalVelocity*(1-this.c.CONTACT_EDGE_LIFT_LOSS*edge*edge);
  b.vx=clamp(
   contactOffset*a.horizontalInfluence+p.vx*a.moveInfluence,
   -this.c.BALL_MAX_HORIZONTAL_SPEED,
   this.c.BALL_MAX_HORIZONTAL_SPEED
  );

  this.score+=a.score+bonus;
  this.pendingSpins=0;
  this.eligibleSpin=true;
  this.combo++;
  this.hits++;
  this.bestCombo=Math.max(this.combo,this.bestCombo);
  this.action=hit.name;
  this.actionSide=hit.side;

  if(hit.name==='KNEE')
   this.actionTime=this.c.KNEE_ANIMATION.duration;

  this.emit('hit',{
   name:hit.name,
   side:hit.side,
   points:a.score,
   bonus,
   spinBonus,
   spinCount,
   quadSpin,
   rotationBonus,
   spinStreakBonus,
   airBonus,
   spinStreak:this.spinStreak,
   airStreak:this.airStreak,
   airborne,
   x:b.x,
   y:b.y,
   quality:hit.ratio<0.4?'PERFECT':'GOOD'
  });

  return hit.name;
 }

 update(dt,direction=0){
  const c=this.c,p=this.player,b=this.ball;

  if(this.phase==='countdown'){
   this.countdown-=dt;
   if(this.countdown<=0){
    this.phase='playing';
    this.emit('start');
   }
   return;
  }

  if(this.phase!=='playing')return;

  dt=Math.min(dt,this.remaining);
  this.remaining=Math.max(0,this.remaining-dt);
  this.elapsed+=dt;
  this.cooldown=Math.max(0,this.cooldown-dt);
  this.actionTime=Math.max(0,this.actionTime-dt);

  const spinning=p.spin>0;

  if(spinning){
   p.spin=Math.max(0,p.spin-dt);
   if(p.spin===0&&p.spinEligible&&b.active){
    this.pendingSpins=Math.min(c.MAX_SPIN_BONUSES,this.pendingSpins+1);
    this.emit('spin-ready');
   }
  }

  // FPS-like horizontal movement:
  // A/D input changes direction immediately with no acceleration inertia.
  const speed=c.PLAYER_SPEED*(spinning?c.SPIN_MOVE_FACTOR:1);
  p.vx=direction*speed;
  p.x=clamp(
   p.x+p.vx*dt,
   c.FIELD_MARGIN,
   c.WORLD_WIDTH-c.FIELD_MARGIN
  );

  if(direction)p.facing=direction;

  if(p.y<c.GROUND_Y||p.vy<0){
   p.vy+=c.GRAVITY*dt;
   p.y+=p.vy*dt;

   if(p.y>=c.GROUND_Y){
    p.y=c.GROUND_Y;
    p.vy=0;
    this.action='LAND';
    this.actionSide=null;
    this.actionTime=c.LAND_DURATION;
   }
  }

  if(this.actionTime===0&&!spinning)
   this.action=p.y<c.GROUND_Y?'JUMP':direction?(direction<0?'MOVE LEFT':'MOVE RIGHT'):'IDLE';

  if(b.active){
   b.vy+=c.BALL_GRAVITY*dt;
   b.x+=b.vx*dt;
   b.y+=b.vy*dt;
   b.rotation+=b.vx*dt/c.BALL_RADIUS;

   this.trail.push({x:b.x,y:b.y});
   if(this.trail.length>85)this.trail.shift();

   if(
    b.y+c.BALL_RADIUS>=c.GROUND_Y||
    b.x<-c.BALL_RADIUS||
    b.x>c.WORLD_WIDTH+c.BALL_RADIUS
   ){
    b.y=Math.min(b.y,c.GROUND_Y-c.BALL_RADIUS);
    b.active=false;
    this.combo=0;
    this.pendingSpins=0;
    this.eligibleSpin=false;
    this.spinStreak=0;
    this.airStreak=0;
    p.spinEligible=false;
    this.drops++;
    this.respawn=c.RESPAWN_DELAY;
    this.emit('drop');
   }
  }else{
   this.respawn-=dt;
   if(this.respawn<=0)this.spawn();
  }

  if(this.remaining<=0){
   this.phase='ended';
   this.emit('end');
  }
 }
}

root.LiftingGame=LiftingGame;

})(globalThis);
