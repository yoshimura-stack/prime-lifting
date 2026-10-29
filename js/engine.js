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
  this.scProtectedDropUsed=false;
  this.scPreserveNextPickup=false;
  this.scIgnoreNextContact=false;
  this.hits=0;
  this.pendingSpins=0;
  this.eligibleSpin=false;
  this.spinStreak=0;
  this.airStreak=0;
  this.lastTouchAt=null;
  this.respawn=0;
  this.respawnSide=1;
  this.respawnMode='throw';
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
  // Every round starts with a grounded ball. A deliberate foot pickup
  // starts juggling; the pickup itself never awards score or combo.
  this.ball={
   x:clamp(this.player.x+34,this.c.BALL_RADIUS,this.c.WORLD_WIDTH-this.c.BALL_RADIUS),
   y:this.c.GROUND_Y-this.c.BALL_RADIUS,
   vx:0,vy:0,rotation:0,active:true,pickup:true
  };
  this.trail=[];
  this.lastTouchAt=null;
 }
 respawnAtFeet(){
  const c=this.c;
  this.ball={x:clamp(this.player.x+34,c.BALL_RADIUS,c.WORLD_WIDTH-c.BALL_RADIUS),y:c.GROUND_Y-c.BALL_RADIUS,vx:0,vy:0,rotation:0,active:true,pickup:true};
  this.respawn=0;
  this.trail=[];
  this.lastTouchAt=null;
 }
 throwIn(){
  const c=this.c,side=this.respawnSide;
  this.ball={
   x:side<0?c.BALL_RADIUS+2:c.WORLD_WIDTH-c.BALL_RADIUS-2,
   y:c.GROUND_Y-c.BALL_RADIUS-110,
   vx:-side*170,vy:-130,rotation:0,active:true,pickup:true
  };
  this.trail=[];
  this.lastTouchAt=null;
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
  // A loose ball can be scooped up while rolling or bouncing. This is
  // intentionally separate from scored airborne FOOT/KNEE contacts.
  if(b.active&&b.pickup&&p.spin<=0&&
     Math.abs(b.x-p.x)<=65&&b.y>=this.c.GROUND_Y-85){
   b.pickup=false;
   this.lastTouchAt=this.elapsed;
   this.pendingSpins=0;
   this.eligibleSpin=false;
   // Preserve earned SPIN/AIR streaks through SECOND CHANCE pickup.
   if(!this.scPreserveNextPickup){this.spinStreak=0;this.airStreak=0;}
   if(this.scPreserveNextPickup)this.scIgnoreNextContact=true;
   this.scPreserveNextPickup=false;
   p.spinEligible=false;
   b.vy=-this.c.ACTIONS.FOOT.verticalVelocity;
   b.vx=clamp((b.x-p.x)*1.8+p.vx*.08,-this.c.BALL_MAX_HORIZONTAL_SPEED,this.c.BALL_MAX_HORIZONTAL_SPEED);
   this.action='FOOT';this.actionSide=b.x>=p.x?'LEFT':'RIGHT';
   this.emit('pickup',{x:b.x,y:b.y});
   return 'PICKUP';
  }
  let hit=null;

  if(b.active&&!b.pickup&&p.spin<=0){
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
  // First scored contact after a rescued pickup does not alter streaks.
  const protectedFirstContact=this.scIgnoreNextContact;
  // Hidden rising chain: a rapid touch while the ball is still climbing
  // preserves existing skill streaks if that touch lacks the skill.
  const risingChain=this.lastTouchAt!==null&&b.vy<0&&
   this.elapsed-this.lastTouchAt<=0.35;
  if(protectedFirstContact)this.scIgnoreNextContact=false;
  if(!protectedFirstContact){
   if(spinCount>0)this.spinStreak++;else if(!risingChain)this.spinStreak=0;
   if(airborne)this.airStreak++;else if(!risingChain)this.airStreak=0;
  }
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
  this.lastTouchAt=this.elapsed;
  this.pendingSpins=0;
  this.eligibleSpin=true;
  // The first scored touch after a SECOND CHANCE pickup does not advance the combo gauge.
  if(!protectedFirstContact)this.combo++;
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
   risingFlash:!protectedFirstContact&&risingChain&&(hit.name==='FOOT'||hit.name==='HEADER'||hit.name==='JUMP_HEADER')&&((spinCount===0&&this.spinStreak>0)||(!airborne&&this.airStreak>0)),
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
   // Resting loose balls stay on the turf; only airborne balls fall.
   // Horizontal roll decelerates deterministically for browser/server replay.
   const resting=b.pickup&&b.y>=c.GROUND_Y-c.BALL_RADIUS&&b.vy===0;
   if(!resting)b.vy+=c.BALL_GRAVITY*dt;
   b.x+=b.vx*dt;
   if(!resting)b.y+=b.vy*dt;
   b.rotation+=b.vx*dt/c.BALL_RADIUS;

   this.trail.push({x:b.x,y:b.y});
   if(this.trail.length>85)this.trail.shift();

   // During a throw-in the ball bounces inward, loses energy, and
   // settles on the grass until the player kicks it up.
   if(b.pickup&&b.y+c.BALL_RADIUS>=c.GROUND_Y){
    b.y=c.GROUND_Y-c.BALL_RADIUS;
    if(b.vy>65){b.vy=-b.vy*.48;b.vx*=.75;}
    else {b.vy=0;b.vx*=Math.max(0,1-4*dt);if(Math.abs(b.vx)<3)b.vx=0;}
   }
   if(b.pickup&&b.y>=c.GROUND_Y-c.BALL_RADIUS&&b.vy===0){
    b.vx*=Math.max(0,1-3*dt);
    if(Math.abs(b.vx)<3)b.vx=0;
   }
   if(
    (!b.pickup&&b.y+c.BALL_RADIUS>=c.GROUND_Y)||
    b.x<-c.BALL_RADIUS||
    b.x>c.WORLD_WIDTH+c.BALL_RADIUS
   ){
    const outLeft=b.x<-c.BALL_RADIUS,outRight=b.x>c.WORLD_WIDTH+c.BALL_RADIUS;
     this.respawnMode=outLeft||outRight?'throw':'feet';
     this.respawnSide=outLeft?-1:outRight?1:this.respawnSide;
    b.y=Math.min(b.y,c.GROUND_Y-c.BALL_RADIUS);
    b.active=false;
    // First drop protects KEEP UPS, SPIN and AIR streaks; later drops reset normally.
    const rescued=c.SC_PROTECT_FIRST_DROP===true&&!this.scProtectedDropUsed;
    if(rescued){
     this.scProtectedDropUsed=true;
     this.scPreserveNextPickup=true;
     this.scIgnoreNextContact=false;
    }else{
     this.scPreserveNextPickup=false;
     this.scIgnoreNextContact=false;
     this.combo=0;
     this.spinStreak=0;
     this.airStreak=0;
    }
    this.pendingSpins=0;
    this.eligibleSpin=false;
    this.lastTouchAt=null;
    p.spinEligible=false;
    this.drops++;
    this.respawn=c.RESPAWN_DELAY;
    this.emit('drop');
   }
  }else{
   this.respawn-=dt;
   if(this.respawn<=0){if(this.respawnMode==='throw')this.throwIn();else this.respawnAtFeet();}
  }

  if(this.remaining<=0){
   this.phase='ended';
   this.emit('end');
  }
 }
}

root.LiftingGame=LiftingGame;

})(globalThis);
