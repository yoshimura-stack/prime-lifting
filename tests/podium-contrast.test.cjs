const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');

test('mobile ticker separates rank, player name and score into semantic text nodes',()=>{
 class Element {
  constructor(tag){this.tag=tag;this.className='';this.children=[];this.attributes={};this._text='';}
  set textContent(value){this._text=String(value);this.children=[]}
  get textContent(){return this._text||this.children.map(n=>n.textContent).join('')}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=[...nodes];this._text=''}
  setAttribute(name,value){this.attributes[name]=value}
  querySelector(){return null}
 }
 const names={
  'leader-best-name':'bibant','leader-best-score':'81,060 PTS',
  'leader-second-name':'メッシ(本人)','leader-second-score':'67,100 PTS',
  'leader-third-name':'ルイージ横B','leader-third-score':'61,450 PTS'
 };
 const body=new Element('body');
 const document={body,getElementById(id){return id in names?{textContent:names[id],querySelector(){return null}}:null},
  createElement(tag){return new Element(tag)}};
 class MutationObserver {observe(){}}
 vm.runInNewContext(read('js/mobile-king-marquee.js'),{document,MutationObserver});
 const ticker=body.children[0];assert.equal(ticker.className,'mobile-king-marquee');
 assert.equal(ticker.children.length,1,'no fixed KING label');
 const sections=ticker.children[0].children[0].children;
 assert.equal(sections.length,2,'two equal segments for seamless scrolling');
 for(const segment of sections){
  assert.equal(segment.children.length,6,'three rows separated by divider glyphs');
  for(let i=0;i<3;i++){
   const row=segment.children[i*2];
   const [rank,name,points]=row.children;
   assert.equal(rank.className,'mobile-podium-place mobile-podium-place-'+(i+1));
   assert.equal(name.className,'mobile-podium-name');
   assert.equal(points.className,'mobile-podium-score');
   assert.equal(segment.children[i*2+1].textContent,'✦');
  }
 }
 assert.equal(sections[0].children[0].children[1].textContent,'bibant');
 assert.equal(sections[0].children[2].children[1].textContent,'メッシ(本人)');
 assert.equal(sections[0].children[4].children[1].textContent,'ルイージ横B');
 assert.match(ticker.attributes['aria-label'],/1位 bibant 81,060 PTS/);
});

test('medal colors and typography match between mobile and PC',()=>{
 const mobileJs=read('js/mobile-king-marquee.js');
 const pcJs=read('js/pc-cockpit.js');
 const mobileCss=read('mobile-king-marquee.css');
 const pcCss=read('pc-cockpit.css');
 const html=read('index.html');
 const colors=['#F6D44A','#D7DDE5','#C98A4A'];
 for(const [js,css,scope] of [
  [mobileJs,mobileCss,'mobile-podium'],
  [pcJs,pcCss,'pc-ticker']
 ]){
  for(let rank=1;rank<=3;rank++){
   assert.ok(js.includes(scope+"-place-'+e.place"),'dynamic rank color class is generated');
   assert.ok(css.includes('.'+scope+'-place-'+rank+'{color:'+colors[rank-1]+'}'),'rank '+rank+' medal color');
  }
  assert.ok(js.includes(scope+'-name'),'separate white player name node');
  assert.ok(js.includes(scope+'-score'),'separate score node');
  assert.ok(css.includes('.'+scope+'-name{color:#F5F7F2'),'white player names');
  assert.ok(css.includes('.'+scope+'-score{color:#FFE9A2'),'subtle cream scores');
  if(scope==='mobile-podium')assert.match(js,/for\(let i=0;i<2;i\+\+\)/,'mobile marquee keeps two segments');
  else assert.match(js,/for\(let i=1;i<copies;i\+\+\)/,'PC marquee repeats enough segments for its viewport');
  assert.doesNotMatch(js,/innerHTML\s*=/,'player names must only use textContent');
 }
 assert.match(pcCss,/\.pc-king-ticker\{[^\n]*background:#10241a/,'PC background dark enough for white names');
 assert.match(html,/mobile-king-marquee\.css\?v=podium-contrast-4/);
 assert.match(html,/js\/mobile-king-marquee\.js\?v=podium-contrast-4/);
 assert.match(html,/pc-cockpit\.css\?v=top10-seamless-1/);
 assert.match(html,/js\/pc-cockpit\.js\?v=top10-seamless-1/);
});
