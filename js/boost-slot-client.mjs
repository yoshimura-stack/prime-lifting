// Isolated staging browser client. Never store preview bearer tokens.
import {createSlotPreview} from './boost-slot-preview.mjs';
const root=document.getElementById('slot');
const form=document.getElementById('preview-auth');
const tokenInput=document.getElementById('preview-token');
const connectButton=document.getElementById('preview-connect');
const SLOT_BROWSER_ENABLED=false;
let token='';
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
form?.addEventListener('submit',event=>{
 event.preventDefault();
 if(!SLOT_BROWSER_ENABLED)return;
 token=tokenInput.value.trim();
 tokenInput.value='';
 if(!token){view.setStatus('検証トークンを入力してください。');return;}
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
