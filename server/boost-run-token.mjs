// Staging-only official-run binding primitive. Not imported by the live Worker.
// The server, never the browser, must issue the token and own the one-time run store.
import {validateBoostSelection} from '../js/boost-rules.mjs';
const encoder=new TextEncoder();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const base64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const fromBase64=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function key(secret){
 if(typeof secret!=='string'||secret.length<32)throw new TypeError('Dedicated run signing secret required');
 return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
export async function issueBoostRunToken({playerId,runId,boost=null,secret,now=Date.now(),ttlSeconds=900}){
 if(!uuid.test(playerId)||!uuid.test(runId)||!Number.isInteger(ttlSeconds)||ttlSeconds<60||ttlSeconds>3600)throw new TypeError('Invalid official run');
 const selection=validateBoostSelection(boost);
 const payload=base64(encoder.encode(JSON.stringify({kind:'prime-boost-run-v1',sub:playerId,run:runId,boost:selection,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+ttlSeconds})));
 const signature=base64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(payload))));
 return payload+'.'+signature;
}
export async function verifyBoostRunToken(token,{playerId,runId,secret,now=Date.now()}){
 try{
  if(typeof token!=='string'||token.length>2048||!uuid.test(playerId)||!uuid.test(runId))return null;
  const parts=token.split('.');if(parts.length!==2||!parts.every(Boolean))return null;
  if(!await crypto.subtle.verify('HMAC',await key(secret),fromBase64(parts[1]),encoder.encode(parts[0])))return null;
  const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(fromBase64(parts[0])));
  if(data.kind!=='prime-boost-run-v1'||data.sub!==playerId||data.run!==runId||!Number.isInteger(data.iat)||!Number.isInteger(data.exp)||data.exp<=Math.floor(now/1000)||data.iat>Math.floor(now/1000)||data.exp-data.iat>3600)return null;
  if(data.boost!==null&&!['time','score','sc'].includes(data.boost))return null;
  return Object.freeze({playerId,runId,boost:data.boost});
 }catch{return null;}
}
