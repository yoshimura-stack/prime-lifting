// Standalone staging-only Worker entrypoint. Never use this file as the production Worker.
import {createBoostPreviewHandler} from './boost-preview-handler.mjs';
import {createBoostPreviewTransport} from './boost-preview-transport.mjs';
import {createPreviewSessionResolver} from './boost-preview-auth.mjs';
import {allowPreviewRequest} from './boost-preview-rate-limit.mjs';
const STAGING_PROJECT='tarnzjkxexlozqqmyqof';
const STAGING_HOST=STAGING_PROJECT+'.supabase.co';
const unavailable=()=>new Response(JSON.stringify({error:'Preview unavailable'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/')){
   if(url.pathname==='/')return Response.redirect(url.origin+'/boost-slot-preview.html',302);
   if(!env.ASSETS||typeof env.ASSETS.fetch!=='function')return unavailable();
   const response=await env.ASSETS.fetch(request);
   const headers=new Headers(response.headers);
   headers.set('cache-control','no-store');
   headers.set('x-content-type-options','nosniff');
   headers.set('x-frame-options','DENY');
   headers.set('referrer-policy','no-referrer');
   headers.set('content-security-policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
   return new Response(response.body,{status:response.status,headers});
  }
  // Both the project URL and a dedicated secret are mandatory. Fail closed.
  if(env.BOOST_PREVIEW_ENABLED!=='true'||env.BOOST_PREVIEW_PROJECT_ID!==STAGING_PROJECT||!env.BOOST_PREVIEW_SESSION_SECRET||!env.BOOST_PREVIEW_SERVICE_KEY)return unavailable();
  if(!await allowPreviewRequest(request,env.BOOST_PREVIEW_LIMITER))return new Response(JSON.stringify({error:'Preview rate limit unavailable or exceeded'}),{status:429,headers:{'content-type':'application/json','cache-control':'no-store'}});
  try{
   const transport=createBoostPreviewTransport({url:'https://'+STAGING_HOST+'/',expectedProjectHost:STAGING_HOST,serviceKey:env.BOOST_PREVIEW_SERVICE_KEY});
   const resolvePlayer=createPreviewSessionResolver({secret:env.BOOST_PREVIEW_SESSION_SECRET});
   return createBoostPreviewHandler({transport,resolvePlayer,enabled:true,allowReserve:false})(request);
  }catch{return unavailable();}
 }
};
