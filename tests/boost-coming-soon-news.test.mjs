import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('news icon publishes three distinct unread updates',()=>{
 for(const id of ['mobile-score-parity-20261021','prime-boost-soon-20261021','login-slot-soon-20261021'])
  assert.match(html,new RegExp('data-news-id="'+id+'"'));
 assert.match(html,/data-open-updates/);
});
test('coming soon is explicit, not described as live',()=>{
 assert.match(html,/COMING SOON · 近日実装予定/);
 assert.match(html,/現在は未実装・使用不可です/);
 assert.match(html,/まだプレイ・獲得はできません/);
 assert.match(html,/すでに獲得した自己ベスト・ランキングのスコアはそのまま残ります/);
});
