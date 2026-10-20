'use strict';
window.addEventListener('DOMContentLoaded',()=>{
 let portal=null,previous=[],originButton=null;
 function close(){if(!portal)return;portal.remove();portal=null;previous.forEach(([el,value])=>el.inert=value);previous=[];originButton?.focus();}
 function open(e){if(portal)return;originButton=e.currentTarget;
  portal=document.createElement('div');portal.className='pb-portal';portal.setAttribute('role','dialog');portal.setAttribute('aria-modal','true');portal.setAttribute('aria-label','PRIME PINBALL');
  const frame=document.createElement('iframe');frame.title='PRIME PINBALL';frame.src='pinball.html?v=1';portal.append(frame);
  previous=[...document.body.children].map(el=>[el,el.inert]);previous.forEach(([el])=>el.inert=true);document.body.append(portal);frame.onload=()=>frame.focus();
 }
 for(const host of [document.querySelector('.score-guide .pc-rail'),document.querySelector('#mobile-icon-rails .mobile-icon-column:last-child')]){
  if(!host)continue;const b=document.createElement('button');b.className='pb-entry';b.type='button';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-label','PRIME PINBALLを開く');b.title='PRIME PINBALL';b.innerHTML='<span aria-hidden="true">◉</span><small>PINBALL</small>';b.addEventListener('click',open);host.append(b);
 }
 window.addEventListener('message',e=>{if(portal&&e.origin===location.origin&&e.source===portal.firstChild.contentWindow&&e.data==='prime-pinball-close')close();});
 window.addEventListener('keydown',e=>{if(portal){e.stopImmediatePropagation();e.preventDefault();if(e.code==='Escape')close();}},true);
});
