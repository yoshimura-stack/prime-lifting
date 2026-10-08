const assert=require('node:assert/strict'),{test}=require('node:test');
const handlers={};global.addEventListener=(n,fn)=>handlers[n]=fn;global.document={addEventListener:(n,fn)=>handlers[n]=fn,hidden:false};
require('../js/touch.js');
test('independent pointer IDs support every action combination and cancel safely',()=>{
 const listeners={},buttons=['left','right','jump','spin','act'].map(action=>({dataset:{action},classList:{toggle(){}},setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){},closest(){return this;}}));
 const element={addEventListener:(n,f)=>listeners[n]=f,querySelectorAll:()=>buttons};let enabled=true,actions=[];
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
