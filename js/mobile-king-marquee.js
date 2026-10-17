/* Read existing leaderboard DOM; no extra network requests and no per-frame work. */
(function(){
 'use strict';
 const left=document.getElementById('leader-best-name');
 if(!left)return;
 const ticker=document.createElement('div');
 ticker.id='mobile-king-marquee';
 ticker.className='mobile-king-marquee';
 ticker.setAttribute('aria-label','ランキングTOP10');
 // All three places scroll in the same track; no fixed champion name.
 const windowEl=document.createElement('span');
 windowEl.className='mobile-king-window';
 const track=document.createElement('span');
 track.className='mobile-king-track';
 windowEl.append(track);
 ticker.append(windowEl);
 document.body.append(ticker);
 const rankRows=document.getElementById('rank-rows');
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
  const live=Array.from(rankRows?.children||[]).slice(0,10).map((row,i)=>({
   medal:['🥇','🥈','🥉'][i]||'',place:i+1,
   name:(row.querySelector('.rank-player-name > span:first-child')?.textContent?.trim()||'').replace(/^\d+\.\s*/,'').trim()||'未登録',
   points:row.querySelector(':scope > strong')?.textContent?.trim()||'--- PTS'
  }));
  const entries=live.length?live:ranks.map(([medal,name,points],i)=>({
   medal,place:i+1,name:plainName(name),points:score(points)
  }));
  const value=entries.map(e=>e.medal+' '+e.place+'位 '+e.name+' '+e.points).join(' ✦ ');
  if(value===previous)return;
  previous=value;
  ticker.setAttribute('aria-label','ランキングTOP'+entries.length+' '+value);
  track.replaceChildren();
  {
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
   const width=section.getBoundingClientRect().width;
   const viewport=windowEl.getBoundingClientRect().width;
   const copies=width>0?Math.max(2,Math.ceil(viewport/width)+1):2;
   for(let i=1;i<copies;i++)track.append(section.cloneNode(true));
   if(width>0){track.style.setProperty('--mobile-marquee-distance',width+'px');track.style.animationDuration=Math.max(20,Math.round(width/58))+'s';}
  }
 }
 const observer=new MutationObserver(update);
 if(rankRows)observer.observe(rankRows,{childList:true,subtree:true,characterData:true});
 for(const [,name,points] of ranks){
  for(const id of [name,points]){
   const target=document.getElementById(id);
   if(target)observer.observe(target,{childList:true,subtree:true,characterData:true});
  }
 }
 window.addEventListener('resize',()=>{previous='';update()});
 update();
})();
