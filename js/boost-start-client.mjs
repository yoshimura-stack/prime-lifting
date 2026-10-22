// Browser transport for the isolated staging BOOST START endpoint.
// Credentials come from the authenticated staging session, never from URL flags.
export function createBoostStartClient({fetcher=fetch,endpoint='/api/boost-staging/start'}={}){
 if(typeof fetcher!=='function'||endpoint!=='/api/boost-staging/start')throw new TypeError('Staging endpoint required');
 return async function startOfficialRun(boost){
  if(boost!==null&&!['time','score','sc'].includes(boost))throw new TypeError('Invalid BOOST selection');
  const response=await fetcher(endpoint,{
   method:'POST',
   credentials:'same-origin',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({boost})
  });
  if(!response||!response.ok)throw new Error('Official BOOST START unavailable');
  const data=await response.json();
  if(!data||typeof data.runId!=='string'||typeof data.token!=='string'||data.boost!==boost||
    !Number.isInteger(data.durationSeconds)||data.durationSeconds!==(boost==='time'?65:60))
   throw new Error('Invalid official BOOST START response');
  return Object.freeze({runId:data.runId,token:data.token,boost:data.boost,durationSeconds:data.durationSeconds});
 };
}
