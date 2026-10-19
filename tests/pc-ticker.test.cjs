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
 assert.match(html,/pc-cockpit\.css\?v=bottom-rail-actions-1/,'cache bust stylesheet');
 assert.match(html,/js\/pc-cockpit\.js\?v=bottom-rail-actions-1/,'cache bust logic');
});

test('PC trophy opens the same full-screen online leaderboard as ranking button',()=>{
 const js=read('js/pc-cockpit.js'),html=read('index.html');
 assert.match(js,/\['🏆','現在のランキング',\[\],'view-ranking'\]/,'trophy uses existing leaderboard opener');
 assert.doesNotMatch(js,/\['🏆'[^\n]*\.record-card/,'trophy must not relocate podium into cramped right popup');
 assert.match(js,/if\(clickId\)\{hide\(false\);document\.getElementById\(clickId\)\?\.click\(\);return\}/,'close legacy popup and open existing leaderboard');
 assert.match(html,/id="ranking-dialog"[^>]*role="dialog"/,'full ranking dialog still present');
 assert.match(html,/id="ranking-dialog-list"/,'full ranking list still present');
});

test('PC wide field reveals extra scenery and signs playable world width',()=>{
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
 assert.match(html,/js\/renderer3d\.js\?v=signed-field-1/,'cache bust Three.js rendering update');
 assert.match(read('game.js'),/window\.PRIME_FIELD_WIDTH=/,'PC gameplay width follows stage');
 assert.match(read('server/worker.mjs'),/worldWidth/,'server signs gameplay width');
});

test('PC rail pause and restart reuse the existing game handlers',()=>{
 const js=read('js/pc-cockpit.js'),game=read('game.js');
 assert.match(js,/\['⏸','一時停止',\[\],'pause'\]/);
 assert.match(js,/\['↻','リスタート',\[\],'restart-pc'\]/);
 assert.match(js,/document\.getElementById\(clickId\)\?\.click\(\)/);
 assert.match(game,/\$\('pause'\)\.onclick=/);
 assert.match(game,/\$\('restart-pc'\)\.onclick=restartRound/);
 assert.match(game,/\$\('restart-confirm'\)\.hidden=false/);
});

test('play start uses ranking ticket world width getter',()=>{
 const game=read('game.js'),ranking=read('js/ranking.js');
 assert.match(game,/PRIME_RANKING\.worldWidth\(\)/,'game reads width before reset');
 assert.match(ranking,/worldWidth:\(\)=>ticket\?\.worldWidth\?\?1000/,'ranking exposes signed width or standard fallback');
});

test('mobile landscape buttons use right-edge triangle without changing actions',()=>{
 const css=read('mobile-ranking.css'),html=read('index.html');
 assert.match(css,/Mobile landscape: right-edge triangle/);
 assert.match(css,/\.touch-landscape \.touch-actions>div\{/);
 assert.match(css,/\.touch-landscape #touch-controls \.touch-actions \.touch-kick\{/);
 assert.match(css,/button\[data-action="jump"\]\{/,'jump positioned separately');
 assert.match(css,/button\[data-action="spin"\]\{/,'spin positioned separately');
 assert.match(css,/right:clamp\(32px,8dvh,46px\)!important/,'jump at upper right');
 assert.match(css,/right:clamp\(82px,19dvh,102px\)!important/,'spin tucked near kick');
 assert.match(css,/right:0!important/);
 assert.match(html,/data-action="jump">JUMP<\/button><button data-action="spin">SPIN<\/button>/);
 assert.match(html,/data-action="act">KICK<\/button>/);
 assert.match(html,/mobile-ranking\.css\?v=clear-actions-1/);
});

test('mobile action buttons keep outlines while remaining translucent',()=>{
 const css=read('mobile-ranking.css'),html=read('index.html');
 assert.match(css,/top:clamp\(34px,8dvh,52px\)!important/,'JUMP is lowered');
 assert.match(css,/\.touch-actions button:not\(\.pressed\)\{/,'action buttons use transparent default');
 assert.match(css,/background:rgba\(12,31,26,\.13\)!important/,'player remains visible through action buttons');
 assert.match(css,/border:2\.5px solid rgba\(236,255,210,\.96\)!important/,'circular outline stays clear');
 assert.match(css,/\.touch-kick:not\(\.pressed\)\{/,'KICK retains transparent accent');
 assert.match(html,/mobile-ranking\.css\?v=clear-actions-1/,'new stylesheet cache version');
});
