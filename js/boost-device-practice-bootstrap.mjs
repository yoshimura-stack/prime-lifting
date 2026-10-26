// Isolated device-only BOOST practice. No API calls, no account, no ranking.
// These locally simulated runs are never valid server-authorized scores.
const types=[null,'time','score','sc'];
let selected=null,active=null;
const form=document.createElement('section');
form.setAttribute('aria-label','BOOST実機操作テスト');
form.style.cssText='position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:20;width:max-content;max-width:calc(100% - 20px);padding:7px 12px;background:#123049;color:#fff;border:2px solid #65c9ed;border-radius:12px;box-shadow:0 4px 20px #0007;font-size:12px';
const heading=document.createElement('strong');heading.textContent='⚽ BOOST 操作テスト（保存なし・何度でも練習可）';
const message=document.createElement('p');message.textContent='選択後、通常のゲーム開始ボタンを押してください。スコアは一切送信されません。';
const choices=document.createElement('div');
choices.style.cssText='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:7px';
message.style.cssText='font-size:11px;margin:3px 0';
form.append(heading,message,choices);
document.getElementById('overlay')?.prepend(form);
function render(){
 choices.replaceChildren();
 for(const [index,type] of types.entries()){
  const button=document.createElement('button');button.type='button';
  const names=['NORMAL','+5 SEC','SCORE ×1.1','2ND CHANCE'];
  const colors=['#f4f7fa','#46bbff','#ffdc42','#50e895'];
  const ball=document.createElement('span');ball.textContent='⚽';
  ball.style.cssText='display:block;font-size:35px;line-height:1.1;color:'+colors[index]+';filter:drop-shadow(0 2px 5px '+colors[index]+'88)';
  const name=document.createElement('span');name.textContent=names[index];
  name.style.cssText='display:block;font-size:10px;font-weight:900;margin-top:4px';
  button.append(ball,name);
  button.setAttribute('aria-label',names[index]+' のボールを選択');
  button.style.cssText='padding:7px 5px;min-width:72px;border-radius:9px;transition:transform .15s,box-shadow .15s;'+(type===selected?'border:2px solid #dfff76;box-shadow:0 0 14px #dfff7688;transform:scale(1.06);background:#20434d':'border:1px solid #456475');
  button.disabled=!!active;button.setAttribute('aria-pressed',String(type===selected));
  button.onclick=()=>{selected=type;message.textContent=names[index]+' を選択しました';render();};
  choices.append(button);
 }
}
render();
window.PRIME_STAGING_RUN_FLOW=Object.freeze({
 get activeRun(){return active;},
 abandonForRestart(){active=null;message.textContent='前の練習プレイを終了しました。新しい練習を開始できます。';render();},
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
