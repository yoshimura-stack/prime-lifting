// Preview-only BOOST RPC adapter. Not imported by the live Worker.
// The caller must authenticate the player and supply a server-side transport.
import {parseBoostCounts,boostReservePayload,parseSlotResult} from './boost-contract.mjs';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function requirePlayer(playerId){
 if(typeof playerId!=='string'||!uuid.test(playerId))throw new TypeError('Invalid player');
 return playerId;
}
function requireTransport(transport){
 if(!transport||typeof transport.call!=='function')throw new TypeError('Missing server transport');
 return transport;
}
export function createBoostPreviewService(transport){
 const db=requireTransport(transport);
 return Object.freeze({
  async spin(playerId){
   const result=await db.call('boost_slot_spin',{playerId:requirePlayer(playerId)});
   return parseSlotResult(result);
  },
  async reserve(playerId,runId,boost){
   const input=boostReservePayload(requirePlayer(playerId),runId,boost).payload;
   const result=await db.call('boost_reserve',input);
   if(!result||result.boost!==boost||typeof result.replayed!=='boolean')throw new TypeError('Invalid reservation result');
   if(result.replayed===false&&(!Number.isInteger(result.remaining)||result.remaining<0||result.remaining>2))throw new TypeError('Invalid remaining stock');
   return Object.freeze({boost,replayed:result.replayed,...(result.replayed?{}:{remaining:result.remaining})});
  },
  parseInventory:parseBoostCounts
 });
}
