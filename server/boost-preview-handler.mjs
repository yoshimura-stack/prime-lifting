// Isolated BOOST preview handler. NOT imported by server/worker.mjs.
// Deploy only on a dedicated preview Worker with a trusted session resolver.
// The caller must inject a server-side RPC transport and session resolver.
import {createBoostPreviewService} from './boost-preview-service.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createBoostPreviewHandler({transport,resolvePlayer,enabled=false,allowReserve=false,allowWelcomeGrant=false,allowDailyLoginGrant=false}={}){
 if(typeof resolvePlayer!=='function')throw new TypeError('Session resolver required');
 const service=createBoostPreviewService(transport);
 return async function handle(request){
  if(!enabled)return json({error:'BOOST preview is disabled'},403);
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/boost-preview/'))return json({error:'Not found'},404);
  if(url.pathname!=='/api/boost-preview/slot/spin'&&url.pathname!=='/api/boost-preview/reserve'&&url.pathname!=='/api/boost-preview/inventory'&&url.pathname!=='/api/boost-preview/welcome-grant'&&url.pathname!=='/api/boost-preview/daily-login-grant')return json({error:'Not found'},404);
  if(url.pathname==='/api/boost-preview/welcome-grant'&&!allowWelcomeGrant)return json({error:'Welcome grant is disabled'},403);
  if(url.pathname==='/api/boost-preview/daily-login-grant'&&!allowDailyLoginGrant)return json({error:'Daily login grant is disabled'},403);
  if(url.pathname==='/api/boost-preview/reserve'&&!allowReserve)return json({error:'Reservation preview is disabled'},403);
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('origin')!==url.origin)return json({error:'Origin denied'},403);
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))return json({error:'JSON required'},415);
  let playerId;
  try{playerId=await resolvePlayer(request);}catch{return json({error:'Unauthorized'},401);}
  if(typeof playerId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId))return json({error:'Unauthorized'},401);
  let body;
  try{
   if(Number(request.headers.get('content-length'))>2048)return json({error:'Payload too large'},413);
   const stream=request.body;
   if(!stream)return json({error:'Invalid payload'},400);
   const reader=stream.getReader();
   const parts=[];let bytes=0;
   while(true){
    const next=await reader.read();if(next.done)break;
    bytes+=next.value.byteLength;
    if(bytes>2048){await reader.cancel();return json({error:'Payload too large'},413);}
    parts.push(next.value);
   }
   const buffer=new Uint8Array(bytes);let at=0;
   for(const part of parts){buffer.set(part,at);at+=part.byteLength;}
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(buffer);
   body=JSON.parse(raw);
   if(!body||typeof body!=='object'||Array.isArray(body))throw Error();
  }catch{return json({error:'Invalid payload'},400);}
  try{
   if(url.pathname==='/api/boost-preview/welcome-grant')return json(await service.welcomeGrant(playerId));
   if(url.pathname==='/api/boost-preview/daily-login-grant')return json(await service.dailyLoginGrant(playerId));
   if(url.pathname==='/api/boost-preview/inventory')return json(await service.inventory(playerId));
   if(url.pathname==='/api/boost-preview/slot/spin')return json(await service.spin(playerId));
   if(url.pathname==='/api/boost-preview/reserve')return json(await service.reserve(playerId,body.runId,body.boost));
   return json({error:'Not found'},404);
  }catch(error){
   if(error instanceof TypeError||error instanceof RangeError)return json({error:'Invalid BOOST request'},400);
   return json({error:'Preview database unavailable',hint:'Staging database connection or RPC failed; no BOOST was granted'},503);
  }
 };
}
