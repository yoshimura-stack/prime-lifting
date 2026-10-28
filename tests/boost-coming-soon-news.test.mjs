import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('news icon retains current mobile score and BOOST announcements',()=>{
 for(const id of ['mobile-score-parity-20261021','prime-boost-soon-20261021'])
  assert.match(html,new RegExp('data-news-id="'+id+'"'));
 assert.match(html,/data-open-updates/);
 assert.doesNotMatch(html,/login-slot-soon-20261021|ログインルーレット|デイリースロット/);
});
test('BOOST remains clearly unavailable and describes the daily rules',()=>{
 assert.match(html,/COMING SOON · 近日実装予定/);
 assert.match(html,/現在は準備中・使用不可です/);
 assert.match(html,/各種類を1日1回ずつ使用可能/);
 assert.match(html,/日本時間0時に復活/);
 assert.match(html,/すでに獲得した自己ベスト・ランキングのスコアはそのまま残ります/);
});
