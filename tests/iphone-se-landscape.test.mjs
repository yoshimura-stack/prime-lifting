import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../iphone-se-landscape.css',import.meta.url),'utf8');
test('SE stylesheet loads after base mobile styles',()=>{
 assert.match(html,/mobile-icon-rails\.css[^"]*"/);
 assert.match(html,/iphone-se-landscape\.css\?v=[^"']+/);
 assert.ok(html.indexOf('iphone-se-landscape.css')>html.indexOf('mobile-icon-rails.css'));
});
test('SE viewport keeps center field bounded with room for edge rails',()=>{
 assert.match(css,/max-height:390px/);
 assert.match(css,/pointer:coarse/);
 assert.match(css,/padding:0 38px!important/);
 assert.match(css,/width:min\(100%,calc\(100dvh \* 1000 \/ 620\)\)!important/);
 assert.match(css,/max-width:100%!important/);
 assert.match(css,/#touch-controls \.touch-actions/);
 assert.match(css,/#mobile-icon-rails/);
});

test('three-circle landscape controls use responsive sizing and no connector strokes',()=>{
 assert.match(css,/--action-unit:clamp\(/);
 assert.match(css,/\[data-action="jump"\]/);
 assert.match(css,/\[data-action="spin"\]/);
 assert.match(css,/\.touch-kick\{/);
 assert.match(css,/width:calc\(var\(--action-unit\) \* 1\.5\)!important/);
 assert.match(css,/\.touch-actions::before,/);
 assert.match(css,/\.touch-actions::after\{content:none!important/);
});
