(function(){
'use strict';
const $=id=>document.getElementById(id);
let player=null,ticket=null,pending=null,generation=0,saving=false,authBusy=false;
async function api(path,body){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store',credentials:'same-origin'});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'接続できませんでした。');return data;
 }catch(e){throw new Error(e.name==='AbortError'?'接続がタイムアウトしました。再試行できます。':e instanceof SyntaxError?'ランキングAPIが利用できません。':e.message==='Failed to fetch'?'通信できません。再試行してください。':e.message);}finally{clearTimeout(timer);}
}
function account(){
 $('account-status').textContent=player?`${player.name} ／ BEST ${player.best.toLocaleString()} PTS`:'ゲストプレイ（保存なし）';
 $('account-form').hidden=!!player;$('logout').hidden=!player;
}
function champion(entry){
 $('leader-best-score').textContent=entry?entry.score.toLocaleString()+' PTS':'--- PTS';
 $('leader-best-name').textContent=entry?entry.name:'最高記録：未取得';
 $('mobile-best').textContent=entry?`🏆 ${entry.score.toLocaleString()} PTS · ${entry.name}`:'最高記録：未取得';
}
let refreshGeneration=0;
const rankDialog=$('ranking-dialog');
const rankOpen=$('view-ranking');
const rankClose=$('close-ranking');
let rankDialogGeneration=0,previousFocus=null;
function closeRankDialog(){
 if(rankDialog.hidden)return;
 rankDialog.hidden=true;rankDialogGeneration++;
 (previousFocus?.isConnected?previousFocus:rankOpen).focus();
}
async function showRankDialog(){
 previousFocus=document.activeElement;
 rankDialog.hidden=false;rankClose.focus();
 await updateRankDialog();
}
async function updateRankDialog(){
 const current=++rankDialogGeneration;
 $('ranking-dialog-status').textContent='ランキングを取得中…';
 try{
  const data=await api('/api/leaderboard');
  if(current!==rankDialogGeneration||rankDialog.hidden)return;
  const list=$('ranking-dialog-list');list.replaceChildren();
  for(const e of data.entries){
   const li=document.createElement('li'),name=document.createElement('span'),score=document.createElement('strong');
   name.textContent=`${e.rank}. ${e.name}`;score.textContent=e.score.toLocaleString()+' PTS';
   li.append(name,score);list.append(li);
  }
  $('ranking-dialog-status').textContent=data.entries.length?'': 'まだ記録がありません。';
  champion(data.entries[0]);
 }catch(e){
  if(current!==rankDialogGeneration||rankDialog.hidden)return;
  $('ranking-dialog-status').textContent=e.message;
 }
}
rankOpen.addEventListener('click',showRankDialog);
rankClose.addEventListener('click',closeRankDialog);
$('ranking-dialog-refresh').addEventListener('click',updateRankDialog);
rankDialog.addEventListener('click',e=>{if(e.target===rankDialog)closeRankDialog();});
document.addEventListener('keydown',e=>{
 if(rankDialog.hidden)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeRankDialog();}
 if(e.key==='Tab'){
  const controls=[rankClose,$('ranking-dialog-refresh')];
  if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls[1].focus();}
  else if(!e.shiftKey&&document.activeElement===controls[1]){e.preventDefault();controls[0].focus();}
 }
},true);

async function refresh(){
 const current=++refreshGeneration;$('rank-message').textContent='ランキングを取得中…';
 try{const data=await api('/api/leaderboard');if(current!==refreshGeneration)return;
 $('rank-rows').replaceChildren();
 for(const e of data.entries){const li=document.createElement('li'),name=document.createElement('span'),score=document.createElement('strong');name.textContent=`${e.rank}. ${e.name}`;score.textContent=e.score.toLocaleString()+' PTS';li.append(name,score);$('rank-rows').append(li);}
 champion(data.entries[0]);$('rank-message').textContent=data.entries.length?'':'まだ記録がありません。';
 }catch(e){if(current!==refreshGeneration)return;champion(null);$('rank-rows').replaceChildren();$('rank-message').textContent=e.message;}
}
async function save(){
 if(!pending||saving)return;const submission=pending,current=generation;saving=true;
 $('save-retry').hidden=true;$('save-feedback').textContent='プレイを確認して保存しています…';
 try{const data=await api('/api/scores',submission);
 if(current!==generation)return;player=data.player;pending=null;account();
 $('personal-result').textContent=`今回 ${data.score.toLocaleString()} PTS ／ BEST ${player.best.toLocaleString()} PTS ／ 全体 ${player.rank??'—'}位`;
 $('record-banner').textContent=data.newChampion?'NEW CHAMPION!':data.personalBest?'NEW RECORD!':'';
 $('save-feedback').textContent='記録を保存しました。';await refresh();
 }catch(e){if(current!==generation)return;$('save-feedback').textContent=e.message;$('save-retry').hidden=false;}
 finally{saving=false;if(current!==generation&&pending)save();}
}
window.PRIME_RANKING={
 async begin(standard){
  const current=++generation;ticket=null;pending=null;$('result-ranking').hidden=true;$('account-panel').hidden=false;
  if(!standard||!player)return;
  try{const data=await api('/api/game/start',{});if(current===generation)ticket=data;}catch{}
 },
 finish(result,events,standard){
  $('result-ranking').hidden=false;$('record-banner').textContent='';$('save-retry').hidden=true;
  $('personal-result').textContent=`今回 ${result.score.toLocaleString()} PTS ／ BEST ${player?player.best.toLocaleString():'—'} PTS ／ 全体 ${player?.rank??'—'}位`;
  refresh();
  if(standard&&ticket&&player){pending={...ticket,events:structuredClone(events),kit:result.kit,device:result.device};save();}
  else $('save-feedback').textContent=!standard?'調整設定でのプレイはランキング対象外です。':!player?'ログインすると次のプレイから記録を保存できます。':'オンライン記録を開始できなかったため、今回は保存できません。';
 },refresh
};
$('account-form').onsubmit=async e=>{
 e.preventDefault();if(authBusy)return;authBusy=true;$('account-status').textContent='確認しています…';
 const pin=$('player-pin').value;$('player-pin').value='';
 try{const data=await api('/api/'+(e.submitter?.value==='register'?'register':'login'),{name:$('player-name').value,pin});player=data.player;account();}
 catch(error){$('account-status').textContent=error.message;}finally{authBusy=false;}
};
$('logout').onclick=async()=>{try{await api('/api/logout',{});generation++;player=null;ticket=null;pending=null;account();}catch(e){$('account-status').textContent=e.message;}};
$('save-retry').onclick=save;$('rank-refresh').onclick=refresh;
api('/api/me').then(data=>{if(!authBusy&&!player){player=data.player;account();}}).catch(()=>{});
refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
setInterval(()=>{if(!document.hidden)refresh();},60000);
})();
