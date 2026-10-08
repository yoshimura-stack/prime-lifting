import {ApiError,normalizeName,replay,validKit,RULESET,VERSION} from './replay.mjs';
import {createDatabase} from './supabase.mjs';
const encoder=new TextEncoder();
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function key(secret){if(typeof secret!=='string'||secret.length<32)throw new ApiError(503,'ランキングの接続準備中です。ゲストで遊べます。');return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function sign(value,secret){const payload=encode(encoder.encode(JSON.stringify(value)));return payload+'.'+encode(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(payload))));}
async function verify(token,secret,kind,now){
 try{const [p,s,...rest]=(token||'').split('.');if(rest.length||!p||!s||token.length>4096)throw 0;
 if(!await crypto.subtle.verify('HMAC',await key(secret),decode(s),encoder.encode(p)))throw 0;
 const value=JSON.parse(new TextDecoder().decode(decode(p)));
 if(value.kind!==kind||!Number.isFinite(value.exp)||value.exp<now||typeof value.sub!=='string')throw 0;
 return value;}catch{throw new ApiError(401,'ログインし直してください。');}
}
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
function publicPlayer(p){if(!p||typeof p.id!=='string'||typeof p.name!=='string'||!Number.isSafeInteger(p.best)||p.best<0||!(p.rank===null||Number.isSafeInteger(p.rank)&&p.rank>0))throw new ApiError(503,'ランキングの応答を確認中です。');return {id:p.id,name:p.name,best:p.best,rank:p.rank,kit:typeof p.kit==='string'?p.kit:null,lastPlayed:typeof p.lastPlayed==='string'?p.lastPlayed:null};}
async function readBody(request){
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))throw new ApiError(415,'JSON形式で送信してください。');
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'入力がありません。');let size=0,chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>512000){await reader.cancel();throw new ApiError(413,'プレイ記録が大きすぎます。');}chunks.push(value);}
 const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
 try{const body=JSON.parse(new TextDecoder().decode(bytes));if(!body||Array.isArray(body)||typeof body!=='object')throw 0;return body;}catch{throw new ApiError(400,'入力形式が正しくありません。');}
}
export function createWorker({database=createDatabase,now=()=>Date.now()}={}){return {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 try{
  if(!['GET','POST'].includes(request.method))throw new ApiError(405,'この操作には対応していません。');
  if(request.method==='POST'&&request.headers.get('origin')!==url.origin)throw new ApiError(403,'同じサイトから操作してください。');
  const auth=path==='/api/register'||path==='/api/login';
  const limiter=auth?env.AUTH_LIMITER:env.API_LIMITER;
  if(!limiter)throw new ApiError(503,'ランキング設定を確認中です。');
  const ip=request.headers.get('CF-Connecting-IP')||'local';
  if(!(await limiter.limit({key:ip})).success)throw new ApiError(429,'少し待ってから再試行してください。');
  const db=database(env),time=now(),post=request.method==='POST';
  if(auth&&post){
   const body=await readBody(request),{name,key:nameKey}=normalizeName(body.name);
   if(typeof body.pin!=='string'||!/^\d{6,12}$/.test(body.pin))throw new ApiError(400,'PINは6〜12桁の数字にしてください。');
   const accountKey=encode(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(nameKey))));
   if(!(await env.AUTH_LIMITER.limit({key:'account:'+accountKey})).success)throw new ApiError(429,'少し待ってから再試行してください。');
   await key(env.SESSION_SECRET);
   const data=await db.call(path.slice(5),{name,nameKey,pin:body.pin});
   if(!data?.player)throw new ApiError(401,'名前・PINを確認してください（登録済みの名前はログイン）。');
   const player=publicPlayer(data.player);
   const token=await sign({kind:'session',sub:player.id,exp:time+7*86400000},env.SESSION_SECRET);
   return json({player},200,{'Set-Cookie':`prime_session=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`});
  }
  if(path==='/api/logout'&&post)return json({ok:true},200,{'Set-Cookie':'prime_session=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
  if((path==='/api/leaderboard'||path==='/api/champion')&&!post){
   const data=await db.call('leaderboard',{limit:10});
   if(!Array.isArray(data?.entries))throw new ApiError(503,'ランキングの応答を確認中です。');
   const entries=data.entries.slice(0,10).map(p=>{const v=publicPlayer(p);return {name:v.name,score:v.best,rank:v.rank};});
   return json(path==='/api/champion'?{champion:entries[0]||null}:{entries});
  }
  if(!['/api/me','/api/game/start','/api/scores'].includes(path))throw new ApiError(404,'APIが見つかりません。');
  if((path==='/api/me')===post)throw new ApiError(405,'この操作には対応していません。');
  const cookie=(request.headers.get('Cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('prime_session='))?.slice(14);
  const session=await verify(cookie,env.SESSION_SECRET,'session',time);
  if(path==='/api/me')return json({player:publicPlayer((await db.call('me',{playerId:session.sub})).player)});
  if(path==='/api/game/start'){
   await db.call('me',{playerId:session.sub});
   return json({ruleset:RULESET,token:await sign({kind:'run',sub:session.sub,id:crypto.randomUUID(),started:time,exp:time+86400000,ruleset:RULESET},env.SESSION_SECRET)});
  }
  const body=await readBody(request),run=await verify(body.token,env.SESSION_SECRET,'run',time);
  if(run.sub!==session.sub||run.ruleset!==RULESET||body.ruleset!==RULESET)throw new ApiError(403,'このプレイは登録できません。');
  // 60s lower bound leaves the 3s countdown as network-latency allowance.
  if(time-run.started<60000)throw new ApiError(400,'プレイ終了後に再試行してください。');
  if(!validKit(body.kit)||!['pc','mobile'].includes(body.device))throw new ApiError(400,'端末・ユニフォームの指定が正しくありません。');
  const result=replay(body.events);
  const saved=await db.call('submit',{playerId:session.sub,runId:run.id,...result,kit:body.kit,device:body.device,gameVersion:VERSION});
  return json({player:publicPlayer(saved.player),score:result.score,personalBest:saved.personalBest===true,newChampion:saved.newChampion===true});
 }catch(error){return json({error:error instanceof ApiError?error.message:'ランキング処理に失敗しました。再試行してください。'},error instanceof ApiError?error.status:503);}
 }};}
export default createWorker();
