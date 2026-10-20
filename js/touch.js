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
   if(b.dataset.action==='stick'){this.placeStick(e,b);this.updateStick(e,b);}
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
 placeStick(e,zone){
  const stick=zone.querySelector('.touch-stick');if(!stick)return;
  const rect=zone.getBoundingClientRect();
  const size=stick.getBoundingClientRect().width;
  const x=Math.max(size/2,Math.min(rect.width-size/2,e.clientX-rect.left));
  const y=Math.max(size/2,Math.min(rect.height-size/2,e.clientY-rect.top));
  stick.style.left=(x-size/2)+'px';stick.style.top=(y-size/2)+'px';
  stick.classList.add('floating-visible');
 }
 updateStick(e,zone){
  const stick=zone.querySelector('.touch-stick');if(!stick)return;
  const rect=stick.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)/2;
  const knob=stick.querySelector('.touch-stick-knob'),knobRadius=knob.getBoundingClientRect().width/2;
  const maxOffset=Math.max(1,radius-knobRadius-4),x=e.clientX-(rect.left+rect.width/2),y=e.clientY-(rect.top+rect.height/2);
  const distance=Math.hypot(x,y),scale=distance>maxOffset?maxOffset/distance:1;
  // A larger dead zone plus reversal hysteresis prevents a tiny finger drift
  // across the centre from commanding the opposite movement. Only touch-stick
  // interpretation changes; player acceleration/speed and other buttons do not.
  const previous=this.stickDirections.get(e.pointerId)||null;
  const activate=radius*0.32,release=radius*0.16,reverse=radius*0.58;
  let direction=null;
  if(previous==='right'){
   if(x<=-reverse)direction='left';
   else if(x>=-release)direction='right';
  }else if(previous==='left'){
   if(x>=reverse)direction='right';
   else if(x<=release)direction='left';
  }else if(x>=activate)direction='right';
  else if(x<=-activate)direction='left';
  this.stickDirections.set(e.pointerId,direction);
  knob.style.transform=`translate(calc(-50% + ${x*scale}px), calc(-50% + ${y*scale}px))`;
 }
 held(name){
  return this.enabled()&&[...this.pointers].some(([id,b])=>b.dataset.action===name||b.dataset.action==='stick'&&this.stickDirections.get(id)===name);
 }
 paint(){
  this.element.querySelectorAll('[data-action]').forEach(b=>b.classList.toggle('pressed',[...this.pointers.values()].includes(b)));
  const zone=this.element.querySelector('[data-action="stick"]'),stick=zone?.querySelector('.touch-stick'),knob=stick?.querySelector('.touch-stick-knob');
  if(stick&&knob){
   const active=[...this.pointers.values()].includes(zone);
   if(!active){knob.style.transform='translate(-50%, -50%)';stick.classList.remove('floating-visible');}
   stick.classList.toggle('pressed',active);
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
