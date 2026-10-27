import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/boost-slot-client.mjs',import.meta.url),'utf8');
test('preview remains disabled and requires authenticated inventory',()=>{
 assert.match(source,/get\('operator'\)==='1'/);
 assert.match(source,/get\('demo'\)!=='1'/);
 assert.match(source,/\/api\/boost-preview\/inventory/);
 assert.match(source,/authorization:'Bearer '\+token/);
 assert.match(source,/Number\.isInteger\(value\?\.\[type\]\)/);
 assert.match(source,/token='';view\.setStatus/);
});

test('authenticated slot awards welcome pack before inventory and refreshes stock after spin',()=>{
 assert.match(source,/const welcome=await requestWelcomeGrant\(\)/);
 assert.match(source,/const inventory=await readInventory\(\)/);
 assert.match(source,/\/api\/boost-preview\/welcome-grant/);
 assert.match(source,/typeof value\?\.alreadyGranted!=='boolean'/);
 assert.match(source,/const result=await response\.json\(\);\s*const updated=await readInventory\(\)/);
 assert.match(source,/root\.after\(stock\)/);
 assert.match(source,/get\('operator'\)==='1'/);
 assert.match(source,/get\('demo'\)!=='1'/);
});

test('demo slot is explicitly nonpersistent and starts with one of each',()=>{
 assert.match(source,/get\('demo'\)==='1'/);
 assert.match(source,/const inventory=\{time:1,score:1,sc:1\}/);
 assert.match(source,/const total=40\+eligible\.length\*20/);
 assert.match(source,/completed=true/);
 assert.match(source,/保存・本番反映なし/);
 assert.doesNotMatch(source.slice(source.indexOf('if(new URLSearchParams(location.search)')),/fetch\(/);
});

test('operator login requires explicit opt-in and keeps token in memory only',()=>{
 assert.match(source,/if\(SLOT_BROWSER_ENABLED\)/);
 assert.match(source,/tokenInput\.disabled=false/);
 assert.match(source,/connectButton\.disabled=false/);
 assert.match(source,/window\.addEventListener\('pagehide',\(\)=>\{token='';\}\)/);
 assert.doesNotMatch(source,/localStorage|sessionStorage/);
});

test('successful operator connection retains welcome receipt and authoritative stock on screen',()=>{
 assert.match(source,/stock\.textContent=renderStock\(inventory,welcome,daily\)/);
 assert.match(source,/connectButton\.disabled=true/);
 assert.match(source,/stock\.textContent=renderStock\(updated\)/);
});

test('operator login performs welcome then daily grant then inventory read without leaking block locals',()=>{
 const welcome=source.indexOf('const welcome=await requestWelcomeGrant()');
 const daily=source.indexOf('const daily=await requestDailyLoginGrant()');
 const inventory=source.indexOf('const inventory=await readInventory()');
 assert.ok(welcome>=0&&welcome<daily&&daily<inventory,'server grants precede final inventory read');
 assert.match(source,/verified=\{welcome,daily,inventory\}/);
 assert.match(source,/const \{welcome,daily,inventory\}=verified/);
 assert.match(source,/if\(response.status===403\)return Object.freeze\(\{disabled:true\}\)/);
 assert.match(source,/\/api\/boost-preview\/daily-login-grant/);
 assert.match(source,/renderStock\(inventory,welcome,daily\)/);
});
