/* Local on-field daily completion feedback, based only on actual successful hits.
   This does not grant coins/PTS or pretend a server-verified reward was saved. */
(function(root){
 'use strict';
 const dayEl=document.getElementById('daily-day'),list=document.getElementById('daily-preview-list');
 if(!dayEl||!list)return;
 const fresh=()=>({combo:0,foot:0,knee:0,chest:0,shoulder:0,spin:0,jump:0,quad:0});
 let metrics=fresh(),day=null,challenges=[],earnedThisVisit=new Set(),savedToday=new Set(),generation=0;
 function update(){
  if(!challenges.length)return;
  for(const c of challenges){
   if(!(earnedThisVisit.has(c.id)||savedToday.has(c.id))&&Object.prototype.hasOwnProperty.call(metrics,c.metric)
       &&Number.isFinite(c.target)&&metrics[c.metric]>=c.target)earnedThisVisit.add(c.id);
  }
  list.replaceChildren();
  for(const c of challenges){
   const li=document.createElement('li'),earned=earnedThisVisit.has(c.id)||savedToday.has(c.id);
   li.className=earned?'is-complete':'';
   li.textContent=(earned?'✓ ':'')+String(c.difficulty||'').toUpperCase()+' · '+String(c.label||'');
   li.setAttribute('aria-label',(earned?'達成：':'未達成：')+String(c.label||''));
   list.append(li);
  }
  const count=challenges.filter(c=>earnedThisVisit.has(c.id)||savedToday.has(c.id)).length;
  list.setAttribute('aria-label','今日の達成 '+count+' / '+challenges.length);
 }
 async function refresh(){
  const current=++generation;
  try{
   const response=await fetch('/api/daily',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw Error('daily unavailable');
   const data=await response.json();
   if(current!==generation)return;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(data.day)||!Array.isArray(data.challenges)||data.challenges.length!==3)throw Error('invalid daily missions');
   if(day!==null&&data.day!==day){earnedThisVisit.clear();savedToday.clear();metrics=fresh();}
   day=data.day;challenges=data.challenges.filter(c=>c&&typeof c.id==='string'&&typeof c.metric==='string'&&typeof c.target==='number');
   if(challenges.length!==3)throw Error('invalid goals');
   dayEl.textContent=day+' (JST)';
   update();
   try{
    const statusResponse=await fetch('/api/daily/status',{credentials:'same-origin',cache:'no-store'});
    if(current!==generation)return;
    if(statusResponse.status===401){savedToday.clear();update();return;}
    if(!statusResponse.ok)return;
    const status=await statusResponse.json();
    if(current!==generation||status.day!==day||!Array.isArray(status.completedIds))return;
    const validIds=new Set(challenges.map(c=>c.id));
    savedToday=new Set(status.completedIds.filter(id=>typeof id==='string'&&validIds.has(id)));
    update();
   }catch{/* Local progress remains visible if the account is offline. */}
  }catch{
   if(current!==generation)return;
   if(!challenges.length){dayEl.textContent='ミッションを取得できません';list.replaceChildren();}
  }
 }
 root.PRIME_DAILY={
  begin(){metrics=fresh();update();},
  // Called once for each confirmed successful local game hit, never on misses.
  hit({name,combo,spinCount,jumped}){
   if(Number.isFinite(combo))metrics.combo=Math.max(metrics.combo,combo);
   const part=name==='FOOT'?'foot':name==='KNEE'?'knee':name==='CHEST'?'chest':name==='SHOULDER'?'shoulder':null;
   if(part)metrics[part]++;
   if(Number(spinCount)>0)metrics.spin++;
   if(jumped)metrics.jump++;
   if(Number(spinCount)>=4)metrics.quad=1;
   update();
  },
  refresh,
  // Refresh account-persisted completions after login and verified score submission.
  sync(){return refresh();}
 };
 refresh();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})(globalThis);
