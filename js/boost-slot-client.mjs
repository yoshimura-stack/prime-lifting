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
  const inventory=await readInventory();
  view.setStatus('検証接続：青 '+inventory.time+'/2 · 黄 '+inventory.score+'/2 · 緑 '+inventory.sc+'/2');
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
  return response.json();
 }});
});
window.addEventListener('pagehide',()=>{token='';});
