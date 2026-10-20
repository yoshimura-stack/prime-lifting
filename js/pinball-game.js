/* Input, presentation and optional local-only records for the independent cabinet. */
'use strict';
(()=>{
 const P=PrimePinball,game=new P(),$=id=>document.getElementById('pb-'+id),canvas=$('canvas');
 const keys=new Set(),pointers=new Map(),effects=[],trail=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let paused=false,last=0,acc=0,sound=false,messageUntil=0,notice='',charging=false,charge=0,chargeSource=null;
 let audio=null,noise=null,best=0,recorded=false,lastSound=0;
 try{best=Math.max(0,Number(localStorage.getItem('prime.pinball.best.v1'))||0);}catch{}
 function release(){keys.clear();pointers.clear();charging=false;chargeSource=null;$('left').classList.remove('held');$('right').classList.remove('held');}
 function pause(value){paused=value;release();acc=0;$('pause').textContent=paused?'再開':'一時停止';}
 function reset(){game.reset();recorded=false;effects.length=0;trail.length=0;notice='';messageUntil=0;pause(false);}
 function initializeAudio(){
  if(audio)return;audio=new AudioContext();noise=audio.createBuffer(1,audio.sampleRate*.15,audio.sampleRate);
  const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
 }
 function note(freq,duration=.12,volume=.025,type='sine',delay=0){
  if(!sound||!audio)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.65),t+duration);
  g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(audio.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);
 }
 function thud(force=.5){
  if(!sound||!audio||audio.currentTime-lastSound<.025)return;lastSound=audio.currentTime;
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=noise;filter.type='lowpass';filter.frequency.value=700+force*1700;gain.gain.value=.035+force*.035;source.connect(filter).connect(gain).connect(audio.destination);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start();
 }
 function eventSound(e){
  if(e.type==='flipper'){thud(.5);note(130,.055,.035,'triangle');}
  else if(e.type==='strike'){thud(e.force);note(95,.09,.04,'triangle');}
  else if(e.type==='impact')thud(e.force*.5);
  else if(e.type==='goal'){[392,494,587,784].forEach((f,i)=>note(f,.3,.035,'triangle',i*.09));}
  else if(e.type==='skill'||e.type==='combo'){[440,660,880].forEach((f,i)=>note(f,.18,.025,'sine',i*.06));}
  else if(e.type==='hit'){thud(.3);note(e.key.startsWith('b')?280:620,.11,.022,'triangle');}
  else if(e.type==='drain'||e.type==='over'){note(180,.35,.035,'triangle');}
 }
 $('sound').onclick=()=>{sound=!sound;$('sound').textContent='音 '+(sound?'ON':'OFF');$('sound').setAttribute('aria-pressed',sound);if(sound){initializeAudio();audio.resume();note(520);}else audio?.suspend();};
 $('back').onclick=()=>{release();audio?.close();if(parent!==window)parent.postMessage('prime-pinball-close',location.origin);else location.href='index.html';};
 $('retry').onclick=reset;$('result-retry').onclick=reset;$('pause').onclick=()=>pause(!paused);
 function startCharge(source){
  if(paused){pause(false);return;}
  if(game.phase==='over')reset();
  if(game.phase!=='ready'||charging)return;
  charging=true;charge=.04;chargeSource=source;if(sound)audio?.resume();
 }
 function endCharge(source){
  if(!charging||source!==chargeSource)return;
  charging=false;chargeSource=null;game.launch(charge);note(110,.18,.04,'sawtooth');
 }
 for(const id of ['launch','fire']){
  const b=$(id);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);startCharge('p'+e.pointerId);};
  b.onpointerup=e=>{e.preventDefault();endCharge('p'+e.pointerId);};
  b.onpointercancel=b.onlostpointercapture=e=>{if(chargeSource==='p'+e.pointerId){charging=false;chargeSource=null;}};
  // Enter, assistive technology and programmatic keyboard clicks remain usable.
  b.onclick=e=>{if(e.detail===0){startCharge('accessible');endCharge('accessible');}};
 }
 for(const side of ['left','right']){
  const b=$(side);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,side);b.classList.add('held');};
  const up=e=>{pointers.delete(e.pointerId);b.classList.toggle('held',[...pointers.values()].includes(side));};b.onpointerup=up;b.onpointercancel=up;b.onlostpointercapture=up;
 }
 window.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','KeyA','KeyD','Space','Escape'].includes(e.code))return;e.preventDefault();
  if(e.code==='Space'){if(!e.repeat)startCharge('keyboard');}
  else if(e.code==='Escape'){if(!e.repeat)pause(!paused);}
  else keys.add(e.code);
 });
 window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space'){e.preventDefault();endCharge('keyboard');}});
 window.addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
 let renderer;
 try{renderer=new StadiumPinball3DRenderer(canvas,P);document.body.classList.add('pb-webgl');}
 catch(error){console.warn('3D pinball unavailable; using canvas renderer',error);const replacement=canvas.cloneNode();canvas.replaceWith(replacement);renderer=new StadiumPinballRenderer(replacement,P);}
 document.body.dataset.renderer=document.body.classList.contains('pb-webgl')?'webgl':'canvas';
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause(true);});
 function announce(text,now,duration=1800){notice=text;messageUntil=now+duration;}
 function handleEvent(e,now){
  if(e.points&&effects.length<24)effects.push({...e,life:1});eventSound(e);
  if(e.type==='skill')announce('SKILL SHOT! +1,000',now);
  if(e.type==='combo')announce('ゴール開放！ 上のゴールを狙おう',now,2500);
  if(e.type==='goal')announce('GOAL! +'+e.points+' • 15秒間 得点×3',now,2500);
  if(e.type==='save')announce('BALL SAVE • 残球そのまま、もう一度',now);
  if(e.type==='drain')announce('NEXT BALL • ターゲット進行は継続',now);
  if(e.type==='rescue')announce(game.phase==='ready'?'BALL RESET • 再発射してください':'BALL RELEASE',now);
 }
 function hud(now){
  $('score').textContent=String(game.score).padStart(6,'0');$('balls').textContent='● '.repeat(game.balls)||'—';
  $('retry').hidden=game.phase!=='over';$('launch').disabled=game.phase==='playing'&&!paused;$('fire').disabled=game.phase==='playing'&&!paused;
  const launchText=paused?'再開':game.phase==='over'?'再挑戦':charging?'離して発射':'長押しで発射';$('fire').textContent=launchText;$('launch').textContent=launchText+' / SPACE';
  $('power').hidden=!(game.phase==='ready'&&!paused);$('power-fill').style.width=(charge*100)+'%';$('power-value').textContent=charging?Math.round(charge*100)+'%':'押す長さで発射の強さを調整';
  const targetText=['P','R','M'].map((v,i)=>(game.lit&(1<<i)?'● ':'○ ')+v).join('  ');
  $('mission').textContent=game.powerPlay>0?'POWER PLAY ×3 • '+Math.ceil(game.powerPlay)+'秒':game.goalArmed?'GOAL OPEN • 上のゴールへシュート':targetText+' • 3つ揃えてゴール開放';
  $('mission').classList.toggle('active',game.powerPlay>0||game.goalArmed);$('goals').textContent=game.goals;$('best').textContent=Math.max(best,game.score).toLocaleString();
  $('results').hidden=game.phase!=='over';
  if(game.phase==='over'&&!recorded){const previous=best;best=Math.max(best,game.score);try{localStorage.setItem('prime.pinball.best.v1',String(best));}catch{}recorded=true;
   $('result-score').textContent=game.score.toLocaleString();$('result-label').textContent=game.score>previous?'PERSONAL BEST':'FULL TIME';$('result-stats').textContent=game.goals+' GOALS / '+game.stats.skillShots+' SKILL SHOTS / '+game.stats.flipperHits+' FLIPPER HITS';
  }
  let message=paused?'PAUSED • 再開を押してください':now<messageUntil?notice:game.phase==='ready'?'弱めの発射で左上のSKILLレーンを狙おう':game.phase==='over'?'':game.saver>0?'BALL SAVE '+Math.ceil(game.saver)+'s':game.powerPlay>0?'POWER PLAY ×3 • '+Math.ceil(game.powerPlay)+'s':game.goalArmed?'GOAL OPEN • 上のゴールへ':'P・R・M を揃えてゴールを開放';
  if($('message').textContent!==message)$('message').textContent=message;
 }
 function frame(now){
  const dt=Math.min((now-last)/1000||0,.1);last=now;
  if(!paused){
   if(charging)charge=Math.min(1,charge+dt*.85);
   const left=keys.has('KeyA')||keys.has('ArrowLeft')||[...pointers.values()].includes('left'),right=keys.has('KeyD')||keys.has('ArrowRight')||[...pointers.values()].includes('right');
   acc+=dt;while(acc>=P.STEP){game.step(left,right);acc-=P.STEP;for(const e of game.events)handleEvent(e,now);}
   effects.forEach(e=>e.life-=dt*1.2);while(effects.length&&effects[0].life<=0)effects.shift();
   if(game.phase==='playing'){trail.push({...game.ball});if(trail.length>9)trail.shift();}else trail.length=0;
  }
  hud(now);renderer.draw(game,effects,trail,reduced);requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
})();
