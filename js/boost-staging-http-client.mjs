// Staging-only browser HTTP bridge. Uses an in-memory short-lived preview token.
// No service-role credentials, DB access or client-generated run identifiers.
const TYPES=new Set([null,'time','score','sc']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createBoostStagingHttpClient({fetcher=fetch,getBearer,origin=globalThis.location?.origin}={}){
 if(typeof fetcher!=='function'||typeof getBearer!=='function'||typeof origin!=='string'||!/^https?:\/\/[^/]+$/.test(origin))
  throw new TypeError('Trusted staging browser configuration required');
 let active=null;
 async function post(path,body){
  const bearer=getBearer();
  if(typeof bearer!=='string'||!bearer||bearer.length>2048)throw new Error('Staging session required');
  const response=await fetcher(origin+path,{
   method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+bearer,'origin':origin},
   body:JSON.stringify(body),credentials:'omit',cache:'no-store',redirect:'error'
  });
  if(!response.ok)throw new Error('Staging API rejected request ('+response.status+')');
  const data=await response.json();
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid staging response');
  return data;
 }
 return Object.freeze({
  async start(boost=null){
   if(!TYPES.has(boost))throw new TypeError('Invalid BOOST');
   if(active)throw new Error('Run already active');
   const run=await post('/api/boost-stage/start',{boost});
   if(!UUID.test(run.runId)||typeof run.token!=='string'||run.token.length<16||
    run.boost!==boost||run.durationSeconds!==(boost==='time'?65:60))throw new Error('Unconfirmed staging run');
   active=Object.freeze({runId:run.runId,token:run.token,boost:run.boost,durationSeconds:run.durationSeconds});
   return active;
  },
  async finish({events,worldWidth,device,claimedScore}={}){
   if(!active)throw new Error('No official run');
   if(!Array.isArray(events)||events.length>10000||!Number.isInteger(worldWidth)||
    worldWidth<1000||worldWidth>1800||worldWidth%100!==0||!['pc','mobile'].includes(device)||
    (claimedScore!==undefined&&(!Number.isSafeInteger(claimedScore)||claimedScore<0)))
    throw new TypeError('Invalid replay submission');
   const run=active;
   const result=await post('/api/boost-stage/finish',{runId:run.runId,token:run.token,events,worldWidth,device,...(claimedScore===undefined?{}:{claimedScore})});
   if(result.runId!==run.runId||result.boost!==run.boost||
    !Number.isSafeInteger(result.playScore)||result.playScore<0||
    typeof result.replayed!=='boolean')throw new Error('Unconfirmed staging result');
   active=null;
   return result;
  },
  get activeRun(){return active;},
  // Do not clear a run on a transient network failure: retry FINISH with the same run ID.
  clear(){active=null;}
 });
}
