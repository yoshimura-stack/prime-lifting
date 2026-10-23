// Staging-only playable-game bootstrap. Loaded BEFORE game.js via module entry.
import {createBoostStagingHttpClient} from './boost-staging-http-client.mjs';
const types=[null,'time','score','sc'];
let token='',client=null,inventory=null,selected=null,busy=false;
const status=document.createElement('p');status.setAttribute('role','status');status.textContent='STAGING: 接続してください';
const form=document.createElement('form');
form.setAttribute('aria-label','STAGING検証接続');
const input=document.createElement('input');input.type='password';input.autocomplete='off';input.placeholder='検証用Bearerトークン';
const connect=document.createElement('button');connect.type='submit';connect.textContent='STAGING接続';
const choices=document.createElement('div');
const note=document.createElement('p');note.textContent='隔離ステージング検証専用。実ランキングには保存されません。';
form.append(input,connect,note,status,choices);
form.style.cssText='padding:10px;background:#0c253e;color:white;border:2px solid #7fb8e5;position:relative;z-index:9999';
const overlay=document.getElementById('overlay');overlay?.prepend(form);
const refresh=async()=>{
 const res=await fetch('/api/boost-preview/inventory',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:'{}',credentials:'omit',cache:'no-store'});
 if(!res.ok)throw new Error('Inventory HTTP '+res.status);
 const value=await res.json();
 for(const type of ['time','score','sc'])if(!Number.isInteger(value?.[type])||value[type]<0||value[type]>2)throw new Error('Invalid inventory');
 return value;
};
function render(){
 choices.replaceChildren();
 if(!inventory)return;
 for(const [i,kind] of types.entries()){
  const button=document.createElement('button');button.type='button';
  button.textContent=['通常','⚽ +5 SEC','⚽ ×1.1','⚽ SC'][i]+(kind?' ('+inventory[kind]+'/2)':'');
  button.disabled=busy||!!client?.activeRun||(kind!==null&&inventory[kind]===0);
  button.setAttribute('aria-pressed',String(selected===kind));
  button.onclick=()=>{selected=kind;status.textContent='選択：'+button.textContent;render();};
  choices.append(button);
 }
}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(busy||client?.activeRun)return;
 busy=true;connect.disabled=true;
 const candidate=input.value.trim();input.value='';
 try{
  if(!candidate)throw new Error('Token required');
  token=candidate;inventory=await refresh();
  client=createBoostStagingHttpClient({origin:location.origin,getBearer:()=>token});
  selected=null;status.textContent='STAGING認証済み。BOOSTを選択してSTARTしてください。';
 }catch(error){token='';client=null;inventory=null;status.textContent='認証失敗：'+error.message;}
 finally{busy=false;connect.disabled=false;render();}
});
const bridge=Object.freeze({
 get activeRun(){return client?.activeRun??null;},
 select(kind){if(!types.includes(kind))throw new TypeError('Invalid BOOST');if(!inventory||kind&&inventory[kind]<1)throw new Error('BOOST unavailable');selected=kind;render();},
 async start(){
  if(!client||!inventory)throw new Error('STAGING authentication required');
  if(busy)throw new Error('STAGING request pending');
  busy=true;render();
  try{
   const run=await client.start(selected);
   status.textContent='STAGING RUN '+run.runId+' / '+run.durationSeconds+'秒';
   return run;
  }finally{busy=false;render();}
 },
 async finish(payload){
  if(!client)throw new Error('STAGING authentication required');
  const result=await client.finish(payload);
  inventory=null; // Inventory must be refreshed before any further start.
  status.textContent='STAGING検証済み '+result.playScore+' PTS。再接続して在庫を更新してください。';
  render();
  return result;
 }
});
window.PRIME_STAGING_RUN_FLOW=bridge;
addEventListener('pagehide',()=>{token='';});
const script=document.createElement('script');script.src='./game.js';document.body.append(script);
