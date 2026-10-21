import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('white starter kit is uniform and existing catalog remains',()=>{
 const s=read('js/kits.js');
 assert.match(s,/id:'starter-white'.*primary:'#ffffff'.*secondary:'#ffffff'.*accent:'#ffffff'.*pattern:'solid'/);
 assert.match(s,/kits,defaultId:'japan-01'/);
});
test('picker stays hidden and saved free choices are ignored',()=>{
 const html=read('index.html'),game=read('game.js'),css=read('kit-notebook-fix.css');
 assert.match(html,/id="kit-select" class="kit-select" hidden/);
 assert.match(html,/id="kit-change" hidden/);
 assert.match(game,/let selectedKit=PRIME_KITS\.starter/);
 assert.match(game,/applyKit\(PRIME_KITS\.starter\)/);
 assert.match(game,/\$\('kit-select'\)\.hidden=true/);
 assert.doesNotMatch(game,/localStorage\.getItem\(kitStorageKey\)/);
 assert.match(css,/#kit-change\[hidden\]\{display:none!important\}/);
});
