const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('update bulletin is informational and wired to desktop and mobile rails',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const pc=fs.readFileSync('js/pc-cockpit.js','utf8');
 const news=fs.readFileSync('js/update-news.js','utf8');
 assert.match(html,/data-open-updates aria-label="アップデート情報"/);
 assert.match(html,/id="update-news-dialog"/);
 assert.match(html,/id="update-news-close"/);
 assert.match(pc,/\['🔔','アップデート情報',\[\],'update-news-dialog'\]/);
 assert.match(news,/data-open-updates/);
 assert.match(news,/Escape/);
 for(const phrase of ['PRIME COIN','COMING SOON','デイリーチャレンジ加点','100PTS','300PTS','毎月1日'])assert.ok(html.includes(phrase),phrase);
 assert.match(html,/現在はまだ加点されません/);
});
