// Dedicated staging-only signed run API. Never import from production worker.mjs.
import {createBoostStagingApi} from './boost-staging-api.mjs';
import {ApiError} from './replay.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function bodyJson(request){
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))throw new ApiError(415,'JSON required');
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'Invalid body');
 let bytes=0;const parts=[];
 while(true){const item=await reader.read();if(item.done)break;bytes+=item.value.length;
  if(bytes>512000){await reader.cancel();throw new ApiError(413,'Payload too large');}parts.push(item.value);}
 const merged=new Uint8Array(bytes);let offset=0;
 for(const part of parts){merged.set(part,offset);offset+=part.length;}
 try{const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(merged));
  if(!body||typeof body!=='object'||Array.isArray(body))throw 0;return body;
 }catch{throw new ApiError(400,'Invalid JSON');}
}
export function createBoostStagingRunHandler({transport,resolvePlayer,secret,clock=()=>Date.now(),newRunId=()=>crypto.randomUUID(),enabled=false}={}){
 if(typeof resolvePlayer!=='function')throw new TypeError('Trusted preview identity required');
 const api=createBoostStagingApi({transport,secret,clock,newRunId,atomicRankedSubmit:true});
 return async function handle(request){
  if(!enabled)return json({error:'BOOST staging disabled'},403);
  const url=new URL(request.url),start=url.pathname==='/api/boost-stage/start',finish=url.pathname==='/api/boost-stage/finish';
  if(!start&&!finish)return json({error:'Not found'},404);
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('origin')!==url.origin)return json({error:'Origin denied'},403);
  let playerId;
  try{playerId=await resolvePlayer(request);}catch{return json({error:'Unauthorized'},401);}
  if(typeof playerId!=='string'||!uuid.test(playerId))return json({error:'Unauthorized'},401);
  try{
   const body=await bodyJson(request);
   if(start)return json(await api.start({authenticatedPlayerId:playerId,body}));
   return json(await api.finish({authenticatedPlayerId:playerId,body}));
  }catch(error){
   if(error instanceof ApiError)return json({error:error.message},error.status);
   if(error instanceof TypeError||error instanceof RangeError)return json({error:'Invalid BOOST request'},400);
   // Never expose database errors, secrets or player details to browsers.
   return json({error:'Staging BOOST database unavailable'},503);
  }
 };
}
