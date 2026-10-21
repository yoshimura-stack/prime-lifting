// Isolated BOOST preview RPC transport; intentionally not used by the live game Worker.
// Configure ONLY against the dedicated staging Supabase project.
const rpcNames=Object.freeze({boost_slot_spin:'lifting_api_boost_slot_spin',boost_reserve:'lifting_api_boost_reserve',boost_inventory_read:'lifting_api_boost_inventory_read',boost_verified_receipt:'lifting_api_boost_verified_receipt'});
export function createBoostPreviewTransport({url,serviceKey,expectedProjectHost,fetcher=fetch}={}){
 if(typeof url!=='string'||typeof serviceKey!=='string'||!serviceKey||typeof fetcher!=='function')throw new TypeError('Missing preview database configuration');
 const base=new URL(url);
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||typeof expectedProjectHost!=='string'||base.hostname!==expectedProjectHost)throw new TypeError('Preview database host mismatch');
 return Object.freeze({async call(operation,payload){
  if(!Object.hasOwn(rpcNames,operation))throw new TypeError('Unsupported preview RPC');
  const headers={'content-type':'application/json',apikey:serviceKey};
  if(serviceKey.startsWith('eyJ'))headers.authorization='Bearer '+serviceKey;
  let response;
  try{
   response=await fetcher(new URL('/rest/v1/rpc/'+rpcNames[operation],base),{
    method:'POST',headers,body:JSON.stringify({payload}),signal:AbortSignal.timeout(8000)
   });
  }catch{throw new Error('Preview RPC connection failed');}
  if(!response.ok)throw new Error('Preview RPC rejected request');
  try{return await response.json();}catch{throw new Error('Preview RPC invalid response');}
 }});
}
