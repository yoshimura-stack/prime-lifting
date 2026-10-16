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
    if(clickId){document.getElementById(clickId)?.click();return}
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
  ['⚽','得点とボーナス',['.score-guide > .panel-block:not(.stage-block)','.score-guide > .bonus-card']],
  ['🏟','ステージ',['.stage-block']],
  ['🏆','TOP3ランキング',['.record-card']]
 ]);
 document.addEventListener('pointerdown',e=>{for(const p of [a,b])if(!p.popup.hidden&&!p.popup.contains(e.target)&&!e.target.closest('.pc-rail'))p.hide()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const p of [a,b])if(!p.popup.hidden)p.hide()});
 window.addEventListener('resize',()=>{if(!desktop()){a.hide();b.hide()}});
 const ticker=document.createElement('button');ticker.type='button';ticker.className='pc-king-ticker';ticker.setAttribute('aria-label','ランキングTOP3を見る');
 const fixed=document.createElement('span');fixed.className='pc-ticker-label';fixed.textContent='👑 KING · LIVE TOP 3';
 const windowEl=document.createElement('span');windowEl.className='pc-ticker-window';const track=document.createElement('span');track.className='pc-ticker-track';windowEl.append(track);ticker.append(fixed,windowEl);shell.append(ticker);
 ticker.addEventListener('click',()=>document.getElementById('view-ranking')?.click());
 // The KING remains visible even when the scrolling names are off-screen.
 const king=document.createElement('span');king.className='pc-ticker-king';fixed.after(king);
 const ranks=[['👑','leader-best-name','leader-best-score'],['🥈','leader-second-name','leader-second-score'],['🥉','leader-third-name','leader-third-score']];
 let old='';
 function update(){const str=ranks.map(([medal,name,score],i)=>medal+' '+(i+1)+'位 '+(document.getElementById(name)?.textContent?.trim()||'未登録')+'  '+(document.getElementById(score)?.textContent?.trim()||'--- PTS')).join('　 ✦　 ');if(str===old)return;old=str;king.textContent=(document.getElementById('leader-best-name')?.textContent?.trim()||'未登録')+' · '+(document.getElementById('leader-best-score')?.textContent?.trim()||'--- PTS');track.replaceChildren();for(let i=0;i<2;i++){const span=document.createElement('span');span.textContent=str+'　 ✦　 ';track.append(span)}}
 update();const observer=new MutationObserver(update);for(const [,name,score] of ranks){for(const id of [name,score]){const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,characterData:true,subtree:true})}}
})();
