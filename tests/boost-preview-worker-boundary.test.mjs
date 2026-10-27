import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/boost-preview-worker.mjs';
const origin='https://prime-boost-isolated-preview.example';
const request=(path,headers={})=>new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json','CF-Connecting-IP':'192.0.2.17',...headers},body:'{}'});
const assets={fetch:async()=>new Response('<h1>Staging only</h1>',{headers:{'content-type':'text/html','cache-control':'public,max-age=3600'}})};
const limiter={limit:async()=>({success:true})};
const vars={ASSETS:assets,BOOST_PREVIEW_LIMITER:limiter,BOOST_PREVIEW_PROJECT_ID:'tarnzjkxexlozqqmyqof'};
test('isolated preview static assets have no-store, CSP, noindex and no framing',async()=>{
 const response=await worker.fetch(new Request(origin+'/boost-run-preview.html'),{ASSETS:assets});
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);
 assert.match(response.headers.get('content-security-policy'),/connect-src 'self'/);
 assert.equal(response.headers.get('x-frame-options'),'DENY');
 assert.match(response.headers.get('x-robots-tag'),/noindex/);
});
test('disabled preview never calls staging database or rate limiter',async()=>{
 let calls=0;
 const response=await worker.fetch(request('/api/boost-stage/start'),{...vars,BOOST_PREVIEW_ENABLED:'false',BOOST_PREVIEW_LIMITER:{limit:async()=>{calls++;return {success:true};}}});
 assert.equal(response.status,503);assert.equal(calls,0);
});
test('signed run API requires its own switch and signing secret even when preview enabled',async()=>{
 const enabled={...vars,BOOST_PREVIEW_ENABLED:'true',BOOST_PREVIEW_SESSION_SECRET:'a'.repeat(40),BOOST_PREVIEW_SERVICE_KEY:'staging-test-key'};
 assert.equal((await worker.fetch(request('/api/boost-stage/start'),enabled)).status,503);
 assert.equal((await worker.fetch(request('/api/boost-stage/start'),{...enabled,BOOST_STAGING_RUNS_ENABLED:'true'})).status,503);
 assert.equal((await worker.fetch(request('/api/boost-stage/start'),{...enabled,BOOST_STAGING_RUNS_ENABLED:'true',BOOST_RUN_SIGNING_SECRET:'short'})).status,503);
});
test('preview rejects missing limiter or trusted client IP before DB access',async()=>{
 const enabled={...vars,BOOST_PREVIEW_ENABLED:'true',BOOST_PREVIEW_SESSION_SECRET:'a'.repeat(40),BOOST_PREVIEW_SERVICE_KEY:'staging-test-key'};
 assert.equal((await worker.fetch(request('/api/boost-preview/inventory'),{...enabled,BOOST_PREVIEW_LIMITER:undefined})).status,429);
 assert.equal((await worker.fetch(request('/api/boost-preview/inventory',{'CF-Connecting-IP':''}),enabled)).status,429);
});
test('production project ID cannot enable staging Worker',async()=>{
 const response=await worker.fetch(request('/api/boost-stage/start'),{...vars,BOOST_PREVIEW_ENABLED:'true',BOOST_PREVIEW_PROJECT_ID:'ctxhopadmvasxvjspwoi',BOOST_PREVIEW_SESSION_SECRET:'a'.repeat(40),BOOST_PREVIEW_SERVICE_KEY:'staging-test-key'});
 assert.equal(response.status,503);
});

test('only isolated playable game page permits legacy inline boot scripts',async()=>{
 const game=await worker.fetch(new Request(origin+'/boost-game-preview.html'),{ASSETS:assets});
 const slot=await worker.fetch(new Request(origin+'/boost-slot-preview.html'),{ASSETS:assets});
 assert.match(game.headers.get('content-security-policy'),/script-src 'self' 'unsafe-inline'/);
 assert.match(slot.headers.get('content-security-policy'),/script-src 'self';/);
});

test('legacy production account, ranking, daily and achievements API fail closed on preview host',async()=>{
 for(const path of ['/api/login','/api/ranking','/api/daily','/api/achievements','/api/submit']){
  const response=await worker.fetch(request(path),{ASSETS:assets});
  assert.equal(response.status,404,path);
  assert.equal(response.headers.get('cache-control'),'no-store');
 }
});

test('staging tester PIN login is secret-gated, origin-checked and returns scoped short-lived token',async()=>{
 const url=origin+'/api/boost-preview/tester-login';
 const base={...vars,BOOST_PREVIEW_ENABLED:'true',BOOST_PREVIEW_SESSION_SECRET:'a'.repeat(40),BOOST_PREVIEW_SERVICE_KEY:'staging-test-key'};
 const req=(pin,site=origin)=>new Request(url,{method:'POST',headers:{origin:site,'content-type':'application/json','CF-Connecting-IP':'192.0.2.17'},body:JSON.stringify({pin})});
 assert.equal((await worker.fetch(req('123456'),base)).status,503);
 const env={...base,BOOST_TESTER_PLAYER_ID:'123e4567-e89b-42d3-a456-426614174001',BOOST_TESTER_PIN:'123456'};
 assert.equal((await worker.fetch(req('123456','https://evil.example'),env)).status,403);
 assert.equal((await worker.fetch(req('000000'),env)).status,401);
 const res=await worker.fetch(req('123456'),env);
 assert.equal(res.status,200);
 const body=await res.json();
 assert.equal(body.expiresIn,900);
 assert.match(body.token,/^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/);
});
