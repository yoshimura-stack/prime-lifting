import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ranking=readFileSync(new URL('../js/ranking.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../ranking-daily-breakdown.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('verified BOOST badges use visible soccer ball and exact labels',()=>{
 assert.match(ranking,/badge\.textContent='⚽ '\+\{time:'\+5 SEC',score:'×1\.1',sc:'SC'\}\[kind\]/);
 for(const kind of ['time','score','sc'])assert.match(css,new RegExp('\\.rank-boost-'+kind+'\\{'));
 assert.match(index,/ranking-daily-breakdown\.css/);
});
test('BOOST badges do not add a score bonus row',()=>{
 assert.doesNotMatch(ranking,/part\('⚡',boostBonus/);
});
