/* Soccer stadium cabinet renderer. Read-only consumer of the pinball state.
 * Static stadium, turf, rails and fixtures are cached once; no physics lives here. */
(function(root){
'use strict';
class StadiumPinballRenderer {
 constructor(canvas,physics){
  this.canvas=canvas;this.P=physics;this.scale=Math.min(devicePixelRatio||1,2);
  canvas.width=600*this.scale;canvas.height=960*this.scale;
  this.ctx=canvas.getContext('2d');this.ctx.scale(this.scale,this.scale);
  this.cache=document.createElement('canvas');this.cache.width=canvas.width;this.cache.height=canvas.height;
  const live=this.ctx;this.ctx=this.cache.getContext('2d');this.ctx.scale(this.scale,this.scale);this.build();this.ctx=live;
 }
 path(points){const c=this.ctx;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));}
 line(points,color,width=1,glow=0){const c=this.ctx;this.path(points);c.lineWidth=width;c.strokeStyle=color;c.lineCap='round';c.lineJoin='round';c.shadowColor=color;c.shadowBlur=glow;c.stroke();c.shadowBlur=0;}
 poly(points,fill,stroke){const c=this.ctx;this.path(points);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
 rect(x,y,w,h,fill,r=0,stroke){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
 ellipse(x,y,rx,ry,fill,stroke){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}}
 text(s,x,y,size,color,weight='700'){const c=this.ctx;c.font=`${weight} ${size}px Arial`;c.textAlign='center';c.fillStyle=color;c.fillText(s,x,y);}
 gradient(x,y,x2,y2,stops){const g=this.ctx.createLinearGradient(x,y,x2,y2);stops.forEach(([p,v])=>g.addColorStop(p,v));return g;}
 metal(x,y,h){return this.gradient(x,y,x,y+h,[[0,'#d7e8e5'],[.16,'#566e76'],[.48,'#17292e'],[.7,'#637d83'],[1,'#17292e']]);}
 bolt(x,y){this.ellipse(x+1,y+2,3.5,3.5,'#0008');this.ellipse(x,y,3,3,'#a6babc','#2f4147');this.line([[x-1.5,y],[x+1.5,y]],'#263b41',1);}
 rail(points,width=10){this.line(points.map(([x,y])=>[x+5,y+8]),'#0009',width+9);this.line(points,'#0b1216',width+5);this.line(points,'#81969b',width);this.line(points.map(([x,y])=>[x-1,y-2]),'#e8f8ef',2);}
 soccer(x,y,r){const c=this.ctx,g=c.createRadialGradient(x-r*.35,y-r*.45,0,x,y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.65,'#ddeae6');g.addColorStop(1,'#556d72');this.ellipse(x,y,r,r,g,'#182f37');
  const pent=[];for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;pent.push([x+Math.cos(a)*r*.4,y+Math.sin(a)*r*.4]);}this.poly(pent,'#142a31');
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2,px=x+Math.cos(a)*r*.87,py=y+Math.sin(a)*r*.87;this.line([pent[i],[px,py]],'#42595c',Math.max(.5,r*.025));this.poly([[px,py],[x+Math.cos(a-.17)*r*.98,y+Math.sin(a-.17)*r*.98],[x+Math.cos(a+.17)*r*.98,y+Math.sin(a+.17)*r*.98]],'#213a40');}
  this.ellipse(x-r*.32,y-r*.42,r*.15,r*.08,'#ffffffa0');
 }
 build(){const c=this.ctx;
  this.rect(0,0,600,960,'#101c20');
  // Brushed cabinet surround, visible screws, apron and side walls.
  this.rect(4,4,592,952,this.gradient(0,0,600,0,[[0,'#819498'],[.025,'#1d2b31'],[.06,'#49595d'],[.12,'#101b22'],[.88,'#101b22'],[.95,'#65787c'],[.98,'#1c2b31'],[1,'#a2b6b7']]),22,'#9caa9c');
  this.rect(22,12,556,925,'#050d13',14,'#384f54');
  // Pitch is beneath the mechanics. Stripes and deterministic grass flecks are cached.
  this.poly([[49,710],[49,160],[65,92],[114,44],[430,26],[510,56],[551,121],[551,924],[45,924]],'#174a36');
  c.save();this.path([[49,710],[49,160],[65,92],[114,44],[430,26],[510,56],[551,121],[551,924],[45,924]]);c.closePath();c.clip();
  for(let y=130;y<930;y+=84)this.rect(40,y,520,42,'#28634866');
  let seed=121;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<22000;i++){const x=45+random()*510,y=120+random()*820;c.fillStyle=i%3?'#b1d68c14':'#061e1d22';c.fillRect(x,y,.7,1+random()*3);}
  const light=c.createRadialGradient(280,430,20,280,470,560);light.addColorStop(0,'#7ecf7a12');light.addColorStop(.7,'#001c2130');light.addColorStop(1,'#00101ae0');this.rect(0,0,600,960,light);
  this.rect(103,192,363,555,'#0000',0,'#c2e9c04d');this.line([[103,575],[466,575]],'#c2e9c04d',2);this.ellipse(285,575,87,87,'#0000','#c2e9c052');this.ellipse(285,575,3,3,'#d8e7c68a');
  this.rect(185,192,200,97,'#0000',0,'#c2e9c045');this.rect(225,192,120,36,'#0000',0,'#c2e9c045');
  c.restore();
  // Miniature grandstands around the outside of the actual collision rails.
  for(let side=0;side<2;side++){
   const x=side?562:10;this.rect(x,180,27,540,'#152c3c');
   for(let row=0;row<72;row++){const y=185+row*7;this.line([[x,y+5],[x+26,y+5]],'#04111c',2);for(let col=0;col<3;col++){const xx=x+4+col*8;const colors=['#e9e3c3','#58b5ca','#db5b7f','#d7dfe0'];this.ellipse(xx,y,1.7,2.1,colors[(row*7+col*3)%4]);}}
   this.line([[x+3,183],[x+3,720]],'#56ddec',2,5);
  }
  // Stadium end stand, floodlight gantry and recessed electronic score display.
  this.rect(105,22,380,116,this.gradient(0,22,0,138,[[0,'#27404f'],[1,'#060e17']]),12,'#849399');
  for(let row=0;row<4;row++)for(let i=0;i<52;i++){const x=116+i*6.9,y=30+row*7;this.rect(x,y,3,4,['#cfdbd7','#65b2c0','#d8798b'][(row+i)%3]);}
  this.text('PRIME  /  WORLD CUP',297,103,15,'#8ba39a');
  for(const x of [82,486]){this.rail([[x,65],[x+22,122]],4);for(let i=0;i<4;i++){this.rect(x-10+i*7,60,6,10,'#e6fbf4',2);c.shadowColor='#d7faff';c.shadowBlur=18;this.rect(x-9+i*7,61,4,5,'#ffffff',1);c.shadowBlur=0;}}
  // A miniature goal behind the upper field: purely decorative, not a new scoring rule.
  this.poly([[216,147],[359,147],[375,187],[200,187]],'#0009');
  for(let i=0;i<=12;i++){let x=216+i*143/12;this.line([[x,147],[200+i*175/12,187]],'#b8d3cf66',.7);}for(let i=0;i<=4;i++){const t=i/4;this.line([[216-16*t,147+40*t],[359+16*t,147+40*t]],'#b8d3cf77',.7);}
  this.rail([[200,187],[207,145],[368,145],[375,187]],4);this.ellipse(125,180,24,24,'#0000','#c4b98177');this.text('SKILL',125,183,8,'#e5d499');
  // Rails follow collision segments exactly. Their height is a drawing offset only.
  this.P.walls.forEach(w=>this.rail([[w[0],w[1]],[w[2],w[3]]],8));
  this.line([[535,204],[535,894]],'#adc9be25',1);for(let y=875;y<915;y+=5)this.line([[525,y],[545,y+2]],'#a3adb1',2);this.rect(524,917,23,22,this.metal(524,917,22),3,'#c2c9af');
  // Real slingshot surfaces, inset rubber edge and raised plastic cover.
  for(const pts of [[[104,615],[165,735],[104,709]],[[456,615],[395,735],[456,709]]]){
   this.poly(pts.map(([x,y])=>[x+6,y+10]),'#0008');this.poly(pts,this.gradient(0,615,0,740,[[0,'#506879'],[.3,'#142936'],[1,'#071723']]),'#97a5a2');
   this.rail([...pts,pts[0]],7);this.line([pts[0],pts[1]],'#efce76',3,5);
   const x=pts[0][0]+(pts[0][0]<300?14:-14);for(let y=665;y<700;y+=14)this.line([[x-5,y+4],[x,y],[x+5,y+4]],'#74dbe0',2,4);
   for(const [x,y] of pts)this.bolt(x,y);
  }
  // Floor artwork and brass club crest: does not masquerade as a hittable object.
  this.poly([[245,550],[325,550],[325,594],[285,619],[245,594]],'#e5cf8b18','#c5d6b64d');this.text('PRIME',285,575,21,'#d7e9c27a');this.text('FOOTBALL CLUB',285,591,7,'#d7e9c28a');
  for(const [x,y] of [[78,548],[477,548],[78,600],[477,600]]){this.ellipse(x+3,y+4,9,9,'#0006');this.ellipse(x,y,7,7,this.metal(x,y-7,14),'#97b5b8');this.ellipse(x,y,3,3,'#60d6e0');}
  // Lower apron, outlane visibility and printed instructions.
  this.poly([[48,865],[148,883],[300,907],[461,883],[551,861],[551,947],[48,947]],this.gradient(0,870,0,950,[[0,'#06131d'],[.4,'#263d45'],[1,'#101b22']]),'#74887c');
  this.line([[66,885],[150,903],[300,926],[453,904],[534,883]],'#c4a566',3);this.text('PRIME  /  STADIUM SERIES',300,947,10,'#e1d3ad');
  this.rect(67,911,102,21,'#06121a',3,'#758e89');this.text('A / ←  LEFT',118,925,9,'#b4c9c4');this.rect(432,911,102,21,'#06121a',3,'#758e89');this.text('RIGHT  D / →',483,925,9,'#b4c9c4');
  for(const [x,y] of [[15,18],[585,18],[15,940],[585,940],[30,150],[570,150]])this.bolt(x,y);
 }
 bumper(b,hit){const c=this.ctx;
  this.ellipse(b.x+7,b.y+13,b.r+10,b.r+4,'#0008');this.ellipse(b.x,b.y+9,b.r+6,b.r+3,'#0a171c','#758685');
  for(let i=0;i<16;i++){const a=i*Math.PI/8;this.line([[b.x+Math.cos(a)*(b.r+2),b.y+Math.sin(a)*(b.r+1)],[b.x+Math.cos(a)*(b.r+2),b.y+Math.sin(a)*(b.r+1)+8]],'#67807c',2);}
  c.shadowColor=hit?'#ffe297':'#39d9de';c.shadowBlur=hit?28:8;this.ellipse(b.x,b.y,b.r+4,b.r+4,hit?'#fff1af':'#6dccc5','#d6e8cd');c.shadowBlur=0;
  this.ellipse(b.x,b.y,b.r,b.r,'#0a242f','#d8c084');this.soccer(b.x,b.y,b.r-5);
 }
 draw(game,effects,trail,reduced){const c=this.ctx;c.fillStyle="#071514";c.fillRect(0,0,600,960);c.save();c.translate(30,70);c.scale(.9,.9);c.drawImage(this.cache,0,0,600,960);
  this.text(game.goalArmed?'SHOOT TO SCORE!':game.powerPlay>0?'POWER PLAY x3':'GOAL LOCKED',285,222,9,game.goalArmed?'#ffe290':'#bdd2b4');this.P.bumpers.forEach((b,i)=>this.bumper(b,(game.cooldowns['b'+i]||0)>game.time));
  this.P.targets.forEach((t,i)=>{const lit=game.lit&(1<<i);this.ellipse(t.x+4,t.y+7,t.r+4,t.r+4,'#0008');this.ellipse(t.x,t.y,t.r+2,t.r+2,this.metal(t.x,t.y-t.r,t.r*2),'#d4c6a2');c.shadowColor='#ffcc64';c.shadowBlur=lit?16:0;this.ellipse(t.x,t.y,t.r-2,t.r-2,lit?'#ffce72':'#19332f','#c9ae67');c.shadowBlur=0;this.text('PRM'[i],t.x,t.y+6,18,lit?'#2f2716':'#ffdf9a');this.text(['PASS','RUN','MATCH'][i],t.x,t.y+33,8,'#c7d7b3');});
  game.flippers.forEach(f=>{const end=[f.x+Math.cos(f.a)*100,f.y+Math.sin(f.a)*100];this.line([[f.x+5,f.y+10],[end[0]+5,end[1]+10]],'#0009',30);this.line([[f.x,f.y],end],'#0b232a',28);this.line([[f.x,f.y],end],'#d9bd71',24);this.line([[f.x,f.y-3],[end[0],end[1]-3]],'#eaf3de',17);this.line([[f.x+10,f.y-5],[end[0]-Math.cos(f.a)*10,end[1]-5]],'#5a9292',3);this.ellipse(f.x,f.y,7,7,'#274650','#a7c2b9');this.bolt(f.x,f.y);});
  if(game.phase!=='over'){if(!reduced)trail.forEach((p,i)=>this.ellipse(p.x,p.y,2+i*.55,2+i*.55,`rgba(202,242,223,${i/65})`));this.ellipse(game.ball.x+5,game.ball.y+7,9,7,'#0008');this.soccer(game.ball.x,game.ball.y,this.P.R);}
  effects.forEach(e=>{c.globalAlpha=Math.max(0,e.life);this.ellipse(e.x,e.y,15+(1-e.life)*40,15+(1-e.life)*40,'#0000',e.type==='combo'?'#ffdc80':'#a2f4d3');this.text('+'+e.points,e.x,e.y-35-(1-e.life)*25,18,'#fff1b5');});c.globalAlpha=1;c.restore();
 }
}
root.StadiumPinballRenderer=StadiumPinballRenderer;
})(globalThis);
