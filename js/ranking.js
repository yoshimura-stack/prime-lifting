(function(){
'use strict';
const $=id=>document.getElementById(id);
let player=null,ticket=null,pending=null,generation=0,saving=false,authBusy=false,progressGeneration=0;
let cumulativeEarned=new Set(),progressOwner=null;
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
function renderProgress(progress){
 if(!player||!progress){cumulativeEarned=new Set();progressOwner=null;}
 else {cumulativeEarned=new Set(Array.isArray(progress.earned)?progress.earned:[]);progressOwner=player.id;}
 if(typeof renderLive==='function')renderLive(lastLiveStats,false);
 window.dispatchEvent(new CustomEvent('prime:progress',{detail:{master:!!(player&&progress&&progress.master),earned:[...cumulativeEarned]}}));
 let el=$('master-progress');
 if(!el){const guide=document.querySelector('.title-guide-copy');if(!guide)return;el=document.createElement('p');el.id='master-progress';el.className='master-progress';el.setAttribute('aria-live','polite');guide.after(el);}

 if(!player){el.textContent='ログインすると累計称号を確認できます';return;}
 if(!progress){el.textContent='累計称号：取得できませんでした';return;}
 const count=progress.earned?.length??0;
 el.textContent=progress.master?'💠 LIFTING MASTER 解放！':`累計称号 ${count}/8 ／ 💠 LIFTING MASTERまであと${8-count}`;
 el.classList.toggle('master-unlocked',!!progress.master);
 if(progress.master&&!el.dataset.announced){el.dataset.announced='true';el.classList.add('master-celebrate');setTimeout(()=>el.classList.remove('master-celebrate'),3500);}
 if(!progress.master)delete el.dataset.announced;
}
async function refreshProgress(){
 const current=++progressGeneration;
 if(!player){renderProgress(null);return;}
 try{const data=await api('/api/achievements');if(current===progressGeneration&&player)renderProgress(data.progress);}
 catch{if(current===progressGeneration)renderProgress(null);}
}
function deviceIcon(device){
 if(device!=='pc'&&device!=='mobile')return null;
 const badge=document.createElement('span');badge.className='rank-device rank-device-'+device;
 badge.setAttribute('role','img');badge.setAttribute('aria-label',device==='mobile'?'スマートフォンでの最高記録':'PCでの最高記録');
 badge.title=device==='mobile'?'スマートフォンでの最高記録':'PCでの最高記録';
 // Inline SVG: no external icon library or network request.
 badge.innerHTML=device==='mobile'?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path d="M10 18.5h4"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="3.5" width="19" height="13" rx="1.6"/><path d="M8 20.5h8M12 16.5v4"/></svg>';
 return badge;
}
function rankName(entry,prefix=''){
 const name=document.createElement('span');name.className='rank-player-name';
 const label=document.createElement('span');label.textContent=prefix+entry.name;name.append(label);
 const badge=deviceIcon(entry.device);if(badge)name.append(badge);
 if(Number.isInteger(entry.achievementCount)){
  const progress=document.createElement('span');
  progress.className='rank-title-count'+(entry.master?' platinum':'');
  progress.textContent=(entry.master?'💠 ':'🏅 ')+entry.achievementCount+'/8';
  progress.title=entry.master?'LIFTING MASTER：全8称号獲得':'累計獲得称号 '+entry.achievementCount+'/8';
  progress.setAttribute('aria-label',progress.title);
  name.append(progress);
 }
 return name;
}
function renderNextRival(entries,sectionId,nameId,gapId){
 const section=$(sectionId);section.hidden=true;
 if(!player||!Array.isArray(entries)||!entries.length)return;
 const self=entries.findIndex(e=>e.name===player.name);
 if(self<0)return;
 if(self===0){$(nameId).textContent='現在のチャンピオン！';$(gapId).textContent='1位をキープしよう！';section.hidden=false;return;}
 const rival=entries[self-1];
 const gap=Math.max(1,rival.score-player.best+1);
 $(nameId).textContent=`${rival.rank}位 ${rival.name} ／ ${rival.score.toLocaleString()} PTS`;
 $(gapId).textContent=`逆転まであと ${gap.toLocaleString()} PTS`;
 section.hidden=false;
}
async function updateResultRival(){
 try{const data=await api('/api/leaderboard/all');renderNextRival(data.entries,'result-next-rival','result-next-rival-name','result-next-rival-gap');}
 catch{$('result-next-rival').hidden=true;}
}
function champion(entries){
 const [first,second,third]=entries||[];
 $('leader-best-score').textContent=first?first.score.toLocaleString()+' PTS':'--- PTS';
 $('leader-best-name').replaceChildren(...(first?[rankName(first)]:[document.createTextNode('未登録')]));
 for(const [position,entry] of [['second',second],['third',third]]){
  $('leader-'+position+'-score').textContent=entry?entry.score.toLocaleString()+' PTS':'--- PTS';
  $('leader-'+position+'-name').replaceChildren(...(entry?[rankName(entry)]:[document.createTextNode('未登録')]));
 }
 $('mobile-best').textContent=first?`🏆 ${first.score.toLocaleString()} PTS · ${first.name}`:'最高記録：未取得';
}
let refreshGeneration=0;
const rankDialog=$('ranking-dialog');
const rankOpen=$('view-ranking');
const rankClose=$('close-ranking');
let rankDialogGeneration=0,previousFocus=null;
const jumpSelf=$('ranking-jump-self');
let selfRankRow=null;
function jumpToSelf(){if(selfRankRow?.isConnected)selfRankRow.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});}
jumpSelf.addEventListener('click',jumpToSelf);
function closeRankDialog(){
 if(rankDialog.hidden)return;
 rankDialog.hidden=true;rankDialogGeneration++;selfRankRow=null;jumpSelf.hidden=true;$('next-rival').hidden=true;
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
  const data=await api('/api/leaderboard/all');
  if(current!==rankDialogGeneration||rankDialog.hidden)return;
  const list=$('ranking-dialog-list');list.replaceChildren();selfRankRow=null;jumpSelf.hidden=true;
  for(const e of data.entries){
   const li=document.createElement('li'),score=document.createElement('strong');score.textContent=e.score.toLocaleString()+' PTS';
   li.append(rankName(e,`${e.rank}. `),score);
   if(player&&e.name===player.name){li.classList.add('rank-self');li.setAttribute('aria-current','true');selfRankRow=li;}
   list.append(li);
  }
  $('ranking-dialog-status').textContent=data.entries.length?`${data.entries.length}人のランキングを表示中（上下にスクロールできます）`:'まだ記録がありません。';
  jumpSelf.hidden=!selfRankRow;
  renderNextRival(data.entries,'next-rival','next-rival-name','next-rival-gap');
  champion(data.entries);
 }catch(e){
  if(current!==rankDialogGeneration||rankDialog.hidden)return;
  $('ranking-dialog-status').textContent=e.message;
 }
}
rankOpen.addEventListener('click',showRankDialog);
for(const id of ['mobile-intro-ranking','mobile-result-ranking'])$(id)?.addEventListener('click',showRankDialog);
rankClose.addEventListener('click',closeRankDialog);
$('ranking-dialog-refresh').addEventListener('click',updateRankDialog);
rankDialog.addEventListener('click',e=>{if(e.target===rankDialog)closeRankDialog();});
document.addEventListener('keydown',e=>{
 if(rankDialog.hidden)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeRankDialog();}
 if(e.key==='Tab'){
  const controls=[rankClose,...(jumpSelf.hidden?[]:[jumpSelf]),$('ranking-dialog-refresh')];
  if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls[controls.length-1].focus();}
  else if(!e.shiftKey&&document.activeElement===controls[controls.length-1]){e.preventDefault();controls[0].focus();}
 }
},true);

async function refresh(){
 const current=++refreshGeneration;$('rank-message').textContent='ランキングを取得中…';
 try{const data=await api('/api/leaderboard');if(current!==refreshGeneration)return;
 $('rank-rows').replaceChildren();
 for(const e of data.entries){const li=document.createElement('li'),score=document.createElement('strong');score.textContent=e.score.toLocaleString()+' PTS';li.append(rankName(e,`${e.rank}. `),score);$('rank-rows').append(li);}
 champion(data.entries);$('rank-message').textContent=data.entries.length?'':'まだ記録がありません。';
 }catch(e){if(current!==refreshGeneration)return;champion([]);$('rank-rows').replaceChildren();$('rank-message').textContent=e.message;}
}
async function save(){
 if(!pending||saving)return;const submission=pending,current=generation;saving=true;
 $('save-retry').hidden=true;$('save-feedback').textContent='プレイを確認して保存しています…';
 try{const data=await api('/api/scores',submission);
 if(current!==generation)return;player=data.player;pending=null;account();
 $('personal-result').textContent=`今回 ${data.score.toLocaleString()} PTS ／ BEST ${player.best.toLocaleString()} PTS ／ 全体 ${player.rank??'—'}位`;
 $('record-banner').textContent=data.newChampion?'NEW CHAMPION!':data.personalBest?'NEW PERSONAL BEST!':'';$('record-banner').classList.toggle('record-celebrate',!!(data.personalBest||data.newChampion));
 $('save-feedback').textContent='記録を保存しました。';if(data.progress){progressGeneration++;renderProgress(data.progress);}else refreshProgress();await refresh();await updateResultRival();
 }catch(e){if(current!==generation)return;$('save-feedback').textContent=e.message;$('save-retry').hidden=false;}
 finally{saving=false;if(current!==generation&&pending)save();}
}
const achievementDefinitions=[
{name:'30 KEEPS CLUB',icon:'🏆',earned:s=>s.bestCombo>=30},
{name:'AIR MASTER',icon:'🪽',earned:s=>s.maxAirStreak>=3},
{name:'SPIN KING',icon:'🌀',earned:s=>s.spinKing},
{name:'SHOULDER ACE',icon:'💎',earned:s=>s.shoulderHits>=3},
{name:'SCORE HUNTER',icon:'🎯',earned:s=>s.score>=50000},
{name:'QUAD MASTER',icon:'👑',earned:s=>s.quadMaster},
{name:'AIR QUAD',icon:'🌌',legendary:true,earned:s=>s.airQuad},
{name:'DOUBLE AIR',icon:'⚡',legendary:true,earned:s=>s.doubleAir}
];
const titleDescriptions={
'30 KEEPS CLUB':'30回連続でボールタッチ成功',
'AIR MASTER':'空中ボールタッチを3回連続成功',
'SPIN KING':'次のボールタッチまでに3回転して成功',
'SHOULDER ACE':'1プレイ中に肩でボールタッチを3回成功（連続不要）',
'SCORE HUNTER':'1プレイで50,000 PTS達成',
'QUAD MASTER':'次のボールタッチまでに4回転して成功',
'AIR QUAD':'ジャンプ1回＋4回転後にボールタッチ成功',
'DOUBLE AIR':'2回連続ジャンプ後にボールタッチ成功'
};
function initTitleGuide(){
 const dialog=document.getElementById('title-guide-dialog'),list=document.getElementById('title-guide-list'),open=document.getElementById('title-guide-open'),close=document.getElementById('title-guide-close');
 for(const a of achievementDefinitions){const row=document.createElement('div');row.className='title-guide-row'+(a.legendary?' legendary':'');
 const icon=document.createElement('span');icon.className='title-guide-icon';icon.textContent=a.icon;
 const info=document.createElement('div');const title=document.createElement('strong');title.textContent=a.name;const desc=document.createElement('p');desc.textContent=titleDescriptions[a.name];info.append(title,desc);
 if(a.legendary){const tag=document.createElement('span');tag.className='title-guide-legend';tag.textContent='LEGENDARY';info.append(tag);}
 row.append(icon,info);list.append(row);}
 let returnFocus=null;
 open.addEventListener('click',()=>{returnFocus=document.activeElement;dialog.hidden=false;close.focus();});
 const dismiss=()=>{dialog.hidden=true;if(returnFocus&&returnFocus.focus)returnFocus.focus();};
 close.addEventListener('click',dismiss);
 dialog.addEventListener('click',e=>{if(e.target===dialog)dismiss();});
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dismiss();}else if(e.key==='Tab'){e.preventDefault();close.focus();}});
}
initTitleGuide();
const unlocked=new Set();let unlockTimer;
const emptyLiveStats=()=>({score:0,bestCombo:0,maxAirStreak:0,shoulderHits:0});
let lastLiveStats=emptyLiveStats();
function renderLive(stats,animate=true){
 lastLiveStats=stats;
 const persistent=player&&progressOwner===player.id?cumulativeEarned:new Set();
 const list=document.getElementById('achievement-live-list');if(!list)return;
 const fresh=achievementDefinitions.filter(a=>a.earned(stats)&&!unlocked.has(a.name)&&!persistent.has(a.name));
 for(const a of achievementDefinitions)if(a.earned(stats))unlocked.add(a.name);
 list.replaceChildren();
 for(const a of achievementDefinitions){const row=document.createElement('div');row.className='achievement-live-row'+((unlocked.has(a.name)||persistent.has(a.name))?' earned':'')+(a.legendary?' legendary':'');const icon=document.createElement('span');icon.className='achievement-live-icon';icon.textContent=a.icon;const label=document.createElement('span');label.textContent=a.name;row.append(icon,label);list.append(row);}
 document.getElementById('achievement-count').textContent=new Set([...unlocked,...persistent]).size+'/8';
 if(animate&&fresh.length){const a=fresh[fresh.length-1],toast=document.getElementById('achievement-unlock');toast.textContent=(a.legendary?'✦ LEGENDARY UNLOCK! ✦ ':'✦ UNLOCK! ✦ ')+a.name;toast.className='achievement-unlock show'+(a.legendary?' legendary':'');clearTimeout(unlockTimer);unlockTimer=setTimeout(()=>toast.className='achievement-unlock',1500);}
}
function resetAchievements(){unlocked.clear();lastLiveStats=emptyLiveStats();clearTimeout(unlockTimer);const toast=document.getElementById('achievement-unlock');toast.className='achievement-unlock';toast.textContent='';renderLive(lastLiveStats,false);document.getElementById('achievement-panel').hidden=true;document.getElementById('achievement-badges').replaceChildren();}
function showAchievements(stats){
 const panel=$('achievement-panel'),badges=$('achievement-badges');badges.replaceChildren();
 const earned=achievementDefinitions.filter(b=>b.earned(stats));
 for(const badge of earned){const el=document.createElement('span');el.className='achievement-badge'+(badge.legendary?' legendary':'');el.textContent=`${badge.icon} ${badge.name}`;badges.append(el);}
 panel.hidden=false;if(!earned.length){const el=document.createElement('span');el.textContent='今回は未獲得。次のプレイで挑戦！';badges.append(el);}
}
let preflightFailures=0,preflightBusy=false;
const preflightStatus=$('preflight-status'),preflightRetry=$('preflight-retry'),preflightContact=$('preflight-contact');
function preflightMessage(message){preflightStatus.textContent=message;}
function preflightReset(){preflightFailures=0;preflightRetry.hidden=true;preflightContact.hidden=true;preflightMessage('');}
async function preflight(){
 if(preflightBusy)return false;
 if(!player){preflightReset();return true;} // Explicit guest mode, no ranking.
 preflightBusy=true;$('start').disabled=true;preflightMessage('ランキング通信を確認中…');
 try{
  const currentPlayer=player?.id;
  const data=await api('/api/game/start',{});
  if(!data.token||!data.ruleset||player?.id!==currentPlayer)throw new Error('ランキング登録の準備に失敗しました。');
  ticket=data;preflightReset();preflightMessage('通信OK：ランキング登録の準備ができました。');return true;
 }catch(e){
  ticket=null;preflightFailures++;preflightMessage('通信エラー：'+e.message);
  preflightRetry.hidden=false;preflightContact.hidden=preflightFailures<3;if(preflightFailures>=3)preflightMessage('通信エラーが続いています。運営担当者に直接お問い合わせください。 '+e.message);return false;
 }finally{preflightBusy=false;$('start').disabled=false;}
}
preflightRetry.onclick=()=>{$('start').click();};
window.PRIME_RANKING={
 achievements(stats){renderLive(stats,false);showAchievements(stats);},resetAchievements,updateAchievements(stats){renderLive(stats,true);},preflight,
 async begin(standard){
  ++generation;pending=null;$('achievement-panel').hidden=true;$('achievement-badges').replaceChildren();$('result-ranking').hidden=true;$('account-panel').hidden=false;
  if(!standard||!player){ticket=null;return;}
  // Ticket was acquired and validated before gameplay began.
 },
 finish(result,events,standard){
  $('result-ranking').hidden=false;$('result-next-rival').hidden=true;$('record-banner').textContent='';$('record-banner').classList.remove('record-celebrate');$('save-retry').hidden=true;
  $('personal-result').textContent=`今回 ${result.score.toLocaleString()} PTS ／ BEST ${player?player.best.toLocaleString():'—'} PTS ／ 全体 ${player?.rank??'—'}位`;
  refresh();
  if(standard&&ticket&&player){pending={...ticket,events:structuredClone(events),kit:result.kit,device:result.device};save();}
  else $('save-feedback').textContent=!standard?'調整設定でのプレイはランキング対象外です。':!player?'ログインすると次のプレイから記録を保存できます。':'オンライン記録を開始できなかったため、今回は保存できません。';
 },refresh
};
$('account-form').onsubmit=async e=>{
 e.preventDefault();if(authBusy)return;authBusy=true;$('account-status').textContent='確認しています…';
 const pin=$('player-pin').value;$('player-pin').value='';
 try{const data=await api('/api/'+(e.submitter?.value==='register'?'register':'login'),{name:$('player-name').value,pin});player=data.player;preflightReset();cumulativeEarned=new Set();progressOwner=null;account();renderLive(lastLiveStats,false);refreshProgress();}
 catch(error){$('account-status').textContent=error.message;}finally{authBusy=false;}
};
$('logout').onclick=async()=>{try{await api('/api/logout',{});generation++;player=null;ticket=null;pending=null;preflightReset();cumulativeEarned=new Set();progressOwner=null;account();renderLive(lastLiveStats,false);refreshProgress();}catch(e){$('account-status').textContent=e.message;}};
$('save-retry').onclick=save;$('rank-refresh').onclick=refresh;
api('/api/me').then(data=>{if(!authBusy&&!player){player=data.player;account();refreshProgress();}}).catch(()=>{});
renderProgress(null);refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
setInterval(()=>{if(!document.hidden)refresh();},60000);
})();
