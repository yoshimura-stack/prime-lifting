// Local interaction checks use a test-only constructor proxy; shipped files are unchanged.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{let value;Object.defineProperty(window,'PrimePinball',{configurable:true,get:()=>value,set:P=>{value=new Proxy(P,{construct(target,args){const game=Reflect.construct(target,args);window.__pinballTest=game;return game;}});}});});
  await page.goto((process.env.PINBALL_BASE_URL||'http://127.0.0.1:8781')+'/pinball.html');await page.locator('body[data-renderer="webgl"]').waitFor();
  await page.keyboard.down('Space');await page.waitForTimeout(450);assert.ok(parseFloat(await page.locator('#pb-power-fill').evaluate(e=>e.style.width))>20);await page.keyboard.up('Space');assert.equal(await page.evaluate(()=>__pinballTest.phase),'playing');
  await page.locator('#pb-pause').click();const frozen=await page.evaluate(()=>__pinballTest.time);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>__pinballTest.time),frozen);await page.locator('#pb-pause').click();
  await page.evaluate(()=>{const g=__pinballTest;g.goalArmed=true;g.ball={x:285,y:186,vx:0,vy:-400};});await page.waitForFunction(()=>__pinballTest.goals===1);assert.ok((await page.locator('#pb-mission').textContent()).includes('POWER PLAY'));
  await page.screenshot({path:require('node:path').join(process.env.PINBALL_SCREENSHOTS||require('node:os').tmpdir(),'pinball-goal.png')});
  await page.evaluate(()=>{const g=__pinballTest;g.saver=0;g.balls=1;g.ball={x:300,y:961,vx:0,vy:200};});await page.locator('#pb-results').waitFor({state:'visible'});const best=await page.evaluate(()=>localStorage.getItem('prime.pinball.best.v1'));assert.ok(Number(best)>=2000);
  await page.locator('#pb-result-retry').click();assert.equal(await page.evaluate(()=>__pinballTest.balls),3);assert.equal(await page.evaluate(()=>__pinballTest.score),0);
  await page.keyboard.down('Space');await page.waitForTimeout(50);await page.keyboard.press('Escape');await page.keyboard.up('Space');assert.equal(await page.evaluate(()=>__pinballTest.phase),'ready');assert.deepEqual(errors,[]);
  const mobile=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});await mobile.goto((process.env.PINBALL_BASE_URL||'http://127.0.0.1:8781')+'/pinball.html');await mobile.locator('body[data-renderer]').waitFor();const left=await mobile.locator('#pb-left').boundingBox(),right=await mobile.locator('#pb-right').boundingBox();const cdp=await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:left.x+left.width/2,y:left.y+left.height/2,id:1},{x:right.x+right.width/2,y:right.y+right.height/2,id:2}]});assert.equal(await mobile.locator('.held').count(),2);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await mobile.locator('.held').count(),0);
  const fallback=await browser.newPage();await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind.includes('webgl')?null:original.call(this,kind,...args);};});await fallback.goto((process.env.PINBALL_BASE_URL||'http://127.0.0.1:8781')+'/pinball.html');await fallback.locator('body[data-renderer="canvas"]').waitFor();await fallback.locator('#pb-launch').click();await fallback.waitForFunction(()=>document.getElementById('pb-launch').disabled);assert.equal(await fallback.locator('#pb-launch').isDisabled(),true);
  console.log('PASS: charged launch; paused clock; goal → power play; results → local best → reset; cancelled charge; genuine simultaneous touch; WebGL fallback');
 }finally{await browser.close();}
})();
