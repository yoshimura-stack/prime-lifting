// Isolated device-only BOOST practice. No API calls, no account, no ranking.
// These locally simulated runs are never valid server-authorized scores.
const types=[null,'time','score','sc'];
let selected=null,active=null;
const form=document.createElement('section');
form.setAttribute('aria-label','BOOST実機操作テスト');
form.style.cssText='position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:20;width:max-content;max-width:calc(100% - 20px);padding:7px 10px;background:#123049;color:#fff;border:2px solid #65c9ed;border-radius:8px;box-shadow:0 4px 20px #0007;font-size:12px';
const heading=document.createElement('strong');heading.textContent='⚽ BOOST 操作テスト（保存なし・何度でも練習可）';
const message=document.createElement('p');message.textContent='選択後、通常のゲーム開始ボタンを押してください。スコアは一切送信されません。';
const choices=document.createElement('div');
choices.style.cssText='display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-top:5px';
message.style.cssText='font-size:11px;margin:3px 0';
form.append(heading,message,choices);
document.getElementById('overlay')?.prepend(form);
function render(){
 choices.replaceChildren();
 for(const [index,type] of types.entries()){
  const button=document.createElement('button');button.type='button';
  button.textContent=['通常60秒','青 +5 SEC','黄 SCORE +0.1','緑 SECOND CHANCE'][index];
  button.style.cssText='padding:5px 7px;font-size:12px;white-space:nowrap';
  button.disabled=!!active;button.setAttribute('aria-pressed',String(type===selected));
  button.onclick=()=>{selected=type;message.textContent=button.textContent+' を選択しました';render();};
  choices.append(button);
 }
}
render();
window.PRIME_STAGING_RUN_FLOW=Object.freeze({
 get activeRun(){return active;},
 select(type){if(!types.includes(type)||active)throw new Error('Invalid practice selection');selected=type;render();},
 async start(){
  if(active)throw new Error('Practice run already active');
  active=Object.freeze({runId:'local-practice-only',token:'local-practice-not-authorized',boost:selected,durationSeconds:selected==='time'?65:60});
  message.textContent='練習プレイ中：'+(selected||'通常')+'（記録は保存されません）';render();return active;
 },
 async finish(){
  if(!active)throw new Error('No practice run');
  const result={runId:active.runId,boost:active.boost,playScore:0,replayed:false};
  active=null;message.textContent='練習終了。保存なし。BOOSTを切り替えて再プレイできます。';render();return result;
 }
});
const script=document.createElement('script');script.src='./game.js';document.body.append(script);
