(()=>{'use strict';
const el=id=>document.getElementById(id),dialog=el('admin-dialog');
if(!dialog)return;
let token=null,expires=0,busy=false;
const status=message=>{el('admin-status').textContent=message;};
const clear=()=>{token=null;expires=0;el('admin-actions').hidden=true;el('admin-login-form').hidden=false;el('admin-password').value='';};
const close=()=>{dialog.hidden=true;clear();status('');};
el('admin-open').addEventListener('click',()=>{dialog.hidden=false;clear();status('');el('admin-username').focus();});
el('admin-close').addEventListener('click',close);
dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.hidden){e.stopImmediatePropagation();close();}},true);
async function post(path,data){const res=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store'});const payload=await res.json().catch(()=>({}));if(!res.ok)throw Error(payload.error||'通信エラー');return payload;}
el('admin-login-form').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;status('認証しています…');try{const data=await post('/api/admin/login',{username:el('admin-username').value.trim(),password:el('admin-password').value});token=data.token;expires=Date.now()+data.expiresIn*1000;el('admin-password').value='';el('admin-login-form').hidden=true;el('admin-actions').hidden=false;status('認証成功。有効期間は5分です。');}catch(error){status(error.message);}finally{busy=false;}});
el('admin-reset').addEventListener('click',async()=>{if(busy)return;if(!token||Date.now()>=expires){clear();status('認証の有効期限が切れました。再ログインしてください。');return;}if(!confirm('警告：登録済みの全プレイヤーと最高スコアを完全に削除します。元には戻せません。続けますか？'))return;const word=prompt('最終確認です。削除する場合は RESET と入力してください。');if(word!=='RESET'){status('キャンセルしました。');return;}busy=true;status('全ランキングを削除しています…');try{await post('/api/admin/reset',{token,confirm:'DELETE ALL PLAYERS'});clear();status('全プレイヤーの記録を削除しました。画面を更新するとランキングが空になります。');if(window.primeRanking?.refresh)window.primeRanking.refresh();}catch(error){status(error.message);}finally{busy=false;}});
})();
