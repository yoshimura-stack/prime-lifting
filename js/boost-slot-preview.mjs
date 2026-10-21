// Phase-one V6 visual reels. Locked staging preview; server result is authoritative.
const TYPES=Object.freeze({
 miss:{label:'ハズレ',color:'#F3F4F6',detail:'また明日チャレンジ！'},
 time:{label:'+5 SEC',color:'#3B82F6',detail:'プレイ時間 +5秒'},
 score:{label:'SCORE BOOST',color:'#FACC15',detail:'得点倍率 +0.1'},
 sc:{label:'SECOND CHANCE',color:'#22C55E',detail:'最初の落球を救済'}
});
const SYMBOLS=Object.keys(TYPES);
function shuffledStrip(){
 const strip=SYMBOLS.flatMap(type=>Array(5).fill(type));
 for(let i=strip.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[strip[i],strip[j]]=[strip[j],strip[i]];}
 return strip;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function createSlotPreview(root,{spin,enabled=false}={}){
 if(!root||typeof root.append!=='function')throw new TypeError('Root element required');
 root.replaceChildren();
 const heading=document.createElement('h2');heading.textContent='⚽ DAILY SLOT';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.textContent=enabled?'STOPでリールを止めよう！':'🔒 開発プレビュー：抽選・付与は無効';
 const reels=document.createElement('div');reels.className='boost-slot-reels';
 const strips=Array.from({length:3},()=>shuffledStrip());
 const cells=strips.map(strip=>{
  const cell=document.createElement('div');cell.className='boost-slot-reel';
  const symbol=document.createElement('span');symbol.className='boost-slot-symbol';cell.append(symbol);
  reels.append(cell);return {cell,symbol,strip,index:0};
 });
 const paint=(reel,type)=>{
  reel.symbol.textContent='⚽';
  reel.cell.style.setProperty('--boost-color',TYPES[type].color);
  reel.cell.setAttribute('aria-label',TYPES[type].label);
 };
 cells.forEach(reel=>paint(reel,reel.strip[0]));
 const button=document.createElement('button');button.type='button';
 button.textContent=enabled?'STOP':'STOP（開発中）';button.disabled=!enabled;
 const apply=type=>{
  if(!Object.hasOwn(TYPES,type))throw new TypeError('Unknown BOOST type');
  cells.forEach(reel=>paint(reel,type));
  return TYPES[type];
 };
 let running=false;
 button.addEventListener('click',async()=>{
  if(running||!enabled||typeof spin!=='function')return;
  running=true;button.disabled=true;status.textContent='抽選中…';
  const timers=cells.map((reel,i)=>setInterval(()=>{
   reel.index=(reel.index+1)%reel.strip.length;
   paint(reel,reel.strip[reel.index]);
  },55+i*8));
  try{
   const result=await spin();
   if(result?.allFull===true){
    timers.forEach(clearInterval);
    status.textContent='すべて2個所持中です。BOOST使用後に再挑戦できます。';
    return;
   }
   if(!result||!Object.hasOwn(TYPES,result.boost)||!Array.isArray(result.reels)||result.reels.length!==3||!result.reels.every(v=>v===result.boost))throw new Error('Invalid slot result');
   for(let i=0;i<cells.length;i++){
    await wait(520+i*180);
    clearInterval(timers[i]);
    paint(cells[i],result.boost);
    cells[i].cell.classList.add('is-stopped');
   }
   const item=TYPES[result.boost];
   status.textContent=result.replayed?'本日は抽選済み：'+item.label:result.boost==='miss'?'残念！ '+item.detail:'当選！ '+item.label+' — '+item.detail;
   button.dataset.completed='true';button.textContent='抽選済み';
  }catch{
   status.textContent='抽選を確認できませんでした。時間をおいて再試行してください。';
  }finally{
   timers.forEach(clearInterval);running=false;
   if(button.dataset.completed!=='true')button.disabled=false;
  }
 });
 root.append(heading,reels,button,status);
 return Object.freeze({apply,setStatus:value=>{status.textContent=String(value);}});
}
