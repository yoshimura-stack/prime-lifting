/* Independent deterministic pinball simulation. No lifting, storage or network dependencies. */
(function(root){
'use strict';
const STEP=1/240,R=9,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const outline=[[48,710],[48,160],[64,92],[114,44],[205,25],[430,25],[510,55],[552,120],[552,920]];
const walls=outline.slice(1).map((p,i)=>[...outline[i],...p]);
walls.push([518,190,518,920],[48,710,100,770],[100,770,175,805],
 [500,710,460,770],[460,770,425,805]);
const slings=[[104,615,165,735],[165,735,104,709],[104,709,104,615],
 [456,615,395,735],[395,735,456,709],[456,709,456,615]];
const bumpers=[{x:215,y:245,r:32},{x:355,y:245,r:32},{x:285,y:350,r:37}];
const targets=[{x:174,y:474,r:16},{x:284,y:484,r:16},{x:394,y:474,r:16}];
function closest(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return {x:ax+t*dx,y:ay+t*dy};}
class Pinball{
 constructor(){this.reset();}
 reset(){this.score=0;this.balls=3;this.time=0;this.phase='ready';this.events=[];this.lit=0;this.cooldowns={};this.stuck=0;this.saver=0;this.goalArmed=false;this.goals=0;this.powerPlay=0;this.skillAvailable=true;this.skillWindow=0;this.lastInput=[false,false];this.stats={bumperHits:0,sets:0,skillShots:0,flipperHits:0};
  this.flippers=[{x:183,y:815,a:.34,rest:.34,up:-.52,omega:0},{x:417,y:815,a:Math.PI-.34,rest:Math.PI-.34,up:Math.PI+.52,omega:0}];this.serve();}
 serve(){this.phase=this.balls>0?'ready':'over';this.ball={x:535,y:870,vx:0,vy:0};this.stuck=0;}
 launch(power=1){if(this.phase!=='ready')return false;this.phase='playing';this.ball.vx=-25;this.ball.vy=-1180-clamp(power,0,1)*420;this.saver=4;this.skillWindow=this.skillAvailable?3.2:0;this.events.push({type:'launch',x:535,y:870});return true;}
 hit(key,points,x,y){if((this.cooldowns[key]||0)>this.time)return;this.cooldowns[key]=this.time+.16;this.score+=points;this.events.push({type:'hit',key,points,x,y});}
 segment(ax,ay,bx,by,radius=0,restitution=.8,flipper=null){
  const b=this.ball,c=closest(b.x,b.y,ax,ay,bx,by),dx=b.x-c.x,dy=b.y-c.y,dist=Math.hypot(dx,dy),limit=R+radius;if(dist>=limit)return false;
  const nx=dist>1e-6?dx/dist:0,ny=dist>1e-6?dy/dist:-1;
  b.x+=nx*(limit-dist+.02);b.y+=ny*(limit-dist+.02);
  const sx=flipper?-flipper.omega*(c.y-flipper.y):0,sy=flipper?flipper.omega*(c.x-flipper.x):0;
  const vn=(b.vx-sx)*nx+(b.vy-sy)*ny;
  if(vn<0){b.vx-=(1+restitution)*vn*nx;b.vy-=(1+restitution)*vn*ny;
   if(flipper&&Math.abs(flipper.omega)>1&&vn< -80){this.stats.flipperHits++;this.events.push({type:'strike',force:Math.min(1,-vn/900),x:c.x,y:c.y});}
   else if(vn< -140&&(this.cooldowns.impact||0)<this.time){this.cooldowns.impact=this.time+.06;this.events.push({type:'impact',force:Math.min(1,-vn/1100),x:c.x,y:c.y});}
  }
  return vn<0;
 }
 circle(o,k,points,kick){
  const b=this.ball,dx=b.x-o.x,dy=b.y-o.y,d=Math.hypot(dx,dy),limit=R+o.r;if(d>=limit)return false;
  const nx=d?dx/d:0,ny=d?dy/d:-1;b.x=o.x+nx*(limit+.02);b.y=o.y+ny*(limit+.02);
  const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=1.7*vn*nx;b.vy-=1.7*vn*ny;}
  if((this.cooldowns[k]||0)<=this.time){b.vx+=nx*kick;b.vy+=ny*kick;this.hit(k,points,o.x,o.y);return true;}return false;
 }
 step(left=false,right=false){
  this.events.length=0;
  if(this.phase==='over')return;
  this.time+=STEP;
  for(let i=0;i<2;i++){const pressed=i?right:left;if(pressed&&!this.lastInput[i])this.events.push({type:'flipper',side:i});this.lastInput[i]=pressed;const f=this.flippers[i],goal=pressed?f.up:f.rest,old=f.a;f.a+=clamp(goal-f.a,-14*STEP,14*STEP);f.omega=(f.a-old)/STEP;}
  if(this.phase!=='playing')return;
  const b=this.ball,previousY=b.y;this.powerPlay=Math.max(0,this.powerPlay-STEP);this.skillWindow=Math.max(0,this.skillWindow-STEP);this.saver=Math.max(0,this.saver-STEP);b.vy+=720*STEP;
  b.vx*=.99997;b.vy*=.99997;b.x+=b.vx*STEP;b.y+=b.vy*STEP;
  for(const w of walls)this.segment(...w);
  for(let i=0;i<slings.length;i++){const w=slings[i];if(this.segment(...w,3,.94)&&this.time>(this.cooldowns['s'+i]||0)){
    b.vx+=(i<3?1:-1)*125;b.vy-=190;this.hit('s'+i,50,b.x,b.y);
  }}
  bumpers.forEach((o,i)=>{if(this.circle(o,'b'+i,this.powerPlay>0?300:100,210))this.stats.bumperHits++;});
  targets.forEach((o,i)=>{if(this.circle(o,'t'+i,this.powerPlay>0?600:200,90)){this.lit|=1<<i;if(this.lit===7){this.score+=1000;this.lit=0;this.goalArmed=true;this.stats.sets++;this.events.push({type:'combo',points:1000,x:285,y:450});}}});
  // First descent through the marked upper-left lane rewards a controlled launch.
  if(this.skillAvailable&&this.skillWindow>0&&previousY<180&&b.y>=180&&b.x>86&&b.x<164){
   this.skillAvailable=false;this.skillWindow=0;this.stats.skillShots++;this.score+=1000;this.events.push({type:'skill',points:1000,x:125,y:180});
  }
  // The goal is a sensor plane, not a teleport or a trajectory change.
  if(this.goalArmed&&previousY>185&&b.y<=185&&b.x>218&&b.x<352){
   this.goalArmed=false;this.goals++;const points=2000+Math.min(this.goals-1,6)*500;this.score+=points;this.powerPlay=15;
   this.events.push({type:'goal',points,x:285,y:180});
  }
  for(const f of this.flippers)this.segment(f.x,f.y,f.x+Math.cos(f.a)*100,f.y+Math.sin(f.a)*100,12,.84,f);
  const speed=Math.hypot(b.vx,b.vy);if(speed>1800){b.vx*=1800/speed;b.vy*=1800/speed;}
  if(b.y>960){
   if(this.saver>0){this.serve();this.events.push({type:'save',x:300,y:800});}
   else{this.balls--;this.skillAvailable=true;this.powerPlay=0;this.serve();this.events.push({type:this.balls?'drain':'over',x:300,y:840});}
  }else if(b.y<0||b.x<0||b.x>600){this.serve();this.events.push({type:'rescue',x:300,y:450});}
  // Rare near-static traps get a deterministic unstick, without awarding points.
  this.stuck=speed<25?this.stuck+STEP:0;
  if(this.stuck>2){b.vx=b.x<300?130:-130;b.vy=-320;this.stuck=0;this.events.push({type:'rescue',x:b.x,y:b.y});}
 }
}
Pinball.STEP=STEP;Pinball.R=R;Pinball.walls=walls;Pinball.slings=slings;Pinball.bumpers=bumpers;Pinball.targets=targets;
if(typeof module!=='undefined'&&module.exports)module.exports=Pinball;else root.PrimePinball=Pinball;
})(globalThis);
