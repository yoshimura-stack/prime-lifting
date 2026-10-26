// Isolated staging browser client. Never store preview bearer tokens.
import {createSlotPreview} from './boost-slot-preview.mjs';
const root=document.getElementById('slot');
const form=document.getElementById('preview-auth');
const tokenInput=document.getElementById('preview-token');
const connectButton=document.getElementById('preview-connect');
const SLOT_BROWSER_ENABLED=false;
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
  return response.json();
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
