// Dedicated BOOST staging authentication. No production session cookies or secrets.
const enc=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function hmac(secret){
 if(typeof secret!=='string'||secret.length<32)throw new TypeError('Dedicated preview secret required');
 return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
export async function issuePreviewToken({playerId,secret,now=Date.now(),ttlSeconds=900}){
 if(!uuid.test(playerId)||!Number.isInteger(ttlSeconds)||ttlSeconds<60||ttlSeconds>3600)throw new TypeError('Invalid preview token');
 const payload=b64(enc.encode(JSON.stringify({kind:'prime-boost-preview',sub:playerId,exp:Math.floor(now/1000)+ttlSeconds})));
 const sig=b64(new Uint8Array(await crypto.subtle.sign('HMAC',await hmac(secret),enc.encode(payload))));
 return payload+'.'+sig;
}
export async function verifyPreviewToken(token,{secret,now=Date.now()}){
 try{
  if(typeof token!=='string'||token.length>2048)throw Error();
  const parts=token.split('.');
  if(parts.length!==2||!parts.every(Boolean))throw Error();
  const valid=await crypto.subtle.verify('HMAC',await hmac(secret),unb64(parts[1]),enc.encode(parts[0]));
  if(!valid)throw Error();
  const value=JSON.parse(new TextDecoder().decode(unb64(parts[0])));
  if(value.kind!=='prime-boost-preview'||!uuid.test(value.sub)||!Number.isInteger(value.exp)||value.exp<=Math.floor(now/1000))throw Error();
  return value.sub;
 }catch{return null;}
}
export function createPreviewSessionResolver({secret,now=Date.now()}){
 return async request=>{
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer '))return null;
  return verifyPreviewToken(authorization.slice(7),{secret,now});
 };
}
