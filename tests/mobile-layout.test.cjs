const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const css=fs.readFileSync(path.join(root,'mobile-icon-rails.css'),'utf8');
const expression=game.match(/const isMobile=\(\)=>([^;]+);/)?.[1];
assert.ok(expression,'mobile input predicate exists');
assert.doesNotMatch(expression,/max-width|innerWidth|clientWidth/,'mobile identity cannot depend on viewport width');
const isMobile=new Function('mobileQuery','fineQuery','touchQuery','navigator','window','return ('+expression+');');
const check=(landscape,coarse,fine,touches)=>isMobile({matches:landscape},{matches:fine},{matches:coarse},{maxTouchPoints:touches},{});
assert.equal(check(true,true,false,5),true,'touch phone opened directly in landscape');
assert.equal(check(false,true,false,5),false,'touch phone opened in portrait');
assert.equal(check(true,true,false,5),true,'same phone after rotation into landscape');
assert.equal(check(true,true,true,10),false,'hybrid Surface with mouse stays in PC layout');
assert.equal(check(true,false,false,0),false,'desktop without touch remains desktop');
assert.equal(check(true,false,false,5),true,'touchpoints fallback works');
for(const event of ['orientationchange','resize','pageshow'])assert.ok(game.includes("'"+event+"'"),event+' layout reconciliation');
assert.match(css,/main\.game-app>\.side-panel/,'desktop sidebars hidden in touch layout');
assert.match(css,/mobile-icon-rails>\.mobile-icon-column/,'mobile icon columns use explicit vertical flow');

assert.match(css,/body\.touch-landscape #mobile-icon-rails\s*\{\s*left:0!important;\s*right:0!important;\s*width:100%!important;/,'left and right rails remain at viewport edges');
assert.match(css,/padding-left:3px!important;\s*padding-right:3px!important;/,'do not double apply landscape safe-area padding');
const buildSource=fs.readFileSync(path.join(root,'scripts/build.mjs'),'utf8');
for(const asset of ['pc-cockpit.css','mobile-icon-rails.css']){
 assert.ok(buildSource.includes("'"+asset+"'"),asset+' must be deployed with Worker assets');
}
assert.match(buildSource,/await access\(new URL\(asset,target\)\)/,'build must verify linked CSS exists in public');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.doesNotMatch(html,/id="kit-select"|id="kit-change"|mobile-kit-portrait\.css|kit-notebook-fix/,'retired kit selector must not load');
assert.doesNotMatch(game,/renderKitTabs|renderKitGrid|openKitSelect|kitStorageKey/,'retired kit selection logic must not return');
assert.match(html,/mobile-icon-rails\.css\?v=sidebar-controls-2/,'mobile edge-aligned rails stylesheet is fresh');
console.log('Mobile orientation layout checks passed');
