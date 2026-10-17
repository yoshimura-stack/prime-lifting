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
 function colored(text,className){
  const span=document.createElement('span');
  span.className=className;
  span.textContent=text;
  return span;
 }
 function update(){
  const entries=ranks.map(([medal,name,points],i)=>({
   medal,place:i+1,name:plainName(name),points:score(points)
  }));
  const value=entries.map(e=>e.medal+' '+e.place+'位 '+e.name+' '+e.points).join(' ✦ ');
  if(value===previous)return;
  previous=value;
  ticker.setAttribute('aria-label','ランキングTOP3 '+value);
  track.replaceChildren();
  for(let i=0;i<2;i++){
   const section=colored('','mobile-podium-segment');
   for(const e of entries){
    const item=colored('','mobile-podium-entry');
    item.append(
     colored(e.medal+' '+e.place+'位','mobile-podium-place mobile-podium-place-'+e.place),
     colored(e.name,'mobile-podium-name'),
     colored(e.points,'mobile-podium-score')
    );
    section.append(item,colored('✦','mobile-podium-divider'));
   }
   track.append(section);
  }
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
