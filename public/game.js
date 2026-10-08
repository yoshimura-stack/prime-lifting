(function(){
'use strict';
const $=id=>document.getElementById(id),c=PRIME_CONFIG,canvas=$('game'),ctx=canvas.getContext('2d');
const settingsKey='prime-lifting-v031-tuning';
const controls=[['移動速度','PLAYER_SPEED',120,450,10],['移動の加速','PLAYER_ACCELERATION',400,3000,100],['移動の減速','PLAYER_DECELERATION',400,3000,100],['ジャンプ力','PLAYER_JUMP_POWER',200,550,10],['選手の重力','GRAVITY',700,1800,50],['ボールの重力','BALL_GRAVITY',400,1100,25],['回転時間','SPIN_DURATION',0.18,0.8,0.01],['回転中の移動率','SPIN_MOVE_FACTOR',0,0.8,0.05],['打球間隔','ACTION_COOLDOWN',0.1,0.4,0.01],['回転ボーナス','SPIN_BONUS',0,600,25]];
for(const name of Object.keys(c.ACTIONS)){controls.push([name+' 打上げ力','ACTIONS.'+name+'.verticalVelocity',250,750,10],[name+' 判定半径','ACTIONS.'+name+'.contactRadius',10,36,1],[name+' 横への影響','ACTIONS.'+name+'.horizontalInfluence',0,12,0.25],[name+' 得点','ACTIONS.'+name+'.score',0,1000,25]);}
const get=(o,path)=>path.split('.').reduce((a,k)=>a[k],o);
function set(o,path,value){const bits=path.split('.'),last=bits.pop();bits.reduce((a,k)=>a[k],o)[last]=value;}
try{const saved=JSON.parse(localStorage.getItem(settingsKey)||'{}');for(const [,path,min,max] of controls)if(Number.isFinite(saved[path]))set(c,path,Math.max(min,Math.min(max,saved[path])));}catch{}
const g=new LiftingGame(c),keys=new Set();
let renderer3d=null;try{renderer3d=new PrimeRenderer($('scene'),c);}catch(error){console.warn('3D unavailable; using 2D fallback.',error);$('scene').hidden=true;}
const kitStorageKey='prime-lifting-selected-kit';
let selectedKit=PRIME_KITS.get((()=>{try{return localStorage.getItem(kitStorageKey)||PRIME_KITS.defaultId;}catch{return PRIME_KITS.defaultId;}})());
let kitGroup=selectedKit.group;
function applyKit(kit){selectedKit=kit;try{localStorage.setItem(kitStorageKey,kit.id);}catch{}if(renderer3d)renderer3d.setKit(kit);$('kit-current').textContent=kit.name;document.querySelectorAll('.kit-card').forEach(el=>el.classList.toggle('active',el.dataset.kit===kit.id));}
function renderKitTabs(){const tabs=$('kit-tabs');tabs.replaceChildren();for(const group of PRIME_KITS.groups){const b=document.createElement('button');b.type='button';b.textContent=group;b.classList.toggle('active',group===kitGroup);b.onclick=()=>{kitGroup=group;renderKitTabs();renderKitGrid();};tabs.append(b);}}
function renderKitGrid(){const grid=$('kit-grid');grid.replaceChildren();for(const kit of PRIME_KITS.kits.filter(k=>k.group===kitGroup)){const b=document.createElement('button');b.type='button';b.className='kit-card'+(kit.id===selectedKit.id?' active':'');b.dataset.kit=kit.id;const shirt=document.createElement('div');shirt.className='kit-shirt '+kit.pattern;shirt.style.setProperty('--p',kit.primary);shirt.style.setProperty('--s',kit.secondary);shirt.style.setProperty('--a',kit.accent);shirt.style.setProperty('--pattern',kit.pattern==='stripe'?`repeating-linear-gradient(90deg,${kit.primary} 0 18%,${kit.secondary} 18% 36%)`:'none');const title=document.createElement('strong');title.textContent=kit.name;const sub=document.createElement('small');sub.textContent='ORIGINAL COLOR KIT';b.append(shirt,title,sub);b.onclick=()=>applyKit(kit);grid.append(b);}}
function openKitSelect(){touch.clear();pause(true);kitGroup=selectedKit.group;renderKitTabs();renderKitGrid();$('kit-current').textContent=selectedKit.name;$('kit-select').hidden=false;}
$('kit-confirm').onclick=()=>{$('kit-select').hidden=true;$('overlay').hidden=false;canvas.focus();};
$('kit-change').onclick=openKitSelect;
applyKit(selectedKit);renderKitTabs();renderKitGrid();$('overlay').classList.add('intro-overlay');
let rankTick=0,rankEvents=[],rankDirection=0,rankStandard=true;
function standardRules(){return JSON.stringify(c)===JSON.stringify(PRIME_DEFAULTS);}
function rankedInput(name){if(['countdown','playing'].includes(g.phase))rankEvents.push({t:rankTick,n:name});return g[name]();}
let debug=false,muted=false,paused=false,audioContext=null,last=0,accumulator=0,effects=[],message='',messageTime=0;
const mobileQuery=matchMedia('(orientation:landscape)');
const touchQuery=matchMedia('(pointer:coarse)');
const isMobile=()=>mobileQuery.matches&&(touchQuery.matches||navigator.maxTouchPoints>0||'ontouchstart' in window);
const refreshMobile=()=>{document.body.classList.toggle('touch-landscape',isMobile());draw();};
const touch=new PrimeTouchController($('touch-controls'),{enabled:()=>isMobile()&&!paused&&$('overlay').hidden&&$('kit-select').hidden,action:name=>{rankedInput(name);processEvents();draw();}});
function syncMobile(){touch.clear();document.body.classList.toggle('touch-landscape',isMobile());$('overlay-note').textContent=isMobile()?'打球はKICKボタン。複数の指で同時操作できます。':'打球はゲーム画面内でクリック';pause(true);}
mobileQuery.addEventListener('change',syncMobile);touchQuery.addEventListener('change',syncMobile);window.addEventListener('resize',refreshMobile);syncMobile();
$('mobile-pause').onclick=()=>pause(true);
function sound(type){if(muted)return;try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const t=audioContext.currentTime,osc=audioContext.createOscillator(),gain=audioContext.createGain();const tone={hit:270,CHEST:120,HEADER:370,JUMP_HEADER:480,spin:650,miss:110,drop:80,start:740,end:220}[type]||270;osc.type=type==='spin'?'sine':'triangle';osc.frequency.setValueAtTime(tone,t);osc.frequency.exponentialRampToValueAtTime(Math.max(40,tone*(type==='start'?1.5:0.45)),t+0.13);gain.gain.setValueAtTime(0.065,t);gain.gain.exponentialRampToValueAtTime(0.001,t+0.17);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+0.18);}catch{}}
function showOverlay(label,title,copy,button){$('overlay').classList.remove('intro-overlay');$('overlay').hidden=false;$('overlay-label').textContent=label;$('overlay-title').textContent=title;$('overlay-copy').textContent=copy;$('start').innerHTML=button+' <span>↗</span>';}
function pause(value){if(!['playing','countdown'].includes(g.phase))return;paused=value;keys.clear();touch.clear();accumulator=0;if(value)showOverlay('TAKE A BREATH','一時停止','続きは、あなたのタイミングで。','再開する');else $('overlay').hidden=true;$('pause').innerHTML=value?'再開 <em>ESC</em>':'一時停止 <em>ESC</em>';}
$('start').onclick=()=>{if(paused){$('tuning').hidden=true;$('tune').setAttribute('aria-expanded','false');pause(false);}else{g.reset();keys.clear();touch.clear();rankTick=0;rankEvents=[];rankDirection=0;rankStandard=standardRules();window.PRIME_RANKING.begin(rankStandard);effects=[];message='';messageTime=0;$('overlay').hidden=true;sound('start');}canvas.focus();};
$('pause').onclick=()=>{pause(!paused);if(!paused)canvas.focus();};
$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'音 OFF':'音 ON';$('sound').setAttribute('aria-pressed',String(!muted));};
function toggleDebug(){debug=!debug;$('debug').setAttribute('aria-pressed',String(debug));$('debug').innerHTML=debug?'判定 ON <em>F2</em>':'判定表示 <em>F2</em>';}
$('debug').onclick=toggleDebug;
window.addEventListener('keydown',e=>{if(e.code==='F2'){e.preventDefault();if(!e.repeat)toggleDebug();return;}if(e.code==='Escape'){if(!e.repeat)pause(!paused);return;}if(e.target.matches('input,button'))return;if(['KeyA','KeyD','Space'].includes(e.code)){e.preventDefault();if(!paused){keys.add(e.code);if(e.code==='Space'&&!e.repeat)rankedInput('jump');}}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();touch.clear();pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
// Keep native selection in login inputs, but disable it on the live game surface.
for(const eventName of ['selectstart','dragstart','contextmenu']){
 document.addEventListener(eventName,e=>{
  if(!isMobile())return;
  if(e.target.closest('input,textarea,[contenteditable="true"]'))return;
  if(e.target.closest('.game-shell,#touch-controls,.mobile-score-panel'))e.preventDefault();
 },{capture:true});
}
document.addEventListener('touchmove',e=>{
 if(!isMobile()||!e.cancelable)return;
 if(e.target.closest('input,textarea,[contenteditable="true"]'))return;
 if(e.target.closest('.game-shell,#touch-controls'))e.preventDefault();
},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus();if(paused||isMobile())return;if(e.button===0)rankedInput('act');if(e.button===2)rankedInput('spin');processEvents();draw();});
$('tune').onclick=()=>{$('tuning').hidden=!$('tuning').hidden;$('tune').setAttribute('aria-expanded',String(!$('tuning').hidden));if(!$('tuning').hidden)pause(true);};
function buildSliders(){$('sliders').replaceChildren();for(const [label,path,min,max,step] of controls){const el=document.createElement('label'),out=document.createElement('output'),input=document.createElement('input');el.append(document.createTextNode(label),out,input);input.type='range';input.setAttribute('aria-label',label);input.min=min;input.max=max;input.step=step;input.value=get(c,path);out.value=input.value;input.oninput=()=>{if(['countdown','playing'].includes(g.phase))rankStandard=false;set(c,path,Number(input.value));out.value=input.value;const saved={};for(const [,key]of controls)saved[key]=get(c,key);try{localStorage.setItem(settingsKey,JSON.stringify(saved));}catch{}};$('sliders').append(el);}}
$('reset-config').onclick=()=>{for(const [,path]of controls)set(c,path,get(PRIME_DEFAULTS,path));try{localStorage.removeItem(settingsKey);}catch{}buildSliders();};buildSliders();
function processEvents(){for(const e of g.events){if(e.type==='hit'){sound(e.name);const skill=[];if(e.spinBonus)skill.push('SPIN ×'+e.spinStreak+' +'+e.spinBonus);if(e.airBonus)skill.push('AIR ×'+e.airStreak+' +'+e.airBonus);message=(e.side?e.side+' ':'')+e.name.replace('_',' ')+'  +'+(e.points+e.bonus)+(skill.length?'  / '+skill.join('  / '):'');messageTime=1.1;effects.push({x:e.x,y:e.y,life:0.25});}if(e.type==='miss'){sound('miss');message='MISS';messageTime=0.4;}if(e.type==='spin')sound('spin');if(e.type==='drop'){sound('drop');message='DROP — もう一度';messageTime=c.RESPAWN_DELAY;}if(e.type==='start'){sound('start');message='START';messageTime=0.6;}if(e.type==='end'){window.PRIME_RANKING.finish({score:g.score,kit:selectedKit.id,device:isMobile()?'mobile':'pc'},rankEvents,rankStandard&&standardRules());sound('end');showOverlay('TIME UP / SESSION COMPLETE',String(g.score).padStart(6,'0')+' POINTS','成功 '+g.hits+'回　 /　最長 '+g.bestCombo+'回　 /　落球 '+g.drops+'回','もう一度プレイ');}}g.events=[];}
function ellipse(x,y,rx,ry,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function line(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function poly(points,fill){ctx.fillStyle=fill;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function text(str,x,y,size,color='#e4efd9',align='center'){ctx.fillStyle=color;ctx.font=`bold ${size}px Arial`;ctx.textAlign=align;ctx.fillText(str,x,y);}
function background(){const grad=ctx.createLinearGradient(0,0,0,620);grad.addColorStop(0,'#142f29');grad.addColorStop(0.62,'#35604a');grad.addColorStop(1,'#2a563c');ctx.fillStyle=grad;ctx.fillRect(0,0,1000,620);
 ctx.fillStyle='#527252';for(let i=0;i<15;i++){const x=i*79;ctx.beginPath();ctx.arc(x,265-(i%3)*11,62,Math.PI,0);ctx.fill();}ctx.fillStyle='#183b2e';ctx.fillRect(0,310,1000,85);
 ctx.strokeStyle='#afc3a31b';ctx.lineWidth=1;for(let x=0;x<=1000;x+=20){ctx.beginPath();ctx.moveTo(x,174);ctx.lineTo(x,407);ctx.stroke();}for(let y=175;y<410;y+=17){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1000,y);ctx.stroke();}ctx.strokeStyle='#9bb49950';ctx.lineWidth=5;for(let x=15;x<1000;x+=194){ctx.beginPath();ctx.moveTo(x,166);ctx.lineTo(x,413);ctx.stroke();}ctx.fillStyle='#afc39a55';ctx.fillRect(0,407,1000,3);
 for(let y=420;y<620;y+=52){ctx.fillStyle='#c6e09f04';ctx.fillRect(0,y,1000,26);}ctx.strokeStyle='#c9ddaa30';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(500,531,290,46,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,554);ctx.lineTo(1000,554);ctx.stroke();text('P R I M E   /   T R A I N I N G   G R O U N D',500,138,10,'#b5c9ab65');
}
function drawPlayer(){const p=g.player,a=g.action,active=g.actionTime>0,f=g.actionSide==='RIGHT'?-1:1,spin=p.spin>0,angle=spin?(1-p.spin/c.SPIN_DURATION)*Math.PI*2:0;const stride=Math.sin(g.elapsed*17)*Math.min(1,Math.abs(p.vx)/c.PLAYER_SPEED);const squash=a==='LAND'&&active?0.94:1;
 ellipse(p.x,c.GROUND_Y+3,35-(c.GROUND_Y-p.y)*0.07,8,'#092e2a66');ctx.save();ctx.translate(p.x,p.y);ctx.scale(spin?Math.cos(angle)*0.85:1,squash);
 let leftK=[-13,-48],rightK=[14,-48],leftFoot=[-16+stride*8,-7],rightFoot=[18-stride*8,-7];
 if(active&&(a==='FOOT'||a==='MISS')){if(f<0){leftK=[-20,-40];leftFoot=[-c.ACTIONS.FOOT.offsetX,-c.ACTIONS.FOOT.height];}else{rightK=[20,-40];rightFoot=[c.ACTIONS.FOOT.offsetX,-c.ACTIONS.FOOT.height];}}if(active&&a==='KNEE'){if(f<0){leftK=[-c.ACTIONS.KNEE.offsetX,-(c.ACTIONS.KNEE.height-c.KNEE_ANIMATION.contactOffset)];leftFoot=[-c.ACTIONS.KNEE.offsetX,-30];}else{rightK=[c.ACTIONS.KNEE.offsetX,-(c.ACTIONS.KNEE.height-c.KNEE_ANIMATION.contactOffset)];rightFoot=[c.ACTIONS.KNEE.offsetX,-30];}}if(p.y<c.GROUND_Y){if(!active||!['FOOT','KNEE'].includes(a)||f>0)leftFoot=[-23,-15];if(!active||!['FOOT','KNEE'].includes(a)||f<0)rightFoot=[25,-18];}
 line([[-13,-70],leftK,leftFoot],'#d49760',15);line([[13,-70],rightK,rightFoot],'#e9ae72',15);
 line([leftK,leftFoot],'#e9e7c7',12);line([rightK,rightFoot],'#f4edd3',12);ellipse(leftFoot[0]-4,leftFoot[1],13,7,'#102d30');ellipse(rightFoot[0]+4,rightFoot[1],14,7,'#102d30');
 poly([[-25,-81],[25,-81],[25,-61],[4,-61],[0,-70],[-4,-61],[-24,-61]],selectedKit.secondary);line([[-20,-77],[-20,-63]],selectedKit.accent,3);line([[20,-77],[20,-63]],selectedKit.accent,3);
 const chest=active&&a==='CHEST';poly([[-22,-120],[22,-120],[27,-79],[-27,-79]],selectedKit.primary);poly([[-22,-111],[22,-111],[24,-98],[-24,-98]],selectedKit.secondary);poly([[-22,-111],[22,-111],[22,-107],[-22,-107]],selectedKit.accent);
 let armY=chest?-101:-91;if(p.y<c.GROUND_Y||spin)armY=-113;if(active&&a==='MISS')armY=-106;line([[-22,-113],[-34,armY-6],[-41,armY+10]],'#e5ad78',12);line([[22,-113],[34,armY-6],[41,armY+10]],'#e5ad78',12);line([[-22,-113],[-29,-106]],selectedKit.primary,15);line([[22,-113],[29,-106]],selectedKit.primary,15);
 if(!spin||Math.cos(angle)>0)text('10',0,-84,14,'#f4f0d5');else text('10',0,-89,18,'#123d40');
 line([[0,-122],[0,-130]],'#d89a68',12);const nod=active&&(a==='HEADER'||a==='JUMP_HEADER')?3:0;ellipse(0,-143+nod,23,24,'#f0bb87');ellipse(-23,-142+nod,4,6,'#d99d6e');ellipse(23,-142+nod,4,6,'#d99d6e');
 poly([[-23,-146+nod],[-22,-158+nod],[-12,-168+nod],[7,-169+nod],[22,-157+nod],[23,-146+nod],[13,-154+nod],[-1,-153+nod],[-14,-158+nod],[-17,-146+nod]],'#172b29');
 if(!spin||Math.cos(angle)>0){line([[-12,-144+nod],[-7,-145+nod]],'#293b33',2);line([[7,-145+nod],[12,-144+nod]],'#293b33',2);ellipse(-9,-140+nod,2,2.5,'#182b27');ellipse(9,-140+nod,2,2.5,'#182b27');line([[-5,-130+nod],[5,-130+nod]],'#b37652',2);}else ellipse(0,-149,21,18,'#172b29');ctx.restore();
 if(spin){ctx.strokeStyle='#e0ff7a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-65,53,13,0,angle,angle+Math.PI*1.35);ctx.stroke();}
 if(g.pendingSpins)text('SPIN ×'+g.pendingSpins+'  / 次の打球で確定',p.x,p.y+30,11,'#dcff6a');
}
function drawBall(){const b=g.ball;if(!b.active)return;ellipse(b.x,c.GROUND_Y+3,Math.max(4,13-(c.GROUND_Y-b.y)*0.018),4,'#08292050');ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rotation);ellipse(0,0,c.BALL_RADIUS,c.BALL_RADIUS,'#f9f5db');ctx.strokeStyle='#172d2a';ctx.lineWidth=1.1;ctx.stroke();const r=c.BALL_RADIUS;poly(Array.from({length:5},(_,i)=>[Math.cos(i*Math.PI*0.4)*r*0.45,Math.sin(i*Math.PI*0.4)*r*0.45]),'#193830');for(let i=0;i<5;i++){const a=i*Math.PI*0.4;line([[Math.cos(a)*r*0.45,Math.sin(a)*r*0.45],[Math.cos(a)*r,Math.sin(a)*r]],'#193830',1.4);}ctx.restore();}
function drawDebug(){const colors={FOOT:'#ffce6c',KNEE:'#83dcff',CHEST:'#ff94b8',HEADER:'#dcff6a',JUMP_HEADER:'#dcff6a'};g.regions().forEach(r=>{ctx.strokeStyle=colors[r.name];ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();const right=r.side==='RIGHT';text((r.side?r.side+' ':'')+r.name,r.x+(right?-35:35),r.y,10,colors[r.name],right?'right':'left');});if(g.trail.length>1)line(g.trail.map(p=>[p.x,p.y]),'#ffffff90',1);if(g.ball.active){line([[g.ball.x-4,g.ball.y],[g.ball.x+4,g.ball.y]],'#ff566a',1);line([[g.ball.x,g.ball.y-4],[g.ball.x,g.ball.y+4]],'#ff566a',1);}text(`ACTION: ${g.actionSide||''} ${g.action}  |  VX ${g.ball.vx.toFixed(0)}  VY ${g.ball.vy.toFixed(0)}`,22,108,11,'#dcff6a','left');}

function draw(){$('touch-controls').hidden=!(isMobile()&&!paused&&$('overlay').hidden&&$('kit-select').hidden);if($('touch-controls').hidden&&touch.pointers.size)touch.clear();ctx.clearRect(0,0,1000,620);if(renderer3d){renderer3d.render(g);if(g.pendingSpins)text('SPIN ×'+g.pendingSpins+' / 次の打球で確定',g.player.x,g.player.y+32,11,'#fff0aa');}else{background();drawPlayer();drawBall();}for(const e of effects){ctx.globalAlpha=Math.max(0,e.life/0.25);ctx.strokeStyle='#dcff6a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,13+(0.25-e.life)*65,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;if(debug)drawDebug();if(g.phase==='countdown'){text(String(Math.max(1,Math.ceil(g.countdown))),500,280,84,'#dcff6a');text('ボールの落下地点へ',500,316,13);}else if(messageTime>0)text(message,500,200,message==='START'?40:17,message==='MISS'?'#ffb68f':'#e5ffad');
 $('score').textContent=String(g.score).padStart(6,'0');$('combo').textContent=g.combo;const parts=g.remaining.toFixed(1).split('.');$('time').innerHTML=parts[0]+'<span>.'+parts[1]+'</span>';$('status').textContent=paused?'PAUSED':g.phase==='playing'?(g.actionSide&&g.actionTime>0?g.actionSide+' ':'')+g.action.replace('_',' '):g.phase.toUpperCase();}
function frame(now){const dt=last?Math.min((now-last)/1000,c.MAX_FRAME_DELTA):0;last=now;if(!paused){accumulator+=dt;while(accumulator>=c.FIXED_STEP){const active=['countdown','playing'].includes(g.phase),direction=(keys.has('KeyD')||touch.held('right')?1:0)-(keys.has('KeyA')||touch.held('left')?1:0);if(active){rankStandard=rankStandard&&standardRules();if(direction!==rankDirection){rankEvents.push({t:rankTick,n:'move',v:direction});rankDirection=direction;}}g.update(c.FIXED_STEP,direction);if(active)rankTick++;messageTime-=c.FIXED_STEP;effects.forEach(e=>e.life-=c.FIXED_STEP);effects=effects.filter(e=>e.life>0);processEvents();accumulator-=c.FIXED_STEP;}}draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();

