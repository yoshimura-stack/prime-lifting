/* Update notifications: per-browser read receipt; no gameplay/API changes. */
(()=>{
 const dialog=document.getElementById('update-news-dialog');
 const close=document.getElementById('update-news-close');
 if(!dialog||!close)return;
 const version=dialog.dataset.newsVersion||'2026-10-17-1';
 const key='prime-lifting-news-seen';
 let opener=null;
 const triggers=()=>[...document.querySelectorAll('[data-open-updates]')];
 function seen(){try{return localStorage.getItem(key)===version}catch{return false}}
 function markSeen(){try{localStorage.setItem(key,version)}catch{};refresh()}
 function refresh(){triggers().forEach(b=>b.classList.toggle('news-unread',!seen()))}
 function hide(){if(dialog.hidden)return;dialog.hidden=true;opener?.focus?.();opener=null}
 function show(trigger){opener=trigger||null;if(trigger)markSeen();dialog.hidden=false;close.focus()}
 document.addEventListener('click',e=>{
  const trigger=e.target.closest('[data-open-updates]');
  if(trigger){show(trigger);return}
  if(e.target===dialog)hide();
 });
 close.addEventListener('click',hide);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.hidden){e.preventDefault();hide()}});
 refresh();
 // Defer until the lobby has initialized, avoiding interruptions during script startup.
 window.addEventListener('load',()=>{refresh();if(!seen()&&dialog.hidden)show(null)},{once:true});
})();
