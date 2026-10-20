'use strict';
(()=>{
 const P=PrimePinball,game=new P(),$=id=>document.getElementById('pb-'+id),canvas=$('canvas'),ctx=canvas.getContext('2d');
 const keys=new Set(),pointers=new Map(),effects=[],trail=[];let paused=false,last=0,acc=0,audio=null,sound=false,messageUntil=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function release(){keys.clear();pointers.clear();$('left').classList.remove('held');$('right').classList.remove('held');}
 function pause(value){paused=value;release();acc=0;$('pause').textContent=paused?'再開':'一時停止';}
 function fire(){if(paused){pause(false);return;}if(game.phase==='over')game.reset();game.launch();}
 function tone(freq){if(!sound)return;audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.12);}
 $('sound').onclick=()=>{sound=!sound;$('sound').textContent='音 '+(sound?'ON':'OFF');$('sound').setAttribute('aria-pressed',sound);if(sound)tone(600);};
 $('back').onclick=()=>{if(parent!==window)parent.postMessage('prime-pinball-close',location.origin);else location.href='index.html';};
 $('launch').onclick=fire;$('fire').onclick=fire;$('retry').onclick=()=>{game.reset();pause(false);};$('pause').onclick=()=>pause(!paused);
 for(const side of ['left','right']){const b=$(side);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,side);b.classList.add('held');};const up=e=>{pointers.delete(e.pointerId);b.classList.toggle('held',[...pointers.values()].includes(side));};b.onpointerup=up;b.onpointercancel=up;b.onlostpointercapture=up;}
 window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space','Escape'].includes(e.code)){e.preventDefault();if(e.code==='Space'&&!e.repeat)fire();else if(e.code==='Escape'&&!e.repeat)pause(!paused);else keys.add(e.code);}});
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
 function line(points,color,width=2,glow=0){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.shadowColor=color;ctx.shadowBlur=glow;ctx.stroke();ctx.shadowBlur=0;}
 function circle(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
 function text(s,x,y,size,color){ctx.font=`bold ${size}px Arial`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(s,x,y);}
 function soccer(x,y,r){const g=ctx.createRadialGradient(x-r*.35,y-r*.4,1,x,y,r);g.addColorStop(0,'#fff');g.addColorStop(.65,'#cde9f6');g.addColorStop(1,'#46647d');circle(x,y,r,g,'#e1f7ff');ctx.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5-.3;ctx.lineTo(x+Math.cos(a)*r*.45,y+Math.sin(a)*r*.45);}ctx.closePath();ctx.fillStyle='#122c45';ctx.fill();}
 function board(){const bg=ctx.createLinearGradient(0,0,600,960);bg.addColorStop(0,'#102e4c');bg.addColorStop(.5,'#050d21');bg.addColorStop(1,'#0d2844');ctx.fillStyle=bg;ctx.fillRect(0,0,600,960);
  for(let y=130;y<940;y+=42)line([[55,y],[515,y]],'#163047',1);for(let x=70;x<520;x+=42)line([[x,150],[x,920]],'#142c43',1);
  line([[20,920],[20,140],[50,64],[112,12],[450,12],[577,95],[577,930]],'#2377ac',7,12);
  P.walls.forEach(w=>{line([[w[0],w[1]],[w[2],w[3]]],'#45657b',9);line([[w[0],w[1]],[w[2],w[3]]],'#71dfff',2,8);});
  for(let i=0;i<P.slings.length;i++){const w=P.slings[i];line([[w[0],w[1]],[w[2],w[3]]],'#a47037',12);line([[w[0],w[1]],[w[2],w[3]]],'#ffe1a0',3,10);}
  circle(285,350,67,'#092844','#286b9d');circle(285,350,58,'#07233e','#64dfff');
  // Decorative inlays stay visually distinct from collision rails.
  for(const x of [80,480]){line([[x,220],[x,490],[x+(x<300?26:-26),535]],'#23465e',12);line([[x,220],[x,490],[x+(x<300?26:-26),535]],'#bd944b',2);for(let y=240;y<490;y+=32)circle(x,y,4,'#ffc66c','#634f34');}
  for(const x of [160,410]){line([[x-25,180],[x,155],[x+25,180]],'#237fa6',3,5);text('POP',x,199,10,'#7ba8c2');}
  for(const x of [136,424]){for(let y=650;y<700;y+=17)line([[x-8,y+6],[x,y],[x+8,y+6]],'#c682ff',3,7);}
  text('PRIME',285,550,34,'#60d8ff');text('NEON MATCHDAY',285,575,11,'#8ebbd0');
  for(let y=170;y<880;y+=35){circle(32,y,3,'#73dbff');circle(567,y,3,'#73dbff');}text('LAUNCH',535,940,9,'#ffda7e');
  line([[190,920],[410,920]],'#eaaf4e',3,10);text('3 BALLS • ONE MORE TRY',300,946,10,'#729bb8');
 }
 const cache=document.createElement('canvas');cache.width=600;cache.height=960;board();cache.getContext('2d').drawImage(canvas,0,0);
 function draw(){ctx.drawImage(cache,0,0);P.bumpers.forEach((b,i)=>{const hit=(game.cooldowns['b'+i]||0)>game.time;ctx.shadowBlur=hit?30:12;ctx.shadowColor='#4adfff';circle(b.x,b.y,b.r+5,'#0d3156','#60dfff');ctx.shadowBlur=0;soccer(b.x,b.y,b.r-5);});
  P.targets.forEach((t,i)=>{circle(t.x,t.y,t.r+7,game.lit&(1<<i)?'#c78e2c':'#1e2633','#ffc95e');text('PRM'[i],t.x,t.y+7,20,'#fff0bd');});
  game.flippers.forEach(f=>{const end=[f.x+Math.cos(f.a)*100,f.y+Math.sin(f.a)*100];line([[f.x+2,f.y+8],[end[0]+2,end[1]+8]],'#0009',29);line([[f.x,f.y],end],'#bc7d28',28);line([[f.x,f.y],end],'#ffdc86',21,10);line([[f.x,f.y-3],[end[0],end[1]-3]],'#fff6d3',5);circle(f.x,f.y,7,'#284e6a','#ffdd8a');});
  if(game.phase!=='over'){if(!reduced)trail.forEach((p,i)=>circle(p.x,p.y,2+i*.65,`rgba(89,207,255,${i/40})`));circle(game.ball.x+4,game.ball.y+6,10,'#0007');soccer(game.ball.x,game.ball.y,P.R);}
  effects.forEach(e=>{ctx.globalAlpha=e.life;circle(e.x,e.y,15+(1-e.life)*45,'#0000',e.type==='combo'?'#ffe080':'#55d8ff');text('+'+e.points,e.x,e.y-30-(1-e.life)*30,18,'#ffe4a0');});ctx.globalAlpha=1;
 }
 function frame(now){const dt=Math.min((now-last)/1000||0,1/30);last=now;
  if(!paused){const left=keys.has('KeyA')||keys.has('ArrowLeft')||[...pointers.values()].includes('left'),right=keys.has('KeyD')||keys.has('ArrowRight')||[...pointers.values()].includes('right');acc+=dt;while(acc>=P.STEP){game.step(left,right);acc-=P.STEP;
   for(const e of game.events){if(e.points){if(effects.length<30)effects.push({...e,life:1});tone(e.type==='combo'?880:440+e.points);}if(['save','drain','rescue'].includes(e.type)){messageUntil=now+1800;$('message').textContent=e.type==='save'?'BALL SAVE • もう一度発射':e.type==='drain'?'NEXT BALL • もう一度':'BALL RESET • 発射';}}
  }effects.forEach(e=>e.life-=dt*1.8);while(effects.length&&effects[0].life<=0)effects.shift();if(game.phase==='playing'){trail.push({...game.ball});if(trail.length>9)trail.shift();}else trail.length=0;}
  $('score').textContent=String(game.score).padStart(6,'0');$('balls').textContent='● '.repeat(game.balls)||'—';$('retry').hidden=game.phase!=='over';$('launch').disabled=game.phase==='playing'&&!paused;$('fire').textContent=paused?'再開':game.phase==='over'?'再挑戦':'発射';
  if(paused)$('message').textContent='PAUSED • 再開を押してください';else if(now>messageUntil)$('message').textContent=game.phase==='ready'?'SPACE / 発射でスタート':game.phase==='over'?'GAME OVER • '+game.score.toLocaleString()+' PTS':game.saver>0?'BALL SAVE ACTIVE':'';
  draw();requestAnimationFrame(frame);
 }requestAnimationFrame(frame);
})();
