// Isolated staging API adapter. Not imported by the production Worker.
// Authentication, inventory and DB transport are injected by a trusted server.
import {createBoostReadyStart} from './boost-ready-start.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export function createBoostStartHandler({resolvePlayer,readInventory,transport,secret,clock=()=>Date.now(),newRunId,baseConfig,enabled=false}={}){
 if(typeof resolvePlayer!=='function'||typeof readInventory!=='function'||!transport||typeof transport.call!=='function'||typeof secret!=='string'||secret.length<32)throw new TypeError('Trusted server dependencies required');
 return async function handle(request){
  const url=new URL(request.url);
  if(url.pathname!=='/api/boost-staging/start')return json({error:'Not found'},404);
  if(!enabled)return json({error:'Staging START disabled'},403);
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('origin')!==url.origin)return json({error:'Origin denied'},403);
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))return json({error:'JSON required'},415);
  let playerId;
  try{playerId=await resolvePlayer(request);}catch{return json({error:'Unauthorized'},401);}
  if(typeof playerId!=='string')return json({error:'Unauthorized'},401);
  let body;
  try{
   const raw=await request.text();
   if(new TextEncoder().encode(raw).length>2048)throw Error('too large');
   body=JSON.parse(raw);
   if(!body||typeof body!=='object'||Array.isArray(body)||!Object.hasOwn(body,'boost')||Object.keys(body).some(key=>key!=='boost'))throw Error('invalid');
  }catch{return json({error:'Invalid request'},400);}
  try{
   // A trusted inventory read must precede selection and atomic reservation.
   const inventory=await readInventory(playerId);
   const ready=createBoostReadyStart({inventory,transport,secret,clock,newRunId,baseConfig,playerId});
   ready.select(body.boost);
   const run=await ready.start();
   return json({runId:run.runId,token:run.token,boost:run.boost,durationSeconds:run.durationSeconds});
  }catch(error){
   if(error instanceof TypeError||error instanceof RangeError)return json({error:'Invalid BOOST selection or inventory'},400);
   return json({error:'Unable to confirm official start'},503);
  }
 };
}
