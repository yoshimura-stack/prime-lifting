// Optional visual check: npm install --no-save playwright, with Edge installed.
// No production hooks, credentials or database requests are used.
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFileSync,mkdirSync,writeFileSync}=require('node:fs');
const {resolve,extname,sep}=require('node:path');
const assert=require('node:assert/strict');
const root=resolve(__dirname,'..'),output=resolve(process.env.ARENA_CAPTURE_DIR||resolve(root,'../arena-review'));
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});return res.end('{"error":"Offline visual review"}');}
 const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep)){res.writeHead(403);return res.end();}
 try{let data=readFileSync(file);if(path==='/game.js')data=Buffer.from(data.toString().replace('renderer3d=new PrimeRenderer($(\'scene\'),c);','renderer3d=new PrimeRenderer($(\'scene\'),c);window.__arenaReview={renderer:renderer3d,game:g};'));
 res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
});
(async()=>{
 mkdirSync(output,{recursive:true});await new Promise(r=>server.listen(8772,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8772/');await page.waitForFunction(()=>window.__arenaReview?.renderer);
  await page.locator('#kit-confirm').click();await page.evaluate(()=>document.querySelector('#overlay').hidden=true);
  assert.ok(await page.locator('#stage-arena').isDisabled());
  const snapshot=()=>page.evaluate(()=>{const {renderer:r,game:g}=__arenaReview;return {camera:r.camera.projectionMatrix.elements,player:r.player.group.scale.toArray(),score:g.score,phase:g.phase,physics:JSON.stringify(g.c)};});
  const before=await snapshot();
  await page.screenshot({path:resolve(output,'training.png')});
  await page.locator('#stage-preview').click();await page.waitForTimeout(200);
  assert.deepEqual(await snapshot(),before);assert.ok(await page.locator('#stage-arena').isDisabled());
  await page.screenshot({path:resolve(output,'arena.png')});await page.locator('.game-shell').screenshot({path:resolve(output,'arena-scene.png')});
  const stats=await page.evaluate(async()=>{
   const {renderer:r}=__arenaReview;const frames=[];let last=performance.now();for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);const n=performance.now();frames.push(n-last);last=n;}
   const sorted=frames.slice(10).sort((a,b)=>a-b),info=r.renderer.info;
   const memory={...info.memory};for(let i=0;i<20;i++){r.setStage(1);r.setStage(2);}r.render(__arenaReview.game);
   return {calls:info.render.calls,triangles:info.render.triangles,medianFrameMs:sorted[Math.floor(sorted.length/2)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],memory,afterSwitching:{...info.memory},trainingHidden:!r.trainingGroup.visible,arenaVisible:r.arena.group.visible,staff:r.arena.group.userData.staffCount,crowd:r.arena.group.userData.crowdCount};
  });
  assert.deepEqual(stats.memory,stats.afterSwitching);assert.ok(stats.trainingHidden&&stats.arenaVisible);
  await page.locator('#stage-preview').click();assert.equal(await page.evaluate(()=>__arenaReview.renderer.stage),1);
  // Exercise the existing progress listener; no real account is modified.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('prime:progress',{detail:{master:false}})));assert.ok(await page.locator('#stage-arena').isDisabled());
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('prime:progress',{detail:{master:true}})));await page.locator('#stage-arena').click();assert.equal(await page.evaluate(()=>__arenaReview.renderer.stage),2);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('prime:progress',{detail:{master:false}})));assert.equal(await page.evaluate(()=>__arenaReview.renderer.stage),1);
  const visualCoverage=await page.evaluate(()=>{
   const {renderer:r,game:g}=__arenaReview,copy=JSON.stringify(g),model=r.player;
   const deepFreeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);Object.values(o).forEach(deepFreeze);}return o;};
   let poses=0;
   for(const stage of [1,2]){r.setStage(stage);for(const action of ['FOOT','KNEE','CHEST','HEADER','JUMP_HEADER','SHOULDER','MISS'])for(const side of ['LEFT','RIGHT']){
    const state=JSON.parse(copy);state.action=action;state.actionTime=.1;state.actionSide=side;r.render(deepFreeze(state));poses++;
    model.group.traverse(m=>{if(m.isMesh&&!m.matrixWorld.elements.every(Number.isFinite))throw Error('Invalid model transform');});
   }}
   for(const spin of [0,.15])for(const vx of [-200,200]){const state=JSON.parse(copy);state.player.spin=spin;state.player.vx=vx;state.player.y-=40;r.render(deepFreeze(state));poses++;}
   for(const kit of PRIME_KITS.kits||[]){r.setKit(kit);r.render(g);}
   if(JSON.stringify(g)!==copy)throw Error('Renderer mutated engine state');
   r.setKit(PRIME_KITS.get(PRIME_KITS.defaultId));r.setStage(2);r.render(g);return {poses,kits:PRIME_KITS.kits.length,sharedModel:r.player===model};
  });stats.visualCoverage=visualCoverage;
  const mobile=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto('http://127.0.0.1:8772/');await mobile.waitForFunction(()=>window.__arenaReview?.renderer);
  await mobile.locator('#kit-confirm').click();await mobile.evaluate(()=>{document.querySelector('#overlay').hidden=true;__arenaReview.renderer.setStage(2);});await mobile.waitForTimeout(200);
  await mobile.screenshot({path:resolve(output,'arena-mobile-regression.png')});await mobile.close();
  assert.deepEqual(errors,[]);writeFileSync(resolve(output,'metrics.json'),JSON.stringify(stats,null,2));console.log(JSON.stringify(stats,null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});