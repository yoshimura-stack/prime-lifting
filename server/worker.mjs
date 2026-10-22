import {dailyChallenges,jstDay,completedDailyChallenges} from './daily.mjs';
import {ApiError,normalizeName,replay,validKit,RULESET,VERSION} from './replay.mjs';
import {createDatabase} from './supabase.mjs';
import {achievementMask,publicProgress,nextLevelMask,NEXT_TITLES} from './achievements.mjs';
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
function publicPlayer(p){if(!p||typeof p.id!=='string'||typeof p.name!=='string'||!Number.isSafeInteger(p.best)||p.best<0||!(p.rank===null||Number.isSafeInteger(p.rank)&&p.rank>0))throw new ApiError(503,'ランキングの応答を確認中です。');return {id:p.id,name:p.name,best:p.best,rank:p.rank,kit:typeof p.kit==='string'?p.kit:null,lastPlayed:typeof p.lastPlayed==='string'?p.lastPlayed:null,bestDevice:p.bestDevice==='mobile'||p.bestDevice==='pc'?p.bestDevice:null,dailyBonus:Number.isSafeInteger(p.dailyBonus)&&p.dailyBonus>=0?p.dailyBonus:null};}
function requestDevice(request){return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(request.headers.get('user-agent')||'')?'mobile':'pc';}
// Both device types now score identically. Existing leaderboard bests remain untouched.
export function finalScore(score,device){return Math.round(score);}
async function readBody(request){
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))throw new ApiError(415,'JSON形式で送信してください。');
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'入力がありません。');let size=0,chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>512000){await reader.cancel();throw new ApiError(413,'プレイ記録が大きすぎます。');}chunks.push(value);}
 const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
 try{const body=JSON.parse(new TextDecoder().decode(bytes));if(!body||Array.isArray(body)||typeof body!=='object')throw 0;return body;}catch{throw new ApiError(400,'入力形式が正しくありません。');}
}
export function createWorker({database=createDatabase,now=()=>Date.now(),replayGame=replay}={}){return {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 try{
  if(!['GET','POST'].includes(request.method))throw new ApiError(405,'この操作には対応していません。');
  if(request.method==='POST'&&request.headers.get('origin')!==url.origin)throw new ApiError(403,'同じサイトから操作してください。');
  const adminLogin=path==='/api/admin/login';
  const adminReset=path==='/api/admin/reset';
  const auth=path==='/api/register'||path==='/api/login'||adminLogin;
  const limiter=auth?env.AUTH_LIMITER:env.API_LIMITER;
  if(!limiter)throw new ApiError(503,'ランキング設定を確認中です。');
  const ip=request.headers.get('CF-Connecting-IP')||'local';
  if(!(await limiter.limit({key:ip})).success)throw new ApiError(429,'少し待ってから再試行してください。');
  const time=now(),post=request.method==='POST';
  if(path==='/api/daily'&&!post){const day=jstDay(time);return json({day,challenges:dailyChallenges(day),timezone:'Asia/Tokyo'});}
  const db=database(env);
  if(adminLogin||adminReset){
   if(!post)throw new ApiError(405,'この操作には対応していません。');
   const body=await readBody(request);
   if(adminLogin){
    if(typeof env.ADMIN_PASSWORD!=='string'||env.ADMIN_PASSWORD.length<12)throw new ApiError(503,'管理者パスワードが未設定です。');
    if(typeof body.password!=='string'||body.password.length>256||body.username!=='host')throw new ApiError(401,'管理者IDまたはパスワードが違います。');
    const candidate=encoder.encode(body.password),expected=encoder.encode(env.ADMIN_PASSWORD);
    // Constant-time compare using HMAC digest rather than a raw string equality check.
    const compareKey=await key(env.SESSION_SECRET);
    const a=new Uint8Array(await crypto.subtle.sign('HMAC',compareKey,candidate));
    const b=new Uint8Array(await crypto.subtle.sign('HMAC',compareKey,expected));
    if(!crypto.subtle.timingSafeEqual){let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff)throw new ApiError(401,'管理者IDまたはパスワードが違います。');}
    else if(!crypto.subtle.timingSafeEqual(a,b))throw new ApiError(401,'管理者IDまたはパスワードが違います。');
    const token=await sign({kind:'admin',sub:'host',exp:time+5*60000},env.SESSION_SECRET);
    return json({ok:true,token,expiresIn:300});
   }
   const session=await verify(body.token,env.SESSION_SECRET,'admin',time);
   if(session.sub!=='host'||body.confirm!=='DELETE ALL PLAYERS')throw new ApiError(400,'削除確認が一致しません。');
   if(typeof env.ADMIN_PASSWORD!=='string'||env.ADMIN_PASSWORD.length<12)throw new ApiError(503,'管理者パスワードが未設定です。');
   await db.resetAllPlayers();
   return json({ok:true});
  }
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
  if((path==='/api/leaderboard'||path==='/api/champion'||path==='/api/leaderboard/all')&&!post){
   const full=path==='/api/leaderboard/all';
   const data=await db.call('leaderboard',{limit:full?200:10});
   if(!Array.isArray(data?.entries))throw new ApiError(503,'ランキングの応答を確認中です。');
   const players=data.entries.slice(0,full?200:10).map(publicPlayer);
   // One batch query for all ranks; do not issue per-player RPC calls.
   // Missing progress is 0/8. A failed progress query leaves the leaderboard usable.
   let masks={},nextMasks={};
   try{const response=await db.call('achievement_list',{playerIds:players.map(p=>p.id)});
    if(response&&typeof response==='object'&&!Array.isArray(response))masks=response;
   }catch{}
   try{const response=await db.call('next_achievement_list',{playerIds:players.map(p=>p.id)});if(response&&typeof response==='object'&&!Array.isArray(response))nextMasks=response;}catch{}
   let scoreBreakdowns={};
   try{const response=await db.call('score_breakdown_list',{playerIds:players.map(p=>p.id)});if(response&&typeof response==='object'&&!Array.isArray(response))scoreBreakdowns=response;}catch{}
   const entries=players.map(v=>{
    const mask=masks[v.id],valid=Number.isInteger(mask)&&mask>=0&&mask<=255;
    const count=valid?mask.toString(2).replace(/0/g,'').length:0;
    const breakdown=scoreBreakdowns[v.id];const validBreakdown=breakdown&&Number.isSafeInteger(breakdown.baseScore)&&Number.isSafeInteger(breakdown.mobileBonus)&&breakdown.baseScore>=0&&breakdown.mobileBonus>=0&&breakdown.baseScore+breakdown.mobileBonus===v.best;
    return {name:v.name,score:v.best+(v.dailyBonus??0),rank:v.rank,device:v.bestDevice,...(v.lastPlayed?{lastPlayed:v.lastPlayed}:{}),...(v.dailyBonus!==null?{playScore:v.best,dailyBonus:v.dailyBonus}:{}),...(validBreakdown?{baseScore:breakdown.baseScore,mobileBonus:breakdown.mobileBonus}:{}),achievementCount:count,baseTitleMask:valid?mask:0,master:valid&&mask===255,nextTitleMask:Number.isInteger(nextMasks[v.id])&&nextMasks[v.id]>=0&&nextMasks[v.id]<=255?nextMasks[v.id]:0,nextAchievementCount:Number.isInteger(nextMasks[v.id])&&nextMasks[v.id]>=0&&nextMasks[v.id]<=255?nextMasks[v.id].toString(2).replace(/0/g,'').length:0,liftingGod:nextMasks[v.id]===255&&mask===255};
   });
   return json(path==='/api/champion'?{champion:entries[0]||null}:{entries});
  }
  if(!['/api/me','/api/achievements','/api/daily/status','/api/game/start','/api/scores'].includes(path))throw new ApiError(404,'APIが見つかりません。');
  if((path==='/api/me'||path==='/api/achievements'||path==='/api/daily/status')===post)throw new ApiError(405,'この操作には対応していません。');
  const cookie=(request.headers.get('Cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('prime_session='))?.slice(14);
  const session=await verify(cookie,env.SESSION_SECRET,'session',time);
  if(path==='/api/me')return json({player:publicPlayer((await db.call('me',{playerId:session.sub})).player)});
  if(path==='/api/daily/status'){
   const day=jstDay(time),data=await db.call('daily_status',{playerId:session.sub,day});
   const allowed=new Set(dailyChallenges(day).map(challenge=>challenge.id));
   const completed=Array.isArray(data.completedIds)?data.completedIds.filter(id=>typeof id==='string'&&allowed.has(id)):[];
   return json({day,completedIds:[...new Set(completed)],todayBonus:completed.length*100,monthlyBonus:Number.isSafeInteger(data.monthlyBonus)&&data.monthlyBonus>=0?data.monthlyBonus:0});
  }
  if(path==='/api/achievements'){await db.call('me',{playerId:session.sub});const base=publicProgress(await db.call('achievement_get',{playerId:session.sub}));let next=null;try{const data=await db.call('next_achievement_get',{playerId:session.sub});const mask=data?.mask;if(Number.isInteger(mask)&&mask>=0&&mask<=255)next={mask,earned:NEXT_TITLES.filter((_,i)=>!!(mask&(1<<i))),god:base.master&&mask===255};}catch{}return json({progress:{...base,next}});}
  if(path==='/api/game/start'){
   await db.call('me',{playerId:session.sub});
   const startBody=await readBody(request);
   const width=startBody.worldWidth??1000;
   if(!Number.isInteger(width)||width<1000||width>1800||width%100!==0)throw new ApiError(400,'フィールド幅が正しくありません。');
   const worldWidth=requestDevice(request)==='mobile'?1000:width;
   return json({ruleset:RULESET,worldWidth,token:await sign({kind:'run',sub:session.sub,id:crypto.randomUUID(),started:time,exp:time+86400000,ruleset:RULESET,device:requestDevice(request),worldWidth},env.SESSION_SECRET)});
  }
  const body=await readBody(request),run=await verify(body.token,env.SESSION_SECRET,'run',time);
  if(run.sub!==session.sub||run.ruleset!==RULESET||body.ruleset!==RULESET)throw new ApiError(403,'このプレイは登録できません。');
  // 60s lower bound leaves the 3s countdown as network-latency allowance.
  if(time-run.started<60000)throw new ApiError(400,'プレイ終了後に再試行してください。');
  const device=run.device??requestDevice(request);
  if(!validKit(body.kit)||!['pc','mobile'].includes(device))throw new ApiError(400,'端末・ユニフォームの指定が正しくありません。');
  const result=replayGame(body.events,run.worldWidth??1000),score=finalScore(result.score,device);
  const saved=await db.call('submit',{playerId:session.sub,runId:run.id,...result,score,baseScore:result.score,mobileBonus:score-result.score,kit:body.kit,device,gameVersion:VERSION});
  // Only an accepted and saved standard run can grant titles.
  // Progress is isolated from score storage; a progress outage must not erase a score.
  let progress=null;
  try{progress=publicProgress(await db.call('achievement_merge',{playerId:session.sub,mask:achievementMask(result,score)}));}catch{throw new ApiError(503,'称号の保存確認ができませんでした。同じプレイの保存を再試行してください。');}
  let next=null;
  if(progress.master){try{const data=await db.call('next_achievement_merge',{playerId:session.sub,mask:nextLevelMask(result)});const mask=data?.mask;if(Number.isInteger(mask)&&mask>=0&&mask<=255)next={mask,earned:NEXT_TITLES.filter((_,i)=>!!(mask&(1<<i))),god:mask===255};}catch{throw new ApiError(503,'NEXT LEVEL称号の保存確認ができませんでした。同じプレイの保存を再試行してください。');}}
  // Only a replay-verified and accepted run can earn daily credit.
  // Missing RPC is not silently treated as success; retry uses the same run ID.
  let daily=null;
  const rewardEnabled=env.DAILY_REWARDS_ENABLED==='true'||(env.DAILY_REWARDS_ENABLED!=='true'&&typeof env.DAILY_REWARDS_TEST_PLAYER_ID==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env.DAILY_REWARDS_TEST_PLAYER_ID)&&session.sub.toLowerCase()===env.DAILY_REWARDS_TEST_PLAYER_ID.toLowerCase());
  const qualifiedDailyIds=completedDailyChallenges(jstDay(run.started),result);
  if(rewardEnabled){
  try{daily=await db.call('daily_award',{playerId:session.sub,runId:run.id,day:jstDay(run.started),completedIds:qualifiedDailyIds});}
  catch{throw new ApiError(503,'デイリー報酬の保存確認ができませんでした。同じプレイを再送信してください。');}
  }
  return json({daily,dailyCheck:{enabled:rewardEnabled,qualifiedIds:qualifiedDailyIds},player:publicPlayer(saved.player),score,personalBest:saved.personalBest===true,newChampion:saved.newChampion===true,progress:{...progress,next}});
 }catch(error){return json({error:error instanceof ApiError?error.message:'ランキング処理に失敗しました。再試行してください。'},error instanceof ApiError?error.status:503);}
 }};}
export default createWorker();
