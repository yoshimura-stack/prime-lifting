// Isolated three-reel slot. Twenty actual symbols per reel, physically scrolling.
const TYPES=Object.freeze({
 miss:{label:'ハズレ',color:'#F3F4F6',detail:'また明日チャレンジ！'},
 time:{label:'+5 SEC',color:'#3B82F6',detail:'プレイ時間 +5秒'},
 score:{label:'SCORE BOOST',color:'#FACC15',detail:'得点倍率 +0.1'},
 sc:{label:'SECOND CHANCE',color:'#22C55E',detail:'最初の落球を救済'}
});
const SYMBOLS=Object.keys(TYPES);
export function shuffledStrip(random=Math.random){
 const strip=SYMBOLS.flatMap(type=>Array(5).fill(type));
 for(let i=strip.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[strip[i],strip[j]]=[strip[j],strip[i]];}
 return strip;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function ballMarkup(type){
 const color=TYPES[type].color;
 const id='ball-'+type;
 return `<svg viewBox="0 0 120 120" class="boost-slot-ball" aria-hidden="true"><defs><radialGradient id="${id}" cx="34%" cy="25%" r="78%"><stop stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="${color}"/><stop offset=".75" stop-color="${color}"/><stop offset="1" stop-color="#182238"/></radialGradient><clipPath id="clip-${id}"><circle cx="60" cy="60" r="54"/></clipPath></defs><circle cx="60" cy="60" r="54" fill="url(#${id})" stroke="#172030" stroke-width="2"/><g clip-path="url(#clip-${id})" stroke="#18212b" stroke-width="2" fill="none"><polygon points="60,39 81,54 73,79 47,79 39,54" fill="#15191e"/><path d="M60 39L60 15 M81 54L104 46 M73 79L89 101 M47 79L31 101 M39 54L16 46 M60 15L37 8L16 24L16 46L39 54 M60 15L83 8L104 24L104 46L81 54 M104 46L113 68L105 91L89 101L73 79 M89 101L73 118L47 118L31 101L47 79 M31 101L15 91L7 68L16 46"/><polygon points="60,-3 78,4 83,21 60,27 43,15" fill="#15191e"/><polygon points="108,23 124,39 121,61 105,66 96,45" fill="#15191e"/><polygon points="101,96 112,112 96,128 75,117 78,98" fill="#15191e"/><polygon points="19,96 42,98 45,117 24,128 8,112" fill="#15191e"/><polygon points="12,23 24,45 15,66 -1,61 -4,39" fill="#15191e"/></g><ellipse cx="39" cy="27" rx="25" ry="10" fill="#fff" opacity=".12" transform="rotate(-30 39 27)"/></svg>`;
}
function makeSymbol(type){
 const row=document.createElement('div');row.className='boost-slot-strip-symbol';
 row.style.setProperty('--symbol-glow',TYPES[type].color);
 row.innerHTML=ballMarkup(type);row.setAttribute('aria-label',TYPES[type].label);
 return row;
}
export function createSlotPreview(root,{spin,enabled=false}={}){
 if(!root||typeof root.append!=='function')throw new TypeError('Root element required');
 root.replaceChildren();
 const heading=document.createElement('h2');heading.textContent='⚽ PRIME DAILY SLOT';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.textContent=enabled?'STARTで回転、STOPで左から順に停止！':'🔒 開発プレビュー：抽選・付与は無効';
 const reels=document.createElement('div');reels.className='boost-slot-reels';
 const cells=Array.from({length:3},()=>{
  const strip=shuffledStrip();
  const cell=document.createElement('div');cell.className='boost-slot-reel';
  const track=document.createElement('div');track.className='boost-slot-track';
  // Repeat full 20-symbol strips so a reel wraps without changing its order.
  for(let repeat=0;repeat<5;repeat++)for(const type of strip)track.append(makeSymbol(type));
  cell.append(track);reels.append(cell);
  return {cell,track,strip,position:20,velocity:0,raf:0,last:0,active:false};
 });
 const render=reel=>{
  const step=reel.cell.clientHeight||128;
  reel.track.style.setProperty('--reel-step',step+'px');
  reel.track.style.transform='translate3d(0,'+(-reel.position*step)+'px,0)';
 };
 const paint=(reel,type)=>{
  reel.cell.style.setProperty('--boost-color',TYPES[type].color);
  reel.cell.setAttribute('aria-label',TYPES[type].label);
 };
 const animate=reel=>{
  reel.active=true;reel.velocity=18;reel.last=0;
  const frame=timestamp=>{
   if(!reel.active)return;
   if(reel.last){reel.position+=(timestamp-reel.last)*reel.velocity/1000;}
   reel.last=timestamp;
   if(reel.position>=40)reel.position-=20;
   render(reel);
   reel.raf=requestAnimationFrame(frame);
  };
  reel.raf=requestAnimationFrame(frame);
 };
 const stop=async(reel,type)=>{
  reel.active=false;cancelAnimationFrame(reel.raf);
  // Finish at the next matching symbol, after several visible turns.
  const index=reel.strip.indexOf(type);
  const current=reel.position;
  const base=20+index;
  const extra=((base-current)%20+20)%20;
  const start=current;
  const target=current+20+extra;
  const duration=2650;
  const begin=performance.now();
  await new Promise(resolve=>{
   const frame=now=>{
    const t=Math.min(1,(now-begin)/duration);
    const eased=1-Math.pow(1-t,3);
    reel.position=start+(target-start)*eased;
    render(reel);
    if(t<1)requestAnimationFrame(frame);
    else resolve();
   };
   requestAnimationFrame(frame);
  });
  reel.position=20+index;
  render(reel);paint(reel,type);reel.cell.classList.add('is-stopped');
 };
 cells.forEach(reel=>{render(reel);paint(reel,reel.strip[0]);});
 const startButton=document.createElement('button');startButton.type='button';
 startButton.textContent=enabled?'▶ START':'START（開発中）';startButton.disabled=!enabled;
 const button=document.createElement('button');button.type='button';
 button.textContent=enabled?'■ STOP':'STOP（開発中）';button.disabled=true;
 const apply=type=>{
  if(!Object.hasOwn(TYPES,type))throw new TypeError('Unknown BOOST type');
  cells.forEach(reel=>{reel.active=false;cancelAnimationFrame(reel.raf);reel.position=20+reel.strip.indexOf(type);render(reel);paint(reel,type);});
  return TYPES[type];
 };
 let running=false,spinning=false;
 startButton.addEventListener('click',()=>{
  if(running||spinning||!enabled)return;
  spinning=true;startButton.disabled=true;button.disabled=false;
  status.textContent='20絵柄 × 3リール高速回転！ STOPで停止';
  cells.forEach(reel=>{reel.cell.classList.remove('is-stopped');animate(reel);});
 });
 button.addEventListener('click',async()=>{
  if(running||!spinning||!enabled||typeof spin!=='function')return;
  running=true;spinning=false;button.disabled=true;status.textContent='STOP！ 左→中央→右の順に減速中…';
  try{
   const result=await spin();
   if(result?.allFull===true){
    cells.forEach(reel=>{reel.active=false;cancelAnimationFrame(reel.raf);});
    status.textContent='すべて2個所持中です。BOOSTを使ってから再挑戦してください。';
    button.dataset.completed='true';button.textContent='所持数上限';
    return;
   }
   if(!result||!Object.hasOwn(TYPES,result.boost)||!Array.isArray(result.reels)||result.reels.length!==3||!result.reels.every(v=>v===result.boost))throw new Error('Invalid slot result');
   for(let i=0;i<cells.length;i++){
    await stop(cells[i],result.boost);
    if(i<2)await wait(250);
   }
   const item=TYPES[result.boost];
   status.textContent=result.replayed?'本日は抽選済み：'+item.label:result.boost==='miss'?'残念！ '+item.detail:'当選！ '+item.label+' — '+item.detail;
   button.dataset.completed='true';button.textContent='抽選済み';
  }catch{
   status.textContent='抽選を確認できませんでした。時間をおいて再試行してください。';
  }finally{
   cells.forEach(reel=>{reel.active=false;cancelAnimationFrame(reel.raf);});
   running=false;if(button.dataset.completed!=='true'){startButton.disabled=false;button.disabled=true;}
  }
 });
 root.append(heading,reels,startButton,button,status);
 return Object.freeze({apply,setStatus:value=>{status.textContent=String(value);}});
}
