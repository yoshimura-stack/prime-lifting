/* Lightweight update bulletin: informational only, no gameplay or API side effects. */
(()=>{
 const dialog=document.getElementById('update-news-dialog');
 const close=document.getElementById('update-news-close');
 if(!dialog||!close)return;
 let opener=null;
 function hide(){if(dialog.hidden)return;dialog.hidden=true;opener?.focus?.();opener=null}
 function show(trigger){opener=trigger;dialog.hidden=false;close.focus()}
 document.addEventListener('click',e=>{
  const trigger=e.target.closest('[data-open-updates]');
  if(trigger){show(trigger);return}
  if(e.target===dialog)hide();
 });
 close.addEventListener('click',hide);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.hidden){e.preventDefault();hide()}});
})();
