const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('PC ticker is full-width with all three places scrolling and no pinned champion',()=>{
 const js=read('js/pc-cockpit.js');
 const css=read('pc-cockpit.css');
 const html=read('index.html');

 assert.match(js,/ticker\.className='pc-king-ticker'/,'keep ticker and its ranking action');
 assert.match(js,/ticker\.append\(windowEl\)/,'only the scrolling window is appended to ticker');
 assert.doesNotMatch(js,/pc-ticker-label|pc-ticker-king|fixed\.after\(king\)|king\.textContent/,'no pinned ranking or duplicated champion');
 assert.match(js,/const ranks=\[\['👑','leader-best-name','leader-best-score'\],\['🥈','leader-second-name','leader-second-score'\],\['🥉','leader-third-name','leader-third-score'\]\]/,'stream in 1st, 2nd, 3rd order');
 assert.match(js,/document\.getElementById\('view-ranking'\)\?\.click\(\)/,'click still opens full ranking');
 assert.match(js,/for\(let i=0;i<2;i\+\+\)/,'stream contains two copies for continuous loop');
 assert.match(css,/\.pc-ticker-window\{flex:1;width:100%;min-width:0;overflow:hidden/,'full width scroll window');
 assert.match(css,/\.pc-ticker-track>span\{white-space:nowrap;padding-right:48px\}/,'repeat interval stays seamless');
 assert.match(css,/@keyframes prime-king-marquee\{from\{transform:translateX\(0\)\}to\{transform:translateX\(-50%\)\}\}/,'scroll right to left');
 assert.doesNotMatch(css,/\.pc-ticker-king\{|\.pc-ticker-label\{/,'remove old pinned styles');
 assert.match(html,/pc-cockpit\.css\?v=fullwidth-ticker-1/,'load new stylesheet');
 assert.match(html,/js\/pc-cockpit\.js\?v=fullwidth-ticker-1/,'load updated ticker logic');
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
