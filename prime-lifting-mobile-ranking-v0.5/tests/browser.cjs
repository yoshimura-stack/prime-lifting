// Run with Playwright installed locally or NODE_PATH pointing to a bundled copy.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFileSync,mkdirSync}=require('node:fs');
const {resolve,extname}=require('node:path');
const root=resolve(__dirname,'..');
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'ランキングの接続準備中です。ゲストで遊べます。'}));return;}
 const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+require('node:path').sep)){res.writeHead(403);res.end();return;}
 try{let data=readFileSync(file);if(path==='/game.js'){
  // Test-only observation, served in memory; shipping game has no test hooks.
  data=Buffer.from(data.toString().replace(/requestAnimationFrame\(frame\);\r?\n\}\)\(\);/,'requestAnimationFrame(frame);window.__test={g,keys,touch,rankedInput,processEvents,draw,pause};\n})();'));
 }
 res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(8771,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const errors=[],log=[];mkdirSync(resolve(root,'test-results'),{recursive:true});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:956,height:440}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8771/');
   await page.locator('#kit-confirm').click();await page.locator('#start').click();
   await page.waitForFunction(()=>window.__test?.g.phase==='playing');
   assert.equal(await page.locator('#touch-controls').isVisible(),mobile);
   if(!mobile){
    let x=await page.evaluate(()=>__test.g.player.x);await page.keyboard.down('KeyD');await page.waitForTimeout(120);await page.keyboard.up('KeyD');assert.ok(await page.evaluate(()=>__test.g.player.x)>x);
    await page.keyboard.down('KeyA');await page.waitForTimeout(120);await page.keyboard.up('KeyA');
    await page.keyboard.press('Space');assert.ok(await page.evaluate(()=>__test.g.player.vy<0));
    await page.locator('#game').click({button:'right',position:{x:100,y:100}});assert.ok(await page.evaluate(()=>__test.g.player.spin>0));
    await page.waitForTimeout(350);await page.locator('#game').click({position:{x:100,y:100}});assert.ok(await page.evaluate(()=>__test.g.cooldown>0));
    log.push('PC: A/D, Space, left/right click, virtual controls hidden PASS');
   }else{
    const cdp=await context.newCDPSession(page);
    const point=async action=>{const b=await page.locator(`[data-action="${action}"]`).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};};
    const r=await point('right'),j=await point('jump'),k=await point('act');
    const before=await page.evaluate(()=>__test.g.player.x);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...r,id:1}]});await page.waitForTimeout(120);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...r,id:1},{...j,id:2}]});
    assert.equal(await page.evaluate(()=>__test.touch.pointers.size),2);assert.ok(await page.evaluate(()=>__test.g.player.vy<0));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...r,id:1},{...j,id:2},{...k,id:3}]});assert.equal(await page.evaluate(()=>__test.touch.pointers.size),3);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{...j,id:2},{...k,id:3}]});await page.waitForFunction(()=>__test.touch.pointers.size===1);
    assert.ok(await page.evaluate(()=>__test.g.player.x)>before);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(30);assert.equal(await page.evaluate(()=>__test.g.player.vx),0);
    await page.waitForTimeout(250);const cooldown=await page.evaluate(()=>__test.g.cooldown);await page.locator('#game').tap({position:{x:250,y:150}});assert.equal(await page.evaluate(()=>__test.g.cooldown),cooldown);
    const jump=await page.locator('[data-action="jump"]').boundingBox(),spin=await page.locator('[data-action="spin"]').boundingBox();assert.ok(jump.y+jump.height<=spin.y);
    for(const size of [{width:956,height:440},{width:844,height:390},{width:667,height:375}]){
     await page.setViewportSize(size);await page.waitForTimeout(100);
     for(const action of ['left','right','jump','spin','act']){const b=await page.locator(`[data-action="${action}"]`).boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=size.width&&b.y+b.height<=size.height);}
    }
    await page.setViewportSize({width:956,height:440});
    log.push('Mobile emulation: simultaneous 3 pointers, release stops, field tap suppressed, JUMP above SPIN, bounds on 3 viewports PASS');
   }
   await page.screenshot({path:resolve(root,'test-results',mobile?'mobile-playing.png':'pc-playing.png')});
   await page.evaluate(()=>{__test.g.remaining=.01;});await page.waitForFunction(()=>__test.g.phase==='ended');
   assert.ok(await page.locator('#result-ranking').isVisible());assert.match(await page.locator('#save-feedback').innerText(),/ログイン/);
   await page.screenshot({path:resolve(root,'test-results',mobile?'mobile-result.png':'pc-result.png')});
   await page.locator('#start').click();await page.waitForFunction(()=>__test.g.phase==='countdown');
   log.push((mobile?'Mobile':'PC')+': offline result and replay PASS');
   await context.close();
  }
  // UI success/failure paths use explicit fixtures, not the real Supabase DB.
  const context=await browser.newContext({viewport:{width:956,height:440},isMobile:true,hasTouch:true});const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));let submitted=0;
  const player={id:'fixture',name:'TEAM PLAYER',best:15000,rank:2};
  const entries=Array.from({length:10},(_,i)=>({rank:i+1,name:'PLAYER '+(i+1),score:30000-i*1500}));
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;let status=200,data={};
   if(path==='/api/me'){status=401;data={error:'ログインしてください'};}
   if(path==='/api/register'||path==='/api/login')data={player};
   if(path==='/api/leaderboard')data={entries};
   if(path==='/api/game/start')data={token:'fixture-token',ruleset:'cockpit-v42'};
   if(path==='/api/scores'){submitted++;if(submitted===1){status=503;data={error:'通信失敗（テスト）'};}else {data={player:{...player,best:31000,rank:1},score:31000,personalBest:true,newChampion:true};entries[0]={rank:1,name:player.name,score:31000};}}
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:8771/');await page.locator('#kit-confirm').click();
  await page.locator('#player-name').fill('TEAM PLAYER');await page.locator('#player-pin').fill('123456');await page.locator('button[value="register"]').click();
  await page.waitForFunction(()=>document.querySelector('#logout').hidden===false);
  assert.equal(await page.locator('#account-form').isVisible(),false);
  assert.equal(await page.locator('#player-pin').inputValue(),'');assert.match(await page.locator('#mobile-best').innerText(),/30,000/);
  await page.locator('#start').click();await page.waitForFunction(()=>__test.g.phase==='playing');
  await page.evaluate(()=>{__test.g.score=31000;__test.g.remaining=.01;});await page.waitForFunction(()=>__test.g.phase==='ended');
  await page.locator('#save-retry').waitFor({state:'visible'});await page.locator('#save-retry').click();
  await page.waitForFunction(()=>document.querySelector('#record-banner').textContent==='NEW CHAMPION!');
  assert.equal(await page.locator('#rank-rows li').count(),10);assert.match(await page.locator('#personal-result').innerText(),/全体 1位/);
  await page.screenshot({path:resolve(root,'test-results','mobile-ranking-fixture.png')});
  await page.locator('#start').click();await page.waitForFunction(()=>__test.g.phase==='countdown');
  log.push('Ranking UI fixture: registration, champion display, TOP10, rank, failed save then retry, NEW CHAMPION PASS (not real DB)');
  await context.close();
  assert.deepEqual(errors,[]);console.log(log.join('\n'));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
