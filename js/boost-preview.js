(function(){
'use strict';
// UI-only staging preview. No equip, inventory, slot grants or score changes.
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
heading.innerHTML='<strong>⚽ PRIME BOOST</strong><small>DEVELOPMENT PREVIEW · 使用不可</small>';
section.append(heading);
const cards=document.createElement('div');cards.className='prime-boost-cards';
for(const {type,label,detail,color} of [
 {type:'time',label:'+5 SEC',detail:'制限時間 +5秒',color:'#3B82F6'},
 {type:'score',label:'SCORE ×1.1',detail:'PC ×1.1 / MOBILE ×1.2',color:'#FACC15'},
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
const foot=document.createElement('small');foot.className='prime-boost-lock';foot.textContent='🔒 開発中：選択・付与・消費は無効です';
section.append(foot);
mount.after(section);
const sync=()=>{section.hidden=!!document.getElementById('overlay')?.hidden||document.getElementById('overlay-title')?.textContent==='一時停止';};
new MutationObserver(sync).observe(document.getElementById('overlay'),{attributes:true,attributeFilter:['hidden']});
new MutationObserver(sync).observe(document.getElementById('overlay-title'),{childList:true,characterData:true,subtree:true});
sync();
})();
