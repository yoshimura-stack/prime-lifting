const assert=require('node:assert/strict'),{test}=require('node:test');
const handlers={};global.addEventListener=(n,fn)=>handlers[n]=fn;global.document={addEventListener:(n,fn)=>handlers[n]=fn,hidden:false};
require('../js/touch.js');
test('independent pointer IDs support every action combination and cancel safely',()=>{
 const listeners={},buttons=['left','right','jump','spin','act'].map(action=>({dataset:{action},classList:{toggle(){}},setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){},closest(){return this;}}));
 const element={addEventListener:(n,f)=>listeners[n]=f,querySelectorAll:()=>buttons,querySelector:()=>null};let enabled=true,actions=[];
 const c=new PrimeTouchController(element,{enabled:()=>enabled,action:n=>actions.push(n)});
 const down=(id,name)=>listeners.pointerdown({target:buttons.find(b=>b.dataset.action===name),pointerId:id,preventDefault(){},stopPropagation(){}});
 for(const group of [['left','jump'],['left','spin'],['right','act'],['jump','act'],['spin','act'],['right','jump','act']]){
  actions=[];group.forEach((n,i)=>down(i+1,n));assert.equal(c.pointers.size,group.length);assert.deepEqual(actions,group.filter(n=>!['left','right'].includes(n)));
  listeners.pointerup({pointerId:group.length});assert.equal(c.pointers.size,group.length-1);c.clear();
 }
 down(1,'left');down(2,'left');listeners.pointercancel({pointerId:1});assert.ok(c.held('left'));listeners.lostpointercapture({pointerId:2});assert.ok(!c.held('left'));
 down(1,'right');handlers.blur();assert.equal(c.pointers.size,0);
 down(1,'right');handlers.orientationchange();assert.equal(c.pointers.size,0);
 down(1,'right');document.hidden=true;handlers.visibilitychange();assert.equal(c.pointers.size,0);
 enabled=false;down(3,'act');assert.equal(c.pointers.size,0);
});
test('virtual stick has a dead zone, switches direction while captured, and clears on cancellation',()=>{
 const listeners={},classes=new Set(),knob={style:{},getBoundingClientRect:()=>({width:44,height:44})};
 const stick={dataset:{action:'stick'},classList:{toggle(name,on){on?classes.add(name):classes.delete(name);}},style:{},getBoundingClientRect:()=>({left:100,top:100,width:120,height:120}),querySelector:()=>knob,setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){},closest(){return this;}};
 const buttons=[stick],element={addEventListener:(name,fn)=>listeners[name]=fn,querySelectorAll:()=>buttons,querySelector:()=>stick};
 const c=new PrimeTouchController(element,{enabled:()=>true,action:()=>assert.fail('stick must not trigger an action')});
 const event=(pointerId,clientX,clientY)=>({target:stick,pointerId,clientX,clientY,preventDefault(){},stopPropagation(){}});
 listeners.pointerdown(event(7,160,160));
 assert.equal(c.held('left'),false);assert.equal(c.held('right'),false);
 listeners.pointermove(event(7,180,160));assert.equal(c.held('right'),true);assert.equal(c.held('left'),false);
 // A slight drift across the centre must not reverse right into left.
 listeners.pointermove(event(7,155,160));assert.equal(c.held('right'),true);assert.equal(c.held('left'),false);
 listeners.pointermove(event(7,145,160));assert.equal(c.held('right'),false);assert.equal(c.held('left'),false);
 listeners.pointermove(event(7,124,160));assert.equal(c.held('left'),true);assert.equal(c.held('right'),false);
 assert.match(knob.style.transform,/calc\(-50% \+ -/);
 listeners.pointermove(event(7,165,160));assert.equal(c.held('left'),true,'small right-side drift does not reverse');
 listeners.pointermove(event(7,171,160));assert.equal(c.held('left'),false);assert.equal(c.held('right'),false);
 listeners.pointermove(event(7,196,160));assert.equal(c.held('right'),true,'deliberate movement switches back to right');
 listeners.pointermove(event(7,160,160));assert.equal(c.held('left'),false);assert.equal(c.held('right'),true,'minor centre drift keeps prior direction');
 listeners.pointermove(event(7,210,160));assert.ok(knob.style.transform.includes('34px'));
 listeners.pointercancel(event(7,210,210));assert.equal(c.pointers.size,0);assert.equal(c.held('left'),false);assert.equal(c.held('right'),false);
 assert.equal(knob.style.transform,'translate(-50%, -50%)');assert.equal(classes.has('is-left'),false);assert.equal(classes.has('is-right'),false);
 listeners.pointerdown(event(8,180,160));assert.equal(c.held('right'),true);handlers.blur();assert.equal(c.pointers.size,0);assert.equal(c.held('right'),false);
});
