/* PC-only navigation; move existing guide content without cloning IDs. */
(function(){
 const root=document.querySelector('main.game-app'),left=document.querySelector('.controls-panel'),right=document.querySelector('.score-guide'),shell=document.querySelector('.game-shell');
 if(!root||!left||!right||!shell)return;
 const desktop=()=>window.matchMedia('(min-width:951px) and (pointer:fine)').matches&&!document.body.classList.contains('touch-landscape');
 const setup=(aside,side,entries)=>{
  const rail=document.createElement('nav');rail.className='pc-rail';rail.setAttribute('aria-label',side==='left'?'操作と称号':'得点とランキング');aside.prepend(rail);
  const popup=document.createElement('div');popup.className='pc-panel pc-'+side;popup.hidden=true;popup.setAttribute('role','dialog');popup.setAttribute('aria-label','詳細パネル');
  const head=document.createElement('div');head.className='pc-panel-head';const label=document.createElement('span');const close=document.createElement('button');close.type='button';close.textContent='✕';close.setAttribute('aria-label','閉じる');head.append(label,close);
  const content=document.createElement('div');content.className='pc-panel-content';popup.append(head,content);document.body.append(popup);
  let moved=[],lastButton=null;
  const hide=(restoreFocus=true)=>{if(popup.hidden)return;popup.hidden=true;for(const item of moved){item.anchor.replaceWith(item.node)}moved=[];content.replaceChildren();if(restoreFocus)lastButton?.focus();};
  close.addEventListener('click',hide);popup.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();hide()}});
  entries.forEach(([symbol,title,selectors,clickId])=>{
   const btn=document.createElement('button');btn.type='button';btn.textContent=symbol;btn.title=title;btn.setAttribute('aria-label',title);rail.append(btn);
   btn.addEventListener('click',()=>{
    if(clickId){hide(false);document.getElementById(clickId)?.click();return}
    if(!popup.hidden)hide(false);
    if(!desktop())return;
    lastButton=btn;label.textContent=title;
    selectors.forEach(selector=>{const node=aside.querySelector(selector);if(!node)return;const anchor=document.createComment('pc-panel-anchor');node.before(anchor);moved.push({node,anchor});content.append(node)});
    popup.hidden=false;close.focus();
   });
  });
  return {hide,popup};
 };
 const a=setup(left,'left',[
  ['🎮','操作説明',['.controls-content-scroll > .panel-block:first-child']],
  ['🏅','称号の獲得条件',[],'title-guide-open'],
  ['☰','ゲームメニュー',[],'game-menu-open'],
  ['🪙','PRIME COIN',[],'prime-coin-info-open']
 ]);
 const b=setup(right,'right',[
  ['⚽','得点とボーナス',['.panel-block:not(.stage-block)','.bonus-card']],
  ['🏟','ステージ',['.stage-block']],
  ['🏆','現在のランキング',[],'view-ranking']
 ]);
 document.addEventListener('pointerdown',e=>{for(const p of [a,b])if(!p.popup.hidden&&!p.popup.contains(e.target)&&!e.target.closest('.pc-rail'))p.hide()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const p of [a,b])if(!p.popup.hidden)p.hide()});
 window.addEventListener('resize',()=>{if(!desktop()){a.hide();b.hide()}});
 const ticker=document.createElement('button');ticker.type='button';ticker.className='pc-king-ticker';ticker.setAttribute('aria-label','ランキングTOP10を見る');
 // Reuse the existing TOP10 leaderboard DOM. No additional API calls or gameplay work.
 const windowEl=document.createElement('span');windowEl.className='pc-ticker-window';const track=document.createElement('span');track.className='pc-ticker-track';windowEl.append(track);ticker.append(windowEl);shell.append(ticker);
 ticker.addEventListener('click',()=>document.getElementById('view-ranking')?.click());
 const podium=[['👑','leader-best-name','leader-best-score'],['🥈','leader-second-name','leader-second-score'],['🥉','leader-third-name','leader-third-score']];
 const rankRows=document.getElementById('rank-rows');
 function colored(value,className){
  const span=document.createElement('span');span.className=className;span.textContent=value;return span;
 }
 function plainName(id){
  const el=document.getElementById(id);
  return el?.querySelector('.rank-player-name > span:first-child')?.textContent?.trim()
   ||el?.textContent?.trim()||'未登録';
 }
 function leaderboardEntries(){
  // Ranking.js refreshes these rows on startup, after a run, and every minute.
  // The name is in the first span; device/title badges must not enter the ticker.
  return Array.from(rankRows?.children||[]).slice(0,10).map((row,i)=>{
   const label=row.querySelector('.rank-player-name > span:first-child')?.textContent?.trim()||'';
   const name=label.replace(/^\d+\.\s*/,'').trim()||'未登録';
   const points=row.querySelector(':scope > strong')?.textContent?.trim()||'--- PTS';
   return {medal:['👑','🥈','🥉'][i]||'',place:i+1,name,points};
  });
 }
 function createSegment(entries){
  const section=colored('','pc-ticker-segment');
  for(const e of entries){
   const item=colored('','pc-ticker-entry');
   item.append(
    colored((e.medal?e.medal+' ':'')+e.place+'位','pc-ticker-place pc-ticker-place-'+e.place),
    colored(e.name,'pc-ticker-name'),
    colored(e.points,'pc-ticker-score')
   );
   section.append(item,colored('✦','pc-ticker-divider'));
  }
  return section;
 }
 let old='';
 function update(){
  const live=leaderboardEntries();
  const entries=live.length?live:podium.map(([medal,name,scoreId],i)=>({
   medal,place:i+1,name:plainName(name),points:document.getElementById(scoreId)?.textContent?.trim()||'--- PTS'
  }));
  const value=entries.map(e=>(e.medal?e.medal+' ':'')+e.place+'位 '+e.name+' '+e.points).join(' ✦ ');
  if(value===old)return;
  old=value;
  ticker.setAttribute('aria-label','ランキングTOP'+(live.length||3)+' '+value);
  track.replaceChildren();
  const section=createSegment(entries);
  track.append(section);
  const width=section.getBoundingClientRect().width;
  const viewport=windowEl.getBoundingClientRect().width;
  // Keep at least one entire repeat beyond the viewport, even on wide monitors.
  const copies=width>0?Math.max(2,Math.ceil(viewport/width)+1):2;
  for(let i=1;i<copies;i++)track.append(section.cloneNode(true));
  if(width>0){
   track.style.setProperty('--pc-ticker-distance',width+'px');
   track.style.animationDuration=Math.max(20,Math.round(width/58))+'s';
  }
 }
 const observer=new MutationObserver(update);
 if(rankRows)observer.observe(rankRows,{childList:true,subtree:true,characterData:true});
 for(const [,name,score] of podium){for(const id of [name,score]){const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,characterData:true,subtree:true})}}
 window.addEventListener('resize',()=>{old='';update()});
 update();
})();
