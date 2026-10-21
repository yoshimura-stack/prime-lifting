(function(){
'use strict';
// UI-only staging preview. Visual selection only; no equip, inventory, slot grants or score changes.
// Hidden unless explicitly opted into a branch preview using ?boostPreview=1.
// Never interpret this flag as server authorization.
const params=new URLSearchParams(location.search);
if(params.get('boostPreview')!=='1')return;
const mount=document.getElementById('account-panel');
if(!mount)return;
const section=document.createElement('section');
section.id='prime-boost-preview';
section.className='prime-boost-preview';
section.setAttribute('aria-label','PRIME BOOST 開発中プレビュー');
const heading=document.createElement('div');
heading.className='prime-boost-heading';
heading.innerHTML='<strong>⚽ PRIME BOOST</strong><small>PLAY READY PREVIEW · 未接続</small>';
section.append(heading);
const cards=document.createElement('div');cards.className='prime-boost-cards';
for(const {type,label,detail,color} of [
 {type:'time',label:'+5 SEC',detail:'制限時間 +5秒',color:'#3B82F6'},
 {type:'score',label:'SCORE ×1.1',detail:'PC / MOBILE 共通 ×1.1',color:'#FACC15'},
 {type:'sc',label:'SECOND CHANCE',detail:'最初の落球でコンボを守る',color:'#22C55E'}
]){
 const button=document.createElement('button');
 button.type='button';button.disabled=true;
 button.className='prime-boost-card';button.dataset.boost=type;
 const ball=document.createElement('span');ball.className='prime-boost-ball';ball.style.setProperty('--boost-color',color);
 ball.textContent='⚽';ball.setAttribute('aria-hidden','true');
 const copy=document.createElement('span');copy.className='prime-boost-copy';
 const title=document.createElement('strong');title.textContent=label;
 const description=document.createElement('small');description.textContent=detail;
 copy.append(title,description);
 const count=document.createElement('span');count.className='prime-boost-count';count.textContent='0 / 2';
 button.append(ball,copy,count);cards.append(button);
}
section.append(cards);
// The preview allows choosing a visual candidate only; no stock is spent.
const selection=document.createElement('div');selection.className='prime-boost-selection';
const none=document.createElement('button');none.type='button';none.className='prime-boost-none';none.textContent='BOOSTなし';none.setAttribute('aria-pressed','true');
const selected=document.createElement('small');selected.textContent='選択プレビュー：BOOSTなし（消費なし）';
const readiness=document.createElement('div');readiness.className='prime-boost-readiness';readiness.setAttribute('role','status');readiness.textContent='プレイ準備：サーバー未接続 · BOOST使用不可';
selection.append(none,selected);section.append(selection,readiness);
none.addEventListener('click',()=>{for(const card of cards.children)card.setAttribute('aria-pressed','false');none.setAttribute('aria-pressed','true');selected.textContent='選択プレビュー：BOOSTなし（消費なし）';});
for(const card of cards.children){card.disabled=true;card.setAttribute('aria-pressed','false');card.addEventListener('click',()=>{for(const other of cards.children)other.setAttribute('aria-pressed',String(other===card));none.setAttribute('aria-pressed','false');selected.textContent='選択プレビュー：'+card.querySelector('strong').textContent+'（ゲームには未適用）';});}
// Fail-closed: no real authenticated preview session is connected yet.
// A future trusted preview client may supply a validated inventory snapshot.
// Never read inventory from URL parameters, localStorage or game account DOM.

function showInventory(counts){
 if(!counts||typeof counts!=='object'||Array.isArray(counts))throw new TypeError('Invalid inventory');
 for(const type of ['time','score','sc']){
  if(!Number.isInteger(counts[type])||counts[type]<0||counts[type]>2)throw new RangeError('Invalid BOOST count');
 }
 for(const card of cards.children){
  const count=counts[card.dataset.boost];
  card.querySelector('.prime-boost-count').textContent=count+' / 2';
  card.disabled=count===0;
  if(count===0&&card.getAttribute('aria-pressed')==='true')none.click();
 }
}
function lockInventory(){
 for(const card of cards.children){
  card.disabled=true;card.querySelector('.prime-boost-count').textContent='-- / 2';
 }
 none.click();
}
lockInventory();
// The custom event must be dispatched by a trusted staging integration after
// authenticating to the isolated preview API; untrusted page events are NOT authorization.
// Therefore this event only updates visual UI and cannot equip or consume anything.
section.addEventListener('boost-preview-inventory',event=>{
 try{showInventory(event.detail);}catch{lockInventory();}
});
section.addEventListener('boost-preview-lock',lockInventory);
// Color-only preview links are separate from the disabled equip buttons.
// They reload the same staging page and never authorize item usage.
const previews=document.createElement('nav');previews.className='prime-boost-color-preview';
previews.setAttribute('aria-label','開発用ボール色プレビュー');
for(const [type,label] of [['time','青'],['score','黄'],['sc','緑']]){
 const link=document.createElement('a');const url=new URL(location.href);
 url.searchParams.set('boostPreview','1');url.searchParams.set('boostColor',type);
 link.href=url.toString();link.textContent=label+'のボールを見る';previews.append(link);
}
section.append(previews);

const foot=document.createElement('small');foot.className='prime-boost-lock';foot.textContent='🔒 表示選択のみ：ゲーム開始・付与・消費は無効です';
section.append(foot);
foot.textContent='🔒 準備画面の表示確認専用：ゲーム開始・在庫消費・得点変更なし';
const startButton=document.getElementById('start');
// Anchor the staging preview immediately before the real START button, without
// intercepting its event or changing the game start path.
if(startButton)startButton.before(section);else mount.after(section);
const sync=()=>{const title=document.getElementById('overlay-title')?.textContent||'';
 section.hidden=!!document.getElementById('overlay')?.hidden||title==='一時停止'||!!document.getElementById('result-ranking')?.hidden===false;
};
const overlay=document.getElementById('overlay');
const overlayTitle=document.getElementById('overlay-title');
if(overlay)new MutationObserver(sync).observe(overlay,{attributes:true,attributeFilter:['hidden']});
if(overlayTitle)new MutationObserver(sync).observe(overlayTitle,{childList:true,characterData:true,subtree:true});
sync();
})();
