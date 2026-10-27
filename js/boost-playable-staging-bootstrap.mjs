// Staging-only playable-game bootstrap. Loaded BEFORE game.js via module entry.
import {createBoostStagingHttpClient} from './boost-staging-http-client.mjs';
const types=[null,'time','score','sc'];
let token='',client=null,inventory=null,selected=null,busy=false;
const status=document.createElement('p');status.setAttribute('role','status');status.textContent='STAGING: 接続してください';
const form=document.createElement('form');
form.setAttribute('aria-label','STAGING検証接続');
const input=document.createElement('input');input.type='password';input.autocomplete='off';input.placeholder='検証PIN（6〜12桁）';
const connect=document.createElement('button');connect.type='submit';connect.textContent='STAGING接続';
const choices=document.createElement('div');
choices.style.cssText='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:7px';
const note=document.createElement('p');note.textContent='隔離ステージング検証専用。実ランキングには保存されません。';
form.append(status,choices,input,connect,note);
form.style.cssText='position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:20;width:max-content;max-width:calc(100% - 20px);padding:7px 12px;background:#123049;color:white;border:2px solid #65c9ed;border-radius:12px;box-shadow:0 4px 20px #0007;font-size:12px';
const overlay=document.getElementById('overlay');overlay?.prepend(form);
render();
const loginGrant=async(path)=>{
 const res=await fetch(path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:'{}',credentials:'omit',cache:'no-store'});
 if(!res.ok)throw new Error('BOOST login grant HTTP '+res.status);
 return res.json();
};
const refresh=async()=>{
 const res=await fetch('/api/boost-preview/inventory',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:'{}',credentials:'omit',cache:'no-store'});
 if(!res.ok)throw new Error('Inventory HTTP '+res.status);
 const value=await res.json();
 for(const type of ['time','score','sc'])if(!Number.isInteger(value?.[type])||value[type]<0||value[type]>2)throw new Error('Invalid inventory');
 return value;
};
function render(){
 choices.replaceChildren();
 for(const [i,kind] of types.entries()){
  const button=document.createElement('button');button.type='button';
  const names=['NORMAL','+5 SEC','SCORE ×1.1','2ND CHANCE'];
  const colors=['#f4f7fa','#46bbff','#ffdc42','#50e895'];
  const ball=document.createElement('span');ball.textContent='⚽';ball.style.cssText='display:block;font-size:35px;line-height:1.1;color:'+colors[i];
  const name=document.createElement('span');name.textContent=names[i];name.style.cssText='display:block;font-size:10px;font-weight:900;margin-top:4px';
  button.append(ball,name);
  if(kind){const count=document.createElement('span');count.textContent=inventory?String(inventory[kind]):'–';count.style.cssText='position:absolute;right:4px;top:3px;border-radius:12px;background:#dfff76;color:#112b34;padding:1px 5px;font-weight:900';button.append(count);}
  button.style.cssText='position:relative;padding:7px 5px;min-width:72px;border-radius:9px;background:#18354b;color:white;'+(selected===kind?'border:2px solid #dfff76':'border:1px solid #456475');
  button.disabled=busy||!inventory||!!client?.activeRun||(kind!==null&&inventory[kind]===0);
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
  if(!/^\d{6,12}$/.test(candidate))throw new Error('6〜12桁の検証PINを入力してください');
  const login=await fetch('/api/boost-preview/tester-login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pin:candidate}),credentials:'omit',cache:'no-store'});
  if(!login.ok)throw new Error(login.status===503?'検証WorkerのPIN設定が未完了です（管理者に確認）':login.status===429?'接続回数が多すぎます。時間をおいて再試行してください':login.status===401?'検証PINが一致しません':'検証ログイン失敗（HTTP '+login.status+'）');
  const session=await login.json();
  if(typeof session?.token!=='string'||session.token.length<32)throw new Error('検証セッション取得失敗');
  token=session.token;
  // Welcome gift first, then JST daily login award. Read stock only after both.
  // Fail closed: never offer a BOOST from a stale inventory snapshot.
  const welcome=await loginGrant('/api/boost-preview/welcome-grant');
  if(typeof welcome?.alreadyGranted!=='boolean')throw new Error('Invalid welcome receipt');
  const daily=await loginGrant('/api/boost-preview/daily-login-grant');
  if(typeof daily?.day!=='string'||typeof daily.replayed!=='boolean')throw new Error('Invalid daily receipt');
  inventory=await refresh();
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
   // START is the authoritative reservation point. Reflect the confirmed
   // deduction immediately; FINISH will reconcile against server inventory.
   if(run.boost&&inventory)inventory={...inventory,[run.boost]:Math.max(0,inventory[run.boost]-1)};
   status.textContent='STAGING RUN '+run.runId+' / '+run.durationSeconds+'秒';
   return run;
  }finally{busy=false;render();}
 },
 async finish(payload){
  if(!client)throw new Error('STAGING authentication required');
  const result=await client.finish(payload);
  // Refresh server-authoritative stock after a completed play. If it fails,
  // block another START rather than using stale inventory or consuming twice.
  inventory=null;
  selected=null;
  try{
   inventory=await refresh();
   status.textContent='STAGING検証済み '+result.playScore+' PTS。在庫更新済み。次のプレイを選択できます。';
  }catch{
   status.textContent='STAGING検証済み '+result.playScore+' PTS。在庫再取得に失敗。再接続してください。';
  }
  render();
  return result;
 }
});
window.PRIME_STAGING_RUN_FLOW=bridge;
addEventListener('pagehide',()=>{token='';});
const script=document.createElement('script');script.src='./game.js';document.body.append(script);
