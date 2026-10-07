import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve,dirname,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { init,begin,submit,leaderboard,clientKey,ApiError,RULESET } from './ranking.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),dbPath=resolve(process.env.PRIME_DB||resolve(root,'../../prime-data/ranking.sqlite'));
await mkdir(dirname(dbPath),{recursive:true});const db=new DatabaseSync(dbPath);init(db);const salt=randomBytes(24).toString('hex');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.jpg':'image/jpeg','.png':'image/png'};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),path=decodeURIComponent(url.pathname);
 if(path.startsWith('/api/')){
  if(req.method==='GET'&&path==='/api/leaderboard')return json(res,200,leaderboard(db));
  if(req.method!=='POST')throw new ApiError(405,'この操作には対応していません。');
  if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw new ApiError(403,'ゲームの画面から操作してください。');
  if(!req.headers['content-type']?.startsWith('application/json'))throw new ApiError(415,'送信形式が正しくありません。');
  let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>160000)throw new ApiError(413,'プレイ記録が大きすぎます。');chunks.push(chunk);}let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw new ApiError(400,'送信内容が正しくありません。');}
  if(path==='/api/game/start'){if(body.ruleset!==RULESET)throw new ApiError(409,'ゲームを再読み込みして最新版でプレイしてください。');return json(res,201,begin(db,clientKey(req.socket.remoteAddress||'',salt)));}
  if(path==='/api/scores')return json(res,200,submit(db,body));throw new ApiError(404,'保存先が見つかりません。');
 }
 if(!['GET','HEAD'].includes(req.method))throw new ApiError(405,'この操作には対応していません。');
 const rel=path==='/'?'index.html':path.slice(1);if(!/^(index\.html|style\.css|game\.js|js\/[a-z0-9-]+\.js|vendor\/(three\.min\.js|THREE-LICENSE\.txt))$/.test(rel))throw new ApiError(404,'ページが見つかりません。');
 const data=await readFile(resolve(root,rel));res.writeHead(200,{'Content-Type':mime[extname(rel)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:data);
 }catch(error){if(!(error instanceof ApiError))console.error('Request failed:',error.message);json(res,error.status||500,{error:error.status?error.message:'保存先に接続できません。少し待って再試行してください。'});}});
server.requestTimeout=15000;server.headersTimeout=10000;server.listen(Number(process.env.PORT||8766),process.env.HOST||'127.0.0.1',()=>console.log('PRIME ranking server ready on port '+(process.env.PORT||8766)));
