(function(){
'use strict';
const $=id=>document.getElementById(id);
let player=null,ticket=null,pending=null,generation=0,saving=false,authBusy=false,progressGeneration=0;
let cumulativeEarned=new Set(),progressOwner=null,nextEarned=new Set();
async function api(path,body){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store',credentials:'same-origin'});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'接続できませんでした。');return data;
 }catch(e){throw new Error(e.name==='AbortError'?'接続がタイムアウトしました。再試行できます。':e instanceof SyntaxError?'ランキングAPIが利用できません。':e.message==='Failed to fetch'?'通信できません。再試行してください。':e.message);}finally{clearTimeout(timer);}
}
function account(){
 $('account-status').textContent=player?`${player.name} ／ BEST ${player.best.toLocaleString()} PTS`:'ゲストプレイ（保存なし）';
 $('account-form').hidden=!!player;$('logout').hidden=!player;
 window.dispatchEvent(new CustomEvent('prime:account-state',{detail:{loggedIn:!!player}}));
}
// BOOST selection is only available after the server explicitly advertises run readiness.
// Inventory alone is not sufficient: the server must support atomic reservation.
let boostSelection=null;
let boostReady=false;
const boostPanel=$('prime-boost-picker');
function hideBoostPicker(){
 boostReady=false;boostSelection=null;
 if(boostPanel)boostPanel.hidden=true;
}
function renderBoostPicker(inventory){
 if(!boostPanel)return;
 for(const button of boostPanel.querySelectorAll('[data-boost]')){
  const kind=button.dataset.boost;
  const count=Number.isInteger(inventory?.[kind])?Math.max(0,Math.min(2,inventory[kind])):0;
  button.disabled=!boostReady||count===0;
  button.querySelector('small').textContent='×'+count;
  button.setAttribute('aria-pressed',String(boostSelection===kind));
 }
 boostPanel.hidden=!boostReady||!player;
}
async function syncBoostPicker(){
 hideBoostPicker();
 if(!player)return;
 const id=player.id;
 try{
  const data=await api('/api/boost/inventory');
  if(player?.id!==id)return;
  // Future server activation must explicitly opt in after reservation is ready.
  boostReady=data?.selectionEnabled===true;
  renderBoostPicker(data.inventory);
 }catch{hideBoostPicker();}
}
if(boostPanel){
 boostPanel.addEventListener('click',event=>{
  const button=event.target.closest('button[data-boost]');
  if(!boostReady||!button||button.disabled)return;
  boostSelection=boostSelection===button.dataset.boost?null:button.dataset.boost;
  renderBoostPicker(Object.fromEntries([...boostPanel.querySelectorAll('button[data-boost]')].map(el=>[el.dataset.boost,Number(el.querySelector('small').textContent.slice(1))])));
 });
}
function renderProgress(progress){
 if(!player||!progress){cumulativeEarned=new Set();nextEarned=new Set();progressOwner=null;renderNextCollection();}
 else {cumulativeEarned=new Set(Array.isArray(progress.earned)?progress.earned:[]);progressOwner=player.id;nextEarned=new Set(progress.next?.earned||[]);window.dispatchEvent(new CustomEvent('prime:next-progress',{detail:{earned:[...nextEarned],god:!!progress.next?.god}}));}
 if(typeof renderLive==='function')renderLive(lastLiveStats,false);
 window.dispatchEvent(new CustomEvent('prime:progress',{detail:{master:!!(player&&progress&&progress.master),earned:[...cumulativeEarned]}}));
 let el=$('master-progress');
 if(!el){const guide=document.querySelector('.title-guide-copy');if(!guide)return;el=document.createElement('p');el.id='master-progress';el.className='master-progress';el.setAttribute('aria-live','polite');guide.after(el);}

 if(!player){el.textContent='ログインすると累計称号を確認できます';return;}
 if(!progress){el.textContent='累計称号：取得できませんでした';return;}
 const count=progress.earned?.length??0;
 el.textContent=progress.master?'💠 LIFTING MASTER 解放！':`累計称号 ${count}/8 ／ 💠 LIFTING MASTERまであと${8-count}`;
 el.classList.toggle('master-unlocked',!!progress.master);
 if(progress.master){el.textContent+=(progress.next?' ／ NEXT LEVEL '+nextEarned.size+'/8'+(progress.next.god?' ／ 👑 LIFTING GOD':''):' ／ NEXT LEVEL 準備中');}
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
const nextTitleNames=['FOOT MASTER','KNEE MASTER','TRAP MASTER','HEADING MASTER','SPIN MASTER','JUMP MASTER','SHOULDER MASTER','LIFTING LEGEND'];
const baseTitleNames=['30 KEEPS CLUB','AIR MASTER','SPIN KING','SHOULDER ACE','SCORE HUNTER','QUAD MASTER','AIR QUAD','DOUBLE AIR'];
const nextTitleDescriptions=['30キープまで足以外のタッチ禁止！達成後は自由','30キープまで膝以外のタッチ禁止！達成後は自由','30キープまで胸以外のタッチ禁止！達成後は自由','30キープまで頭以外のタッチ禁止！達成後は自由','30キープまで全タッチでスピン必須！達成後は自由','30キープまで全タッチでジャンプ必須！達成後は自由','肩タッチ10回成功','足・膝・胸・頭・肩・スピン・ジャンプを各4回以上'];
let nextDialogReturnFocus=null,previousGod=false,godToastTimer=null;
function renderNextCollection(){
 const list=$('next-level-list'),status=$('next-level-status'),god=$('next-level-god');
 if(!list||!status||!god)return;
 list.replaceChildren();
 nextTitleNames.forEach((name,i)=>{
  const earned=nextEarned.has(name),item=document.createElement('li');
  item.className='title-profile-item'+(earned?' earned':'');
  const label=document.createElement('strong');label.textContent=(earned?'✦ ':'🔒 ')+name;
  const desc=document.createElement('small');desc.textContent=nextTitleDescriptions[i];
  item.append(label,desc);list.append(item);
 });
 status.textContent=nextEarned.size+' / 8 MASTER TITLES';
 god.classList.toggle('unlocked',nextEarned.size===8);
 const button=$('next-level-open');if(button)button.textContent='👑 NEXT LEVEL 称号 '+nextEarned.size+'/8 ↗';
}
function closeNextDialog(){
 const dialog=$('next-level-dialog');if(!dialog||dialog.hidden)return;
 dialog.hidden=true;(nextDialogReturnFocus?.isConnected?nextDialogReturnFocus:$('next-level-open'))?.focus();
}
$('next-level-open')?.addEventListener('click',()=>{
 const dialog=$('next-level-dialog');if(!dialog)return;
 nextDialogReturnFocus=document.activeElement;renderNextCollection();dialog.hidden=false;$('next-level-close').focus();
});
$('next-level-close')?.addEventListener('click',closeNextDialog);
$('next-level-dialog')?.addEventListener('click',e=>{if(e.target===$('next-level-dialog'))closeNextDialog();});
document.addEventListener('keydown',e=>{
 const dialog=$('next-level-dialog');if(!dialog||dialog.hidden)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeNextDialog();}
 if(e.key==='Tab'){e.preventDefault();$('next-level-close').focus();}
},true);
function showGodUnlock(){
 const toast=$('lifting-god-toast');if(!toast)return;
 clearTimeout(godToastTimer);toast.hidden=false;godToastTimer=setTimeout(()=>toast.hidden=true,4000);
}
window.addEventListener('prime:next-progress',event=>{
 const isGod=event.detail?.god===true;
 renderNextCollection();
 if(isGod&&!previousGod&&progressOwner&&nextEarned.size===8)showGodUnlock();
 previousGod=isGod;
});
let titleProfileReturnFocus=null;
function showTitleProfile(entry,group,trigger){
 const dialog=$('title-profile-dialog'),list=$('title-profile-list');
 if(!dialog||!list)return;
 const names=group==='next'?nextTitleNames:baseTitleNames;
 const mask=group==='next'?entry.nextTitleMask:entry.baseTitleMask;
 $('title-profile-heading').textContent=entry.name+' ／ '+(group==='next'?'NEXT LEVEL':'基本称号');
 $('title-profile-summary').textContent=(Number.isInteger(mask)?mask.toString(2).replace(/0/g,'').length:0)+'/8'+(entry.liftingGod?' ／ 👑 LIFTING GOD':'');
 list.replaceChildren();
 names.forEach((name,i)=>{
  const earned=Number.isInteger(mask)&&!!(mask&(1<<i));
  const item=document.createElement('li');item.className='title-profile-item'+(earned?' earned':'');
  const label=document.createElement('strong');label.textContent=(earned?'✦ ':'🔒 ')+name;
  const desc=document.createElement('small');desc.textContent=group==='next'?nextTitleDescriptions[i]:(earned?'獲得済み':'未獲得');
  item.append(label,desc);list.append(item);
 });
 titleProfileReturnFocus=trigger||document.activeElement;
 dialog.hidden=false;$('title-profile-close').focus();
}
function closeTitleProfile(){
 const dialog=$('title-profile-dialog');if(!dialog||dialog.hidden)return;
 dialog.hidden=true;if(titleProfileReturnFocus?.isConnected)titleProfileReturnFocus.focus();
}
$('title-profile-close')?.addEventListener('click',closeTitleProfile);
$('title-profile-dialog')?.addEventListener('click',e=>{if(e.target===$('title-profile-dialog'))closeTitleProfile();});
document.addEventListener('keydown',e=>{
 const dialog=$('title-profile-dialog');if(!dialog||dialog.hidden)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeTitleProfile();}
 if(e.key==='Tab'){e.preventDefault();$('title-profile-close').focus();}
},true);
// Unlock visibility is tied to verified base-title progress.
window.addEventListener('prime:progress',event=>{
 const button=$('next-level-open');
 if(!button)return;
 button.hidden=event.detail?.master!==true;
 if(button.hidden)closeNextDialog();
});

// Display the date of the latest server-confirmed play, not login or best-score update.
function formatLastPlayedJst(value){
 if(typeof value!=='string'||!value)return null;
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return null;
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric'}).formatToParts(date);
 const month=parts.find(p=>p.type==='month')?.value,day=parts.find(p=>p.type==='day')?.value;
 return month&&day?month+'/'+day:null;
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
  progress.setAttribute('role','button');progress.tabIndex=0;progress.style.cursor='pointer';
  const openBase=e=>{e.stopPropagation();showTitleProfile(entry,'base',progress);};
  progress.addEventListener('click',openBase);
  progress.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openBase(e);}});
  const next=document.createElement('span');next.className='rank-title-count rank-next-title-count';next.textContent='👑 '+(Number.isInteger(entry.nextAchievementCount)?entry.nextAchievementCount:0)+'/8';next.title=entry.liftingGod?'LIFTING GOD：NEXT LEVEL全8称号獲得':'NEXT LEVEL獲得称号 '+(entry.nextAchievementCount||0)+'/8';next.setAttribute('aria-label',next.title);name.append(next);
  next.setAttribute('role','button');next.tabIndex=0;next.style.cursor='pointer';
  const openNext=e=>{e.stopPropagation();showTitleProfile(entry,'next',next);};
  next.addEventListener('click',openNext);
  next.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openNext(e);}});
 }
 const lastPlayed=formatLastPlayedJst(entry.lastPlayed);
 if(lastPlayed){
  const played=document.createElement('span');played.className='rank-last-played';
  played.textContent='◷ '+lastPlayed;
  played.title='最終プレイ日（日本時間）：'+lastPlayed;
  played.setAttribute('aria-label',played.title);
  name.append(played);
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
function validDailyBreakdown(entry){
 return !!entry&&Number.isSafeInteger(entry.score)&&Number.isSafeInteger(entry.playScore)&&Number.isSafeInteger(entry.dailyBonus)&&entry.playScore>=0&&entry.dailyBonus>=0&&entry.playScore+entry.dailyBonus===entry.score;
}
function renderPodiumScore(position,entry){
 const el=$('leader-'+position+'-score');if(!el)return;
 el.textContent=entry?entry.score.toLocaleString()+' PTS':'--- PTS';
 const details=$('leader-'+position+'-breakdown');if(details){details.replaceChildren();details.hidden=true;}
}
function champion(entries){
 const [first,second,third]=entries||[];
 renderPodiumScore('best',first);
 $('leader-best-name').replaceChildren(...(first?[rankName(first)]:[document.createTextNode('未登録')]));
 for(const [position,entry] of [['second',second],['third',third]]){
  renderPodiumScore(position,entry);
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
    const li=document.createElement('li'),name=rankName(e,`${e.rank}. `);
    const total=document.createElement('strong');total.className='rank-total';total.textContent=e.score.toLocaleString()+' PTS';
    const hasBasic=Number.isSafeInteger(e.playScore)&&Number.isSafeInteger(e.dailyBonus)&&e.playScore>=0&&e.dailyBonus>=0&&e.playScore+e.dailyBonus===e.score;
    const hasSplit=Number.isSafeInteger(e.baseScore)&&Number.isSafeInteger(e.mobileBonus)&&e.baseScore>=0&&e.mobileBonus>=0&&(hasBasic?e.baseScore+e.mobileBonus===e.playScore:e.baseScore+e.mobileBonus===e.score);
    const head=document.createElement('span');head.className='rank-entry-head';head.append(name,total);li.append(head);
    {
     // Keep TOP3 layout visible before the daily-awards API rollout.
     // Current leaderboard score is the verified saved play best; daily credits are not live yet.
     li.classList.add('rank-has-breakdown');
     const parts=document.createElement('span');parts.className='rank-bonus-parts';
     const part=(symbol,value,description)=>{const el=document.createElement('small');el.className='rank-bonus-part';const display=value===0?'—':value.toLocaleString();el.textContent=symbol+' '+display;el.title=description;el.setAttribute('aria-label',description+' '+(value===0?'加点なし':value.toLocaleString()+'ポイント'));parts.append(el);};
     // Preserve historical best totals, including any pre-change mobile correction.
     // BOOST credit is not available until server-verified BOOST runs are launched.
     part('Ⓟ',hasBasic?e.playScore:e.score,hasSplit&&e.mobileBonus>0?'保存済みプレイスコア（旧スマホ補正を含む）':'保存済みプレイスコア');
     const boostPart=document.createElement('small');boostPart.className='rank-bonus-part';
     boostPart.textContent='⚡ —';boostPart.title='BOOST加点：機能公開後に表示';
     boostPart.setAttribute('aria-label','BOOST加点は未提供');parts.append(boostPart);
     if(hasBasic)part('Ⓓ',e.dailyBonus,'当月デイリー加点');
     else {const unknownDaily=document.createElement('small');unknownDaily.className='rank-bonus-part';unknownDaily.textContent='Ⓓ —';unknownDaily.title='デイリー加点は未確認';parts.append(unknownDaily);}
     li.append(parts);
     if(e.rank>3){
      li.classList.add('rank-breakdown-collapsed');head.setAttribute('role','button');head.tabIndex=0;head.setAttribute('aria-expanded','false');
      const toggle=()=>{const open=li.classList.toggle('rank-breakdown-expanded');li.classList.toggle('rank-breakdown-collapsed',!open);head.setAttribute('aria-expanded',String(open));};
      head.addEventListener('click',toggle);
      head.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}});
     }else li.classList.add('rank-podium-breakdown');
    }
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
 if(current!==generation)return;player=data.player;pending=null;account();window.PRIME_DAILY?.sync?.({submitted:true});
 $('personal-result').textContent=`今回 ${data.score.toLocaleString()} PTS ／ BEST ${player.best.toLocaleString()} PTS ／ 全体 ${player.rank??'—'}位`;
 $('record-banner').textContent=data.newChampion?'NEW CHAMPION!':data.personalBest?'NEW PERSONAL BEST!':'';$('record-banner').classList.toggle('record-celebrate',!!(data.personalBest||data.newChampion));
 const dailyNote=data.dailyCheck?.enabled===false?' ／ デイチャレ報酬は未有効':data.dailyCheck?.enabled===true&&data.dailyCheck.qualifiedIds?.length===0?' ／ デイチャレ：サーバー判定で未達成':data.dailyCheck?.enabled===true&&data.daily?.earned>0?' ／ デイチャレ +'+data.daily.earned+' PTS 保存済み':data.dailyCheck?.enabled===true?' ／ デイチャレ：今回の新規加点なし':'';
 $('save-feedback').textContent='記録を保存しました。'+dailyNote;if(data.progress){progressGeneration++;renderProgress(data.progress);}else refreshProgress();await refresh();await updateResultRival();
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
 // The field HUD switches to NEXT LEVEL after all eight original titles are earned.
 // This affects display only, not scoring or stored achievements.
 const isNextLevel=!!player&&progressOwner===player.id&&achievementDefinitions.every(a=>cumulativeEarned.has(a.name));
 const heading=document.querySelector('#achievement-board .achievement-board-heading');
 if(heading&&heading.firstChild)heading.firstChild.textContent=isNextLevel?'NEXT LEVEL ':'称号リザルト ';
 if(isNextLevel){
  for(let i=0;i<nextTitleNames.length;i++){
   const name=nextTitleNames[i],earned=nextEarned.has(name),row=document.createElement('div');
   row.className='achievement-live-row'+(earned?' earned':'');
   row.title=nextTitleDescriptions[i];
   const icon=document.createElement('span');icon.className='achievement-live-icon';icon.textContent=earned?'👑':'◇';
   const label=document.createElement('span');label.textContent=name;row.append(icon,label);list.append(row);
  }
  document.getElementById('achievement-count').textContent=nextEarned.size+'/8';
 }else{
  for(const a of achievementDefinitions){const row=document.createElement('div');row.className='achievement-live-row'+((unlocked.has(a.name)||persistent.has(a.name))?' earned':'')+(a.legendary?' legendary':'');const icon=document.createElement('span');icon.className='achievement-live-icon';icon.textContent=a.icon;const label=document.createElement('span');label.textContent=a.name;row.append(icon,label);list.append(row);}
  document.getElementById('achievement-count').textContent=new Set([...unlocked,...persistent]).size+'/8';
 }
 if(animate&&fresh.length){const a=fresh[fresh.length-1],toast=document.getElementById('achievement-unlock');toast.textContent=(a.legendary?'✦ LEGENDARY UNLOCK! ✦ ':'✦ UNLOCK! ✦ ')+a.name;toast.className='achievement-unlock show'+(a.legendary?' legendary':'');clearTimeout(unlockTimer);unlockTimer=setTimeout(()=>toast.className='achievement-unlock',1500);}
}
function resetAchievements(){unlocked.clear();lastLiveStats=emptyLiveStats();clearTimeout(unlockTimer);const toast=document.getElementById('achievement-unlock');toast.className='achievement-unlock';toast.textContent='';renderLive(lastLiveStats,false);document.getElementById('achievement-panel').hidden=true;document.getElementById('achievement-badges').replaceChildren();}
function showAchievements(stats){
 const panel=$('achievement-panel'),badges=$('achievement-badges');badges.replaceChildren();
 // Only show titles first unlocked by this run, not previously earned titles.
 // If progress is unavailable, avoid presenting old titles as new awards.
 const persistent=player&&progressOwner===player.id?cumulativeEarned:null;
 const earned=persistent?achievementDefinitions.filter(b=>b.earned(stats)&&!persistent.has(b.name)):[];
 for(const badge of earned){const el=document.createElement('span');el.className='achievement-badge'+(badge.legendary?' legendary':'');el.textContent=`${badge.icon} ${badge.name}`;badges.append(el);}
 panel.hidden=false;if(!earned.length){const el=document.createElement('span');el.textContent=persistent?'今回新しく獲得した称号はありません':'称号の獲得状況を確認中です';badges.append(el);}
}
let preflightFailures=0,preflightBusy=false;
const preflightStatus=$('preflight-status'),preflightRetry=$('preflight-retry'),preflightContact=$('preflight-contact');
function preflightMessage(message){preflightStatus.textContent=message;}
function preflightReset(){preflightFailures=0;preflightRetry.hidden=true;preflightContact.hidden=true;preflightMessage('');}
async function preflight(){
 if(preflightBusy)return false;
 if(!player){ticket={worldWidth:window.PRIME_FIELD_WIDTH?.()??1000};preflightReset();return true;} // Guest plays use the same field width without a ranking ticket.
 preflightBusy=true;$('start').disabled=true;preflightMessage('ランキング通信を確認中…');
 try{
  const currentPlayer=player?.id;
  const worldWidth=window.PRIME_FIELD_WIDTH?.()??1000;
   const data=await api('/api/game/start',{worldWidth,...(boostReady&&boostSelection?{boost:boostSelection}:{})});
  if(!data.token||!data.ruleset||player?.id!==currentPlayer)throw new Error('ランキング登録の準備に失敗しました。');
  ticket=data;preflightReset();preflightMessage('通信OK：ランキング登録の準備ができました。');return true;
 }catch(e){
  ticket=null;preflightFailures++;preflightMessage('通信エラー：'+e.message);
  preflightRetry.hidden=false;preflightContact.hidden=preflightFailures<3;if(preflightFailures>=3)preflightMessage('通信エラーが続いています。運営担当者に直接お問い合わせください。 '+e.message);return false;
 }finally{preflightBusy=false;$('start').disabled=false;}
}
preflightRetry.onclick=()=>{$('start').click();};
window.PRIME_RANKING={
 worldWidth:()=>ticket?.worldWidth??1000,
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
 try{const data=await api('/api/'+(e.submitter?.value==='register'?'register':'login'),{name:$('player-name').value,pin});player=data.player;preflightReset();cumulativeEarned=new Set();progressOwner=null;account();syncBoostPicker();window.PRIME_DAILY?.sync?.();renderLive(lastLiveStats,false);refreshProgress();}
 catch(error){$('account-status').textContent=error.message;}finally{authBusy=false;}
};
$('logout').onclick=async()=>{try{await api('/api/logout',{});generation++;player=null;ticket=null;pending=null;hideBoostPicker();preflightReset();cumulativeEarned=new Set();progressOwner=null;account();renderLive(lastLiveStats,false);refreshProgress();}catch(e){$('account-status').textContent=e.message;}};
$('save-retry').onclick=save;$('rank-refresh').onclick=refresh;
api('/api/me').then(data=>{if(!authBusy&&!player){player=data.player;account();syncBoostPicker();refreshProgress();}}).catch(()=>{});
renderProgress(null);refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
setInterval(()=>{if(!document.hidden)refresh();},60000);
})();
