// Isolated BOOST preview handler. NOT imported by server/worker.mjs.
// Deploy only on a dedicated preview Worker with a trusted session resolver.
// The caller must inject a server-side RPC transport and session resolver.
import {createBoostPreviewService} from './boost-preview-service.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createBoostPreviewHandler({transport,resolvePlayer,enabled=false}={}){
 if(typeof resolvePlayer!=='function')throw new TypeError('Session resolver required');
 const service=createBoostPreviewService(transport);
 return async function handle(request){
  if(!enabled)return json({error:'BOOST preview is disabled'},403);
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/boost-preview/'))return json({error:'Not found'},404);
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('origin')!==url.origin)return json({error:'Origin denied'},403);
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))return json({error:'JSON required'},415);
  let playerId;
  try{playerId=await resolvePlayer(request);}catch{return json({error:'Unauthorized'},401);}
  if(!playerId)return json({error:'Unauthorized'},401);
  let body;
  try{
   const raw=await request.text();
   if(raw.length>2048) return json({error:'Payload too large'},413);
   body=JSON.parse(raw);
   if(!body||typeof body!=='object'||Array.isArray(body))throw Error();
  }catch{return json({error:'Invalid payload'},400);}
  try{
   if(url.pathname==='/api/boost-preview/slot/spin')return json(await service.spin(playerId));
   if(url.pathname==='/api/boost-preview/reserve')return json(await service.reserve(playerId,body.runId,body.boost));
   return json({error:'Not found'},404);
  }catch(error){
   if(error instanceof TypeError||error instanceof RangeError)return json({error:'Invalid BOOST request'},400);
   return json({error:'Preview database unavailable'},503);
  }
 };
}
