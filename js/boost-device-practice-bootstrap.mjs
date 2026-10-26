// Isolated device-only BOOST practice. No API calls, no account, no ranking.
// These locally simulated runs are never valid server-authorized scores.
const types=[null,'time','score','sc'];
let selected=null,active=null;
const form=document.createElement('section');
form.setAttribute('aria-label','BOOST実機操作テスト');
form.style.cssText='padding:10px;background:#123049;color:#fff;border:2px solid #65c9ed;position:relative;z-index:9999';
const heading=document.createElement('strong');heading.textContent='⚽ BOOST 操作テスト（保存なし・何度でも練習可）';
const message=document.createElement('p');message.textContent='選択後、通常のゲーム開始ボタンを押してください。スコアは一切送信されません。';
const choices=document.createElement('div');
form.append(heading,message,choices);
document.getElementById('overlay')?.prepend(form);
function render(){
 choices.replaceChildren();
 for(const [index,type] of types.entries()){
  const button=document.createElement('button');button.type='button';
  button.textContent=['通常60秒','青 +5 SEC','黄 SCORE +0.1','緑 SECOND CHANCE'][index];
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
