import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('isolated build replaces normal game entry with staging bootstrap, never duplicates it',()=>{
 const script=read('scripts/build-boost-preview.mjs');
 assert.match(script,/boost-game-preview\.html/);
 assert.match(script,/boost-playable-staging-bootstrap\.mjs/);
 assert.match(script,/Unsafe double game boot/);
 assert.match(script,/Cannot locate game script/);
});
test('staging playable bootstrap requires bearer and verified inventory, never enables by URL alone',()=>{
 const script=read('js/boost-playable-staging-bootstrap.mjs');
 assert.match(script,/createBoostStagingHttpClient/);
 assert.match(script,/window\.PRIME_STAGING_RUN_FLOW=bridge/);
 assert.match(script,/inventory=await refresh\(\)/);
 assert.match(script,/if\(!client\|\|!inventory\)throw new Error\('STAGING authentication required'\)/);
 assert.match(script,/inventory=null;/);
 assert.match(script,/inventory=await refresh\(\)/);
 assert.doesNotMatch(script,/localStorage|sessionStorage|service_role|location\.search/);
});

test('playable staging login grants welcome then daily before reading authoritative inventory',()=>{
 const script=read('js/boost-playable-staging-bootstrap.mjs');
 const welcome=script.indexOf("loginGrant('/api/boost-preview/welcome-grant')");
 const daily=script.indexOf("loginGrant('/api/boost-preview/daily-login-grant')");
 const inventory=script.indexOf('inventory=await refresh()');
 assert.ok(welcome>=0&&welcome<daily&&daily<inventory);
 assert.match(script,/if\(!res\.ok\)throw new Error\('BOOST login grant HTTP '/);
 assert.match(script,/if\(typeof daily\?\.day!=='string'\|\|typeof daily\.replayed!=='boolean'\)/);
 assert.doesNotMatch(script,/localStorage|sessionStorage|service_role/);
});

test('completed staging run re-fetches stock before allowing another START',()=>{
 const script=read('js/boost-playable-staging-bootstrap.mjs');
 assert.match(script,/const result=await client\.finish\(payload\);[\s\S]*inventory=null;[\s\S]*inventory=await refresh\(\)/);
 assert.match(script,/selected=null;/);
 assert.match(script,/在庫再取得に失敗。再接続してください/);
});
