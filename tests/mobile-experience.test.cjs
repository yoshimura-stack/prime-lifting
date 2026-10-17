const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=(file)=>fs.readFileSync(path.join(root,file),'utf8');

test('daily challenge visual status only lights after observed qualifying hits',async()=>{
 const day={textContent:''};
 const list={children:[],attributes:{},
  replaceChildren(...nodes){this.children=nodes;},
  append(node){this.children.push(node);},
  setAttribute(name,value){this.attributes[name]=value;}
 };
 const document={getElementById(id){return id==='daily-day'?day:id==='daily-preview-list'?list:null;},
  createElement(){return {textContent:'',className:'',attributes:{},setAttribute(name,value){this.attributes[name]=value;}};},
  addEventListener(){}};
 const dates=[
 {day:'2026-10-17',challenges:[
  {id:'foot2',difficulty:'easy',metric:'foot',target:2,label:'足2回'},
  {id:'spin2',difficulty:'normal',metric:'spin',target:2,label:'回転2回'},
  {id:'quad1',difficulty:'hard',metric:'quad',target:1,label:'4回転'}]},
 {day:'2026-10-18',challenges:[
  {id:'foot2',difficulty:'easy',metric:'foot',target:2,label:'足2回'},
  {id:'spin2',difficulty:'normal',metric:'spin',target:2,label:'回転2回'},
  {id:'quad1',difficulty:'hard',metric:'quad',target:1,label:'4回転'}]}
 ];
 let requests=0;
 const fetch=async()=>({ok:true,json:async()=>dates[Math.min(requests++,dates.length-1)]});
 const context={document,fetch,console};
 vm.runInNewContext(source('js/daily-preview.js'),context);
 await new Promise(setImmediate);
 const daily=context.PRIME_DAILY;
 assert.ok(daily,'daily controller exposed');
 assert.equal(list.children.length,3);
 assert.deepEqual(list.children.map(x=>x.className),['','','']);
 daily.begin();
 daily.hit({name:'FOOT',combo:1,spinCount:0,jumped:false});
 assert.equal(list.children[0].className,'','one foot hit is insufficient');
 daily.hit({name:'FOOT',combo:2,spinCount:1,jumped:false});
 assert.equal(list.children[0].className,'is-complete','two foot touches earn visual check');
 assert.equal(list.children[1].className,'','one spin is insufficient');
 daily.hit({name:'KNEE',combo:3,spinCount:1,jumped:true});
 assert.equal(list.children[1].className,'is-complete');
 daily.hit({name:'FOOT',combo:4,spinCount:4,jumped:true});
 assert.equal(list.children[2].className,'is-complete');
 assert.equal(list.attributes['aria-label'],'今日の達成 3 / 3');
 daily.begin();
 assert.equal(list.children[0].className,'is-complete','completion stays lit across plays this visit');
 await daily.refresh();
 assert.equal(day.textContent,'2026-10-18 (JST)');
 assert.deepEqual(list.children.map(x=>x.className),['','',''],'new JST day clears the visual state');
 assert.doesNotMatch(source('js/daily-preview.js'),/daily_award|\\bPOST\\b|earnedPlayCoins/,'visual-only controller must not award daily credit');
});

test('mobile podium is read-only, confined to non-playing landscape, and respects reduced motion',()=>{
 const css=source('mobile-king-marquee.css');
 const js=source('js/mobile-king-marquee.js');
 const html=source('index.html');
 const build=source('scripts/build.mjs');
 assert.match(css,/body\.touch-landscape:not\(\.mobile-in-game\) \.mobile-king-marquee/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/has\(#kit-select:not\(\[hidden\]\)\)/);
 assert.doesNotMatch(js,/fetch\s*\(/,'reuse existing leaderboard DOM');
 assert.match(js,/MutationObserver/);
 assert.match(js,/for\(let i=0;i<2;i\+\+\)/,'track must loop seamlessly');
 assert.match(html,/mobile-king-marquee\.css\?v=mobile-podium-result-2/);
 assert.match(css,/@keyframes mobile-podium-scroll\{from\{transform:translateX\(0\)\}to\{transform:translateX\(-50%\)\}\}/,'ticker scrolls rank 1 first toward rank 3');
 assert.match(css,/body\.touch-landscape #overlay:not\(\[hidden\]\) > #start\s*\{\s*bottom:calc\(max\(2px,env\(safe-area-inset-bottom\)\) \+ clamp\(19px,4\.6dvh,28px\) \+ 10px\)!important/,'Play and Replay stay above ticker');
 assert.match(css,/body\.touch-landscape #overlay:has\(#result-ranking:not\(\[hidden\]\)\) #result-top\s*\{\s*display:none!important/,'redundant mobile TOP10 and refresh button hidden');
 assert.match(html,/id="mobile-result-ranking"/,'overall ranking button stays available');
 assert.match(html,/id="ranking-dialog"/,'full leaderboard remains available');
 assert.match(html,/js\/mobile-king-marquee\.js\?v=mobile-podium-1/);
 assert.ok(build.includes("'mobile-king-marquee.css'"),'Cloudflare public folder must contain the marquee CSS');
});
