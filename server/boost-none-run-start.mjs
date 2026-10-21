// Staging-only trusted NONE run registration. Do not expose this adapter to browsers.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createNoneRunStartStore(transport){
 if(!transport||typeof transport.call!=='function')throw new TypeError('Trusted transport required');
 return Object.freeze({async start({playerId,runId}){
  if(typeof playerId!=='string'||!uuid.test(playerId)||typeof runId!=='string'||!uuid.test(runId))throw new TypeError('Invalid run identity');
  const result=await transport.call('boost_start_none',{playerId,runId});
  if(!result||result.runId!==runId||typeof result.replayed!=='boolean')throw new Error('NONE run registration not confirmed');
  return Object.freeze({runId,replayed:result.replayed});
 }});
}
