// PRIME BOOST staging slot visualization only. No DB or game integration.
// Load on a dedicated preview page; it intentionally has no live RPC credentials.
const TYPES=Object.freeze({
 time:{label:'+5 SEC',color:'#3B82F6',detail:'プレイ時間 +5秒'},
 score:{label:'SCORE BOOST',color:'#FACC15',detail:'得点倍率 +0.1'},
 sc:{label:'SECOND CHANCE',color:'#22C55E',detail:'最初の落球を救済'}
});
export function createSlotPreview(root,{spin,enabled=false}={}){
 if(!root||typeof root.append!=='function')throw new TypeError('Root element required');
 root.replaceChildren();
 const heading=document.createElement('h2');heading.textContent='⚽ DAILY SLOT — STAGING';
 const status=document.createElement('p');status.setAttribute('role','status');
 status.textContent=enabled?'検証用スロット（本番報酬には反映されません）':'🔒 開発プレビュー：抽選・付与は無効';
 const reels=document.createElement('div');reels.className='boost-slot-reels';
 const cells=Array.from({length:3},()=>{
  const cell=document.createElement('div');cell.className='boost-slot-reel';cell.textContent='⚽';
  reels.append(cell);return cell;
 });
 const button=document.createElement('button');button.type='button';button.textContent=enabled?'SPIN':'SPIN（開発中）';button.disabled=!enabled;
 const apply=(type)=>{
  if(!Object.hasOwn(TYPES,type))throw new TypeError('Unknown BOOST type');
  const item=TYPES[type];
  for(const cell of cells){cell.style.setProperty('--boost-color',item.color);cell.textContent='⚽';cell.setAttribute('aria-label',item.label);}
  return item;
 };
 button.addEventListener('click',async()=>{
  if(!enabled||typeof spin!=='function')return;
  button.disabled=true;status.textContent='抽選を確認中…';
  try{
   const result=await spin();
   if(result?.allFull===true){status.textContent='すべて2個所持中です。BOOST使用後に再挑戦できます。';return;}
   if(!result||!Object.hasOwn(TYPES,result.boost)||!Array.isArray(result.reels)||result.reels.length!==3||!result.reels.every(v=>v===result.boost))throw new Error('Invalid slot result');
   const item=apply(result.boost);
   status.textContent=result.replayed?'本日は抽選済み：'+item.label:'当選！ '+item.label+' — '+item.detail;
  }catch{status.textContent='抽選を確認できませんでした。時間をおいて再試行してください。';}
  finally{button.disabled=false;}
 });
 root.append(heading,status,reels,button);
 return Object.freeze({apply,setStatus:text=>{status.textContent=String(text);}});
}
