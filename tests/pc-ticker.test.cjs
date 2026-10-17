const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('PC ticker streams the existing TOP10 without gaps or additional network requests',()=>{
 const js=read('js/pc-cockpit.js');
 const css=read('pc-cockpit.css');
 const html=read('index.html');

 assert.match(js,/ticker\.className='pc-king-ticker'/,'keep the same ticker surface');
 assert.match(js,/ticker\.append\(windowEl\)/,'no fixed champion label');
 assert.match(js,/document\.getElementById\('rank-rows'\)/,'reuse the existing leaderboard list');
 assert.match(js,/\.slice\(0,10\)/,'stream at most ten leaderboard entries');
 assert.match(js,/MutationObserver\(update\)/,'refresh when ranking.js updates the leaderboard');
 assert.match(js,/observer\.observe\(rankRows,/,'observe the existing TOP10 list');
 assert.doesNotMatch(js,/fetch\(|\/api\/leaderboard/,'do not add network requests for the ticker');
 assert.match(js,/const copies=width>0\?Math\.max\(2,Math\.ceil\(viewport\/width\)\+1\):2/,'duplicate enough content to fill even wide monitors');
 assert.match(js,/track\.style\.setProperty\('--pc-ticker-distance',width\+'px'\)/,'move exactly one segment per cycle');
 assert.match(js,/Math\.max\(20,Math\.round\(width\/58\)\)/,'keep speed legible regardless of list length');
 assert.match(js,/\['👑','🥈','🥉'\]/,'keep podium medal hierarchy');
 assert.match(js,/document\.getElementById\('view-ranking'\)\?\.click\(\)/,'ticker opens full leaderboard');
 assert.match(css,/\.pc-ticker-window\{flex:1;width:100%;min-width:0;overflow:hidden/,'scroll window fills the bar');
 assert.match(css,/\.pc-ticker-track>span\{white-space:nowrap;padding-right:48px\}/,'seamless repeat interval');
 assert.match(css,/@keyframes prime-king-marquee\{from\{transform:translateX\(0\)\}to\{transform:translateX\(calc\(-1 \* var\(--pc-ticker-distance, 50%\)\)\)\}\}/,'scroll right to left by one segment');
 assert.doesNotMatch(css,/\.pc-ticker-king\{|\.pc-ticker-label\{/,'no pinned champion styles');
 assert.match(html,/pc-cockpit\.css\?v=top10-seamless-1/,'cache bust stylesheet');
 assert.match(html,/js\/pc-cockpit\.js\?v=top10-seamless-1/,'cache bust logic');
});

test('PC trophy opens the same full-screen online leaderboard as ranking button',()=>{
 const js=read('js/pc-cockpit.js'),html=read('index.html');
 assert.match(js,/\['🏆','現在のランキング',\[\],'view-ranking'\]/,'trophy uses existing leaderboard opener');
 assert.doesNotMatch(js,/\['🏆'[^\n]*\.record-card/,'trophy must not relocate podium into cramped right popup');
 assert.match(js,/if\(clickId\)\{hide\(false\);document\.getElementById\(clickId\)\?\.click\(\);return\}/,'close legacy popup and open existing leaderboard');
 assert.match(html,/id="ranking-dialog"[^>]*role="dialog"/,'full ranking dialog still present');
 assert.match(html,/id="ranking-dialog-list"/,'full ranking list still present');
});

test('PC wide field reveals extra scenery without stretching 2D game coordinates',()=>{
 const css=read('pc-cockpit.css');
 const renderer=read('js/renderer3d.js');
 const html=read('index.html');
 assert.match(css,/\.game-shell\.pc-wide-scene\s*\{[\s\S]*?aspect-ratio:auto/,'wide scene fills center stage');
 assert.match(css,/\.game-shell\.pc-wide-scene #game\s*\{[\s\S]*?aspect-ratio:1000\/620/,'game overlay keeps original ratio');
 assert.match(renderer,/syncViewport\(\)/,'renderer synchronizes 3D view with stage');
 assert.match(renderer,/const expanded=Boolean\(desktop&&stage\?\.clientHeight&&/,'wide scene only enabled for desktop');
 assert.match(renderer,/stage\.clientWidth>stage\.clientHeight\*\(1000\/620\)\+8/,'width extension only when unused side space exists');
 assert.match(renderer,/this\.camera\.left=-width\/2/,'orthographic camera widens rather than stretching model');
 assert.match(renderer,/this\.camera\.right=width\/2/);
 assert.match(renderer,/this\.camera\.updateProjectionMatrix\(\)/);
 assert.match(html,/js\/renderer3d\.js\?v=wide-field-2/,'cache bust Three.js rendering update');
});
