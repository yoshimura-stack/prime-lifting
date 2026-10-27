// Standalone staging-only Worker entrypoint. Never use this file as the production Worker.
import {createBoostPreviewHandler} from './boost-preview-handler.mjs';
import {createBoostPreviewTransport} from './boost-preview-transport.mjs';
import {createPreviewSessionResolver,issuePreviewToken} from './boost-preview-auth.mjs';
import {allowPreviewRequest} from './boost-preview-rate-limit.mjs';
import {createBoostStagingRunHandler} from './boost-staging-run-handler.mjs';
const STAGING_PROJECT='tarnzjkxexlozqqmyqof';
const STAGING_HOST=STAGING_PROJECT+'.supabase.co';
const unavailable=()=>new Response(JSON.stringify({error:'Preview unavailable'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  // This Worker is a dedicated preview, never a fallback for the live game's
  // account, leaderboard, achievement, or daily-challenge API.
  if(url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/api/boost-preview/')&&!url.pathname.startsWith('/api/boost-stage/'))
   return new Response(JSON.stringify({error:'Legacy game API unavailable in isolated preview'}),{status:404,headers:{'content-type':'application/json','cache-control':'no-store'}});
  if(!url.pathname.startsWith('/api/')){
   if(url.pathname==='/')return Response.redirect(url.origin+'/boost-slot-preview.html',302);
   if(!env.ASSETS||typeof env.ASSETS.fetch!=='function')return unavailable();
   const response=await env.ASSETS.fetch(request);
   const headers=new Headers(response.headers);
   headers.set('cache-control','no-store');
   headers.set('x-content-type-options','nosniff');
   headers.set('x-frame-options','DENY');
   headers.set('x-robots-tag','noindex, nofollow, noarchive');
   headers.set('referrer-policy','no-referrer');
   // The existing game HTML contains inline initialization scripts. Permit them
   // only on the isolated playable staging page; all other preview assets stay strict.
   const gamePreview=url.pathname==='/boost-game-preview.html'||url.pathname==='/boost-device-practice.html';
   headers.set('content-security-policy',"default-src 'none'; script-src 'self'"+(gamePreview?" 'unsafe-inline'":'')+"; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
   return new Response(response.body,{status:response.status,headers});
  }
  // Both the project URL and a dedicated secret are mandatory. Fail closed.
  if(env.BOOST_PREVIEW_ENABLED!=='true'||env.BOOST_PREVIEW_PROJECT_ID!==STAGING_PROJECT||!env.BOOST_PREVIEW_SESSION_SECRET||!env.BOOST_PREVIEW_SERVICE_KEY)return unavailable();
  if(!await allowPreviewRequest(request,env.BOOST_PREVIEW_LIMITER))return new Response(JSON.stringify({error:'Preview rate limit unavailable or exceeded'}),{status:429,headers:{'content-type':'application/json','cache-control':'no-store'}});
  try{
   const transport=createBoostPreviewTransport({url:'https://'+STAGING_HOST+'/',expectedProjectHost:STAGING_HOST,serviceKey:env.BOOST_PREVIEW_SERVICE_KEY});
   const resolvePlayer=createPreviewSessionResolver({secret:env.BOOST_PREVIEW_SESSION_SECRET});
   // Optional staging-only PIN login. Requires a dedicated tester identity and PIN
   // configured as Worker secrets; never accepts client-provided player IDs.
   if(url.pathname==='/api/boost-preview/tester-login'){
    if(request.method!=='POST')return new Response(null,{status:405});
    if(request.headers.get('origin')!==url.origin)return new Response(null,{status:403});
    if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return new Response(null,{status:415});
    const testerId=env.BOOST_TESTER_PLAYER_ID;
    const pin=env.BOOST_TESTER_PIN;
    if(typeof testerId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testerId)||
       typeof pin!=='string'||!/^\d{6,12}$/.test(pin))return unavailable();
    if(Number(request.headers.get('content-length'))>256)return new Response(null,{status:413});
    let data;
    try{const raw=await request.text();if(raw.length>256)throw Error();data=JSON.parse(raw);}catch{return new Response(null,{status:400});}
    const supplied=data?.pin;
    // Compare fixed-size HMACs to avoid simple timing leaks; rate limiter applies above.
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.BOOST_PREVIEW_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const sign=async v=>new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(v)));
    const a=await sign(pin),b=await sign(typeof supplied==='string'?supplied:'');
    let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
    if(diff!==0)return new Response(JSON.stringify({error:'Invalid tester PIN'}),{status:401,headers:{'content-type':'application/json','cache-control':'no-store'}});
    const token=await issuePreviewToken({playerId:testerId,secret:env.BOOST_PREVIEW_SESSION_SECRET,ttlSeconds:900});
    return new Response(JSON.stringify({token,expiresIn:900}),{headers:{'content-type':'application/json','cache-control':'no-store'}});
   }
   if(url.pathname.startsWith('/api/boost-stage/')){
    if(env.BOOST_STAGING_RUNS_ENABLED!=='true'||typeof env.BOOST_RUN_SIGNING_SECRET!=='string'||env.BOOST_RUN_SIGNING_SECRET.length<32)return unavailable();
    return createBoostStagingRunHandler({transport,resolvePlayer,secret:env.BOOST_RUN_SIGNING_SECRET,enabled:true})(request);
   }
   return createBoostPreviewHandler({transport,resolvePlayer,enabled:true,allowReserve:false,allowWelcomeGrant:env.BOOST_WELCOME_GRANT_ENABLED==='true',allowDailyLoginGrant:env.BOOST_DAILY_LOGIN_GRANT_ENABLED==='true'})(request);
  }catch{return unavailable();}
 }
};
