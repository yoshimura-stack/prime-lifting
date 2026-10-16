/* Mobile-only icon rails: no changes to game input, scoring or persistence. */
(()=>{
 const rail=document.getElementById('mobile-icon-rails'),panel=document.getElementById('mobile-quick-panel');
 if(!rail||!panel)return;
 const content=document.getElementById('mobile-quick-content'),heading=document.getElementById('mobile-quick-heading'),close=document.getElementById('mobile-quick-close');
 let opener=null;
 const labels={titles:'称号の獲得条件',controls:'操作ガイド',coins:'PRIME COIN',score:'得点・ボーナス',stage:'ステージ選択',ranking:'ランキング'};
 function hide(){panel.hidden=true;opener?.focus?.();opener=null}
 function show(key,button){
  opener=button;heading.textContent=labels[key]||'ガイド';content.replaceChildren();
  if(key==='titles'){hide();document.getElementById('title-guide-open')?.click();return}
  if(key==='coins'){hide();document.getElementById('prime-coin-info-open')?.click();return}
  if(key==='ranking'){hide();document.getElementById('view-ranking')?.click();return}
  if(key==='controls'){
   const p=document.createElement('div');p.innerHTML='<p>◉ 左スティック：左右移動</p><p>JUMP：ジャンプ（空中タッチでAIR BONUS）</p><p>SPIN：スピン（次の成功タッチでボーナス）</p><p>KICK：ボールアクション</p>';content.append(p);
  }
  if(key==='score'){
   const source=document.querySelector('.score-guide .score-list');
   if(source)content.append(source.cloneNode(true));
   const p=document.createElement('p');p.textContent='ジャンプ連続・スピン・4回転などの高難度ボーナスも獲得できます。';content.append(p);
   const b=document.createElement('button');b.type='button';b.textContent='⚡ 高難度ボーナス詳細';b.addEventListener('click',()=>{hide();document.getElementById('bonus-guide-open')?.click()});content.append(b);
  }
  if(key==='stage'){
   for(const [id,label] of [['stage-training','01 TRAINING LAB'],['stage-arena','02 WORLD ARENA'],['stage-preview','👁 WORLD ARENAを見学'],['next-level-open','👑 NEXT LEVEL 称号']]){
    const original=document.getElementById(id);if(!original||original.hidden)continue;
    const b=document.createElement('button');b.type='button';b.textContent=original.textContent?.trim()||label;b.disabled=original.disabled;
    b.addEventListener('click',()=>{hide();original.click()});content.append(b);
   }
   const hint=document.getElementById('stage-hint');if(hint){const p=document.createElement('p');p.textContent=hint.textContent;content.append(p)}
  }
  panel.hidden=false;close.focus();
 }
 rail.addEventListener('click',e=>{const b=e.target.closest('button[data-mobile-panel]');if(b)show(b.dataset.mobilePanel,b)});
 close.addEventListener('click',hide);
 panel.addEventListener('click',e=>{if(e.target===panel)hide()});
 document.addEventListener('keydown',e=>{if(!panel.hidden&&e.key==='Escape'){e.preventDefault();hide()}});
})();
