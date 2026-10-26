// Isolated staging browser client. Never store preview bearer tokens.
import {createSlotPreview} from './boost-slot-preview.mjs';
const root=document.getElementById('slot');
const form=document.getElementById('preview-auth');
const tokenInput=document.getElementById('preview-token');
const connectButton=document.getElementById('preview-connect');
// Real API access stays locked until a verified staging login issues a short-lived token.
const SLOT_BROWSER_ENABLED=new URLSearchParams(location.search).get('operator')==='1' && new URLSearchParams(location.search).get('demo')!=='1';
if(SLOT_BROWSER_ENABLED){
 tokenInput.disabled=false;
 connectButton.disabled=false;
 form.setAttribute('aria-label','検証専用トークン接続');
 connectButton.textContent='検証アカウントに接続';
}
let token='';
async function readInventory(){
 if(!token)throw new Error('Not authenticated');
 const response=await fetch('/api/boost-preview/inventory',{
  method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},
  body:'{}',cache:'no-store',credentials:'omit'
 });
 if(!response.ok)throw new Error('Inventory unavailable: '+response.status);
 const value=await response.json();
 for(const type of ['time','score','sc']){
  if(!Number.isInteger(value?.[type])||value[type]<0||value[type]>2)throw new Error('Invalid inventory');
 }
 return Object.freeze({time:value.time,score:value.score,sc:value.sc});
}

async function requestWelcomeGrant(){
 if(!token)throw new Error('Not authenticated');
 const response=await fetch('/api/boost-preview/welcome-grant',{
  method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},
  body:'{}',cache:'no-store',credentials:'omit'
 });
 if(!response.ok)throw new Error('Welcome grant unavailable: '+response.status);
 const value=await response.json();
 if(typeof value?.alreadyGranted!=='boolean')throw new Error('Invalid welcome grant');
 for(const type of ['time','score','sc']){
  if(!Number.isInteger(value[type])||value[type]<0||value[type]>2)throw new Error('Invalid welcome inventory');
  if(!value.alreadyGranted&&(!Number.isInteger(value.granted?.[type])||value.granted[type]<0||value.granted[type]>1))throw new Error('Invalid welcome receipt');
 }
 return value;
}
function renderStock(inventory,grant){
 const stock='🔵 '+inventory.time+'/2 · 🟡 '+inventory.score+'/2 · 🟢 '+inventory.sc+'/2';
 const welcome=grant?.alreadyGranted===false?'🎁 初回BOOSTプレゼント付与！ ':'';
 return welcome+'所持数 '+stock;
}
const view=createSlotPreview(root,{
 enabled:false,
 spin:async()=>{
  if(!token)throw new Error('Not authenticated');
  const response=await fetch('/api/boost-preview/slot/spin',{
   method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},
   body:'{}',cache:'no-store',credentials:'omit'
  });
  if(!response.ok)throw new Error('Slot unavailable: '+response.status);
  const result=await response.json();
  return result;
 }
});
form?.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!SLOT_BROWSER_ENABLED)return;
 token=tokenInput.value.trim();
 tokenInput.value='';
 if(!token){view.setStatus('検証トークンを入力してください。');return;}
 try{
  // The welcome grant is server-atomic and only runs after verified staging login.
  const welcome=await requestWelcomeGrant();
  const inventory=await readInventory();
  view.setStatus(renderStock(inventory,welcome));
 }catch{
  token='';view.setStatus('認証または在庫確認に失敗しました。抽選は無効です。');return;
 }
 connectButton.textContent='接続済み（検証専用）';
 connectButton.disabled=true;
 const stock=document.getElementById('boost-slot-stock')||document.createElement('p');
 stock.id='boost-slot-stock';stock.textContent=renderStock(inventory,welcome);
 root.after(stock);
 createSlotPreview(root,{enabled:true,spin:async()=>{
  const response=await fetch('/api/boost-preview/slot/spin',{
   method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},
   body:'{}',cache:'no-store',credentials:'omit'
  });
  if(!response.ok)throw new Error('Slot unavailable: '+response.status);
  const result=await response.json();
  const updated=await readInventory();
  // Show authoritative post-spin stock without ever crediting a client-side guess.
  const stock=document.getElementById('boost-slot-stock')||document.createElement('p');
  stock.id='boost-slot-stock';stock.textContent=renderStock(updated);
  root.after(stock);
  return result;
 }});
});
window.addEventListener('pagehide',()=>{token='';});

/**
 * Isolated UI rehearsal only. No account, API, database, ranking or persistent
 * inventory is touched. Use ?demo=1 to rehearse the real slot animation today.
 */
if(new URLSearchParams(location.search).get('demo')==='1'){
 form?.remove();
 const banner=document.createElement('p');
 banner.id='boost-demo-notice';
 banner.textContent='🎮 体験モード：初回各1個付与・ルーレット演出をお試しできます（保存・本番反映なし）';
 root.before(banner);
 const stock=document.createElement('p');
 stock.id='boost-slot-stock';root.after(stock);
 const inventory={time:1,score:1,sc:1};
 stock.textContent='🎁 初回BOOST付与（体験） '+renderStock(inventory);
 let completed=false;
 const demoSpin=async()=>{
  if(completed)throw new Error('Demo spin already completed');
  completed=true;
  const eligible=['time','score','sc'].filter(type=>inventory[type]<2);
  if(!eligible.length)return {allFull:true};
  // Weighted draw matches staging contract: miss 40, each eligible BOOST 20.
  const total=40+eligible.length*20;
  const ticket=Math.random()*total;
  const boost=ticket<40?'miss':eligible[Math.min(eligible.length-1,Math.floor((ticket-40)/20))];
  if(boost!=='miss')inventory[boost]++;
  stock.textContent=renderStock(inventory)+'（体験データ）';
  return {boost,reels:[boost,boost,boost],replayed:false};
 };
 createSlotPreview(root,{enabled:true,spin:demoSpin});
 const replay=document.createElement('button');
 replay.type='button';replay.textContent='体験を最初からやり直す';
 replay.addEventListener('click',()=>location.reload());
 stock.after(replay);
}
