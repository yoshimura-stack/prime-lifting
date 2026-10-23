// Staging-only trusted RPC adapter. Never import this module from browser code.
// The service-role credentials belong to the Worker DB client, not to the UI.
const RPC=Object.freeze({
 boost_start_none:'lifting_api_boost_start_none',
 boost_reserve:'lifting_api_boost_reserve',
 boost_verified_receipt:'lifting_api_boost_verified_receipt',
 boost_inventory_read:'lifting_api_boost_inventory_read',
 boost_slot_spin:'lifting_api_boost_slot_spin'
});
export function createBoostStagingTransport({callRpc}={}){
 if(typeof callRpc!=='function')throw new TypeError('Trusted server RPC client required');
 return Object.freeze({
  async call(operation,payload){
   if(!Object.hasOwn(RPC,operation))throw new TypeError('Unrecognized BOOST RPC');
   if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new TypeError('Invalid RPC payload');
   const result=await callRpc(RPC[operation],{payload});
   if(!result||typeof result!=='object'||Array.isArray(result))throw new TypeError('Invalid RPC result');
   return result;
  }
 });
}
export const BOOST_STAGING_RPC_NAMES=RPC;
