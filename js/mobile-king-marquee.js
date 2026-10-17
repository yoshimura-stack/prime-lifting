/* Read existing leaderboard DOM; no extra network requests and no per-frame work. */
(function(){
 'use strict';
 const left=document.getElementById('leader-best-name');
 if(!left)return;
 const ticker=document.createElement('div');
 ticker.id='mobile-king-marquee';
 ticker.className='mobile-king-marquee';
 ticker.setAttribute('aria-label','ランキングTOP3');
 // All three places scroll in the same track; no fixed champion name.
 const windowEl=document.createElement('span');
 windowEl.className='mobile-king-window';
 const track=document.createElement('span');
 track.className='mobile-king-track';
 windowEl.append(track);
 ticker.append(windowEl);
 document.body.append(ticker);
 const ranks=[
  ['🥇','leader-best-name','leader-best-score'],
  ['🥈','leader-second-name','leader-second-score'],
  ['🥉','leader-third-name','leader-third-score']
 ];
 function plainName(id){
  const root=document.getElementById(id);
  return root?.querySelector('.rank-player-name > span:first-child')?.textContent?.trim()
   ||root?.textContent?.trim()||'未登録';
 }
 function score(id){return document.getElementById(id)?.textContent?.trim()||'--- PTS'}
 let previous='';
 function update(){
  const entries=ranks.map(([medal,name,points],i)=>medal+' '+(i+1)+'位 '+plainName(name)+' '+score(points));
  const value=entries.join('   ✦   ');
  if(value===previous)return;
  previous=value;
  ticker.setAttribute('aria-label','ランキングTOP3 '+value);
  track.replaceChildren();
  for(let i=0;i<2;i++){const span=document.createElement('span');span.textContent=value+'   ✦   ';track.append(span)}
 }
 const observer=new MutationObserver(update);
 for(const [,name,points] of ranks){
  for(const id of [name,points]){
   const target=document.getElementById(id);
   if(target)observer.observe(target,{childList:true,subtree:true,characterData:true});
  }
 }
 update();
})();
