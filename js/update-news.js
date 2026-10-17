/* Per-item update receipts: auto-popup shows only newly published items. */
(()=>{
 const dialog=document.getElementById('update-news-dialog');
 const close=document.getElementById('update-news-close');
 if(!dialog||!close)return;
 const list=dialog.querySelector('.update-news-list');
 const items=[...list.querySelectorAll('.update-news-item')];
 const key='prime-lifting-news-seen-items';
 const legacyKey='prime-lifting-news-seen';
 const legacyVersion=dialog.dataset.newsVersion||'';
 const latestVersion='2026-10-18-2';
 let opener=null,mode='auto',shownIds=[];
 const triggers=()=>[...document.querySelectorAll('[data-open-updates]')];
 const latest=items.filter(item=>item.dataset.newsId);
 const ids=latest.map(item=>item.dataset.newsId);
 function stored(){
  try{
   const value=localStorage.getItem(key);
   if(value!==null){const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:[]}
   // Upgrade existing receipts without resurfacing previously acknowledged announcements.
   if(localStorage.getItem(legacyKey)===latestVersion)return ids.slice();
  }catch{}
  return [];
 }
 let seen=new Set(stored());
 function persist(){try{localStorage.setItem(key,JSON.stringify([...seen]))}catch{}}
 function unread(){return latest.filter(item=>!seen.has(item.dataset.newsId))}
 function refresh(){const hasUnread=unread().length>0;triggers().forEach(b=>b.classList.toggle('news-unread',hasUnread))}
 function display(which){
  mode=which;
  const visible=which==='auto'?unread():items;
  shownIds=which==='auto'?visible.map(item=>item.dataset.newsId):ids.slice();
  items.forEach(item=>{item.hidden=which==='auto'&&!visible.includes(item)});
  dialog.classList.toggle('news-auto',which==='auto');
  const intro=dialog.querySelector('.update-news-intro');
  if(intro)intro.textContent=which==='auto'?'新しいアップデートをお知らせします。':'ゲームの改善内容と、これから追加予定の機能をお知らせします。';
 }
 function acknowledge(){shownIds.forEach(id=>seen.add(id));persist();refresh()}
 function hide(){if(dialog.hidden)return;dialog.hidden=true;acknowledge();opener?.focus?.();opener=null}
 function show(which,trigger){
  opener=trigger||null;display(which);
  if(which==='auto'&&shownIds.length===0)return;
  dialog.hidden=false;close.focus();
 }
 document.addEventListener('click',e=>{
  const trigger=e.target.closest('[data-open-updates]');
  if(trigger){if(!dialog.hidden)hide();show('manual',trigger);return}
  if(e.target===dialog)hide();
 });
 close.addEventListener('click',hide);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.hidden){e.preventDefault();hide()}});
 refresh();
 window.addEventListener('load',()=>{refresh();if(dialog.hidden&&unread().length)show('auto',null)},{once:true});
})();
