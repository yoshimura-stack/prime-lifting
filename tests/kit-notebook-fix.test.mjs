import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
test('retired uniform picker assets are absent',()=>{
 for(const file of ['kit-notebook-fix.css','js/kit-notebook-fix.js','mobile-kit-portrait.css'])
  assert.equal(existsSync(new URL(file,root)),false,file+' must stay retired');
});
test('game and HTML do not reintroduce the retired picker',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 const game=readFileSync(new URL('game.js',root),'utf8');
 assert.doesNotMatch(html,/id="kit-select"|id="kit-change"|kit-notebook-fix|mobile-kit-portrait/);
 assert.doesNotMatch(game,/openKitSelect|renderKitTabs|renderKitGrid|kitStorageKey/);
});
