import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../kit-notebook-fix.css',import.meta.url),'utf8');
const script=readFileSync(new URL('../js/kit-notebook-fix.js',import.meta.url),'utf8');
test('uniform picker escapes the clipped game shell without cloning elements',()=>{
 assert.match(script,/document\.body\.appendChild\(picker\)/);
 assert.doesNotMatch(script,/cloneNode/);
});
test('notebook picker keeps the confirm button and hides ranking marquee',()=>{
 assert.match(css,/\.kit-grid\{[^}]*overflow-y:auto/);
 assert.match(css,/\.kit-actions\{[^}]*flex:0 0 auto/);
 assert.match(css,/\.pc-king-ticker/);
 assert.match(css,/#mobile-king-marquee/);
 assert.match(css,/#daily-preview/);
});
