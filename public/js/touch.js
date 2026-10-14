(function(root){
'use strict';
class PrimeTouchController {
 constructor(element,{enabled,action}){
  this.pointers=new Map();this.stickDirections=new Map();this.element=element;this.enabled=enabled;
  element.addEventListener('pointerdown',e=>{
   const b=e.target.closest('[data-action]');if(!b||!enabled())return;
   if(b.dataset.action==='stick'&&[...this.pointers.values()].some(pointer=>pointer.dataset.action==='stick'))return;
   e.preventDefault();e.stopPropagation();
   this.pointers.set(e.pointerId,b);b.setPointerCapture(e.pointerId);
   if(b.dataset.action==='stick')this.updateStick(e,b);
   this.paint();
   if(!['left','right','stick'].includes(b.dataset.action))action(b.dataset.action);
  });
  element.addEventListener('pointermove',e=>{
   const target=this.pointers.get(e.pointerId);
   if(target?.dataset.action!=='stick')return;
   e.preventDefault();this.updateStick(e,target);this.paint();
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,e=>{this.pointers.delete(e.pointerId);this.stickDirections.delete(e.pointerId);this.paint();});
  root.addEventListener('blur',()=>this.clear());
  root.addEventListener('orientationchange',()=>this.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
 }
 updateStick(e,stick){
  const rect=stick.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)/2;
  const knob=stick.querySelector('.touch-stick-knob'),knobRadius=knob.getBoundingClientRect().width/2;
  const maxOffset=Math.max(1,radius-knobRadius-4),x=e.clientX-(rect.left+rect.width/2),y=e.clientY-(rect.top+rect.height/2);
  const distance=Math.hypot(x,y),scale=distance>maxOffset?maxOffset/distance:1;
  this.stickDirections.set(e.pointerId,Math.abs(x)>radius*0.22?(x<0?'left':'right'):null);
  knob.style.transform=`translate(calc(-50% + ${x*scale}px), calc(-50% + ${y*scale}px))`;
 }
 held(name){
  return this.enabled()&&[...this.pointers].some(([id,b])=>b.dataset.action===name||b.dataset.action==='stick'&&this.stickDirections.get(id)===name);
 }
 paint(){
  this.element.querySelectorAll('[data-action]').forEach(b=>b.classList.toggle('pressed',[...this.pointers.values()].includes(b)));
  const stick=this.element.querySelector('[data-action="stick"]'),knob=stick?.querySelector('.touch-stick-knob');
  if(stick&&knob&&![...this.pointers.values()].includes(stick)){
   knob.style.transform='translate(-50%, -50%)';
  }
  stick?.classList.toggle('is-left',[...this.stickDirections.values()].includes('left'));
  stick?.classList.toggle('is-right',[...this.stickDirections.values()].includes('right'));
 }
 clear(){
  const entries=[...this.pointers];this.pointers.clear();this.stickDirections.clear();
  for(const [id,b] of entries)if(b.hasPointerCapture(id))b.releasePointerCapture(id);
  this.paint();
 }
}
root.PrimeTouchController=PrimeTouchController;
})(globalThis);
