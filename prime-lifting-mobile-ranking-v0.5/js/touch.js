(function(root){
'use strict';
class PrimeTouchController {
 constructor(element,{enabled,action}){
  this.pointers=new Map();this.element=element;this.enabled=enabled;
  element.addEventListener('pointerdown',e=>{
   const b=e.target.closest('[data-action]');if(!b||!enabled())return;
   e.preventDefault();e.stopPropagation();
   this.pointers.set(e.pointerId,b);b.setPointerCapture(e.pointerId);this.paint();
   if(!['left','right'].includes(b.dataset.action))action(b.dataset.action);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,e=>{this.pointers.delete(e.pointerId);this.paint();});
  root.addEventListener('blur',()=>this.clear());
  root.addEventListener('orientationchange',()=>this.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
 }
 held(name){return this.enabled()&&[...this.pointers.values()].some(b=>b.dataset.action===name);}
 paint(){this.element.querySelectorAll('[data-action]').forEach(b=>b.classList.toggle('pressed',[...this.pointers.values()].includes(b)));}
 clear(){const entries=[...this.pointers];this.pointers.clear();for(const [id,b] of entries){if(b.hasPointerCapture(id))b.releasePointerCapture(id);}this.paint();}
}
root.PrimeTouchController=PrimeTouchController;
})(globalThis);
