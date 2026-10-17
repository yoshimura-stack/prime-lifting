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
 const ticker=document.createElement('button');ticker.type='button';ticker.className='pc-king-ticker';ticker.setAttribute('aria-label','ランキングTOP3を見る');
 // Let all three places scroll across the full width. No pinned KING/rank-1 labels:
 // the live ranking track already contains the current champion.
 const windowEl=document.createElement('span');windowEl.className='pc-ticker-window';const track=document.createElement('span');track.className='pc-ticker-track';windowEl.append(track);ticker.append(windowEl);shell.append(ticker);
 ticker.addEventListener('click',()=>document.getElementById('view-ranking')?.click());
 const ranks=[['👑','leader-best-name','leader-best-score'],['🥈','leader-second-name','leader-second-score'],['🥉','leader-third-name','leader-third-score']];
 function colored(value,className){
  const span=document.createElement('span');
  span.className=className;
  span.textContent=value;
  return span;
 }
 function plainName(id){
  const el=document.getElementById(id);
  return el?.querySelector('.rank-player-name > span:first-child')?.textContent?.trim()
   ||el?.textContent?.trim()||'未登録';
 }
 let old='';
 function update(){
  const entries=ranks.map(([medal,name,scoreId],i)=>({
   medal,place:i+1,name:plainName(name),points:document.getElementById(scoreId)?.textContent?.trim()||'--- PTS'
  }));
  const str=entries.map(e=>e.medal+' '+e.place+'位 '+e.name+' '+e.points).join(' ✦ ');
  if(str===old)return;
  old=str;
  ticker.setAttribute('aria-label','ランキングTOP3 '+str);
  track.replaceChildren();
  for(let i=0;i<2;i++){
   const section=colored('','pc-ticker-segment');
   for(const e of entries){
    const item=colored('','pc-ticker-entry');
    item.append(
     colored(e.medal+' '+e.place+'位','pc-ticker-place pc-ticker-place-'+e.place),
     colored(e.name,'pc-ticker-name'),
     colored(e.points,'pc-ticker-score')
    );
    section.append(item,colored('✦','pc-ticker-divider'));
   }
   track.append(section);
  }
 }
 update();const observer=new MutationObserver(update);for(const [,name,score] of ranks){for(const id of [name,score]){const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,characterData:true,subtree:true})}}
})();
