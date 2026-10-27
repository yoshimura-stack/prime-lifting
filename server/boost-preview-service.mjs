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
  async inventory(playerId){
   return parseBoostCounts(await db.call('boost_inventory_read',{playerId:requirePlayer(playerId)}));
  },
  async welcomeGrant(playerId){
   const result=await db.call('boost_welcome_grant',{playerId:requirePlayer(playerId)});
   if(!result||typeof result.alreadyGranted!=='boolean')throw new TypeError('Invalid welcome grant result');
   const counts=parseBoostCounts(result);
   if(!result.alreadyGranted){
    const granted=result.granted;
    if(!granted||['time','score','sc'].some(type=>!Number.isInteger(granted[type])||granted[type]<0||granted[type]>1))
     throw new TypeError('Invalid welcome grant confirmation');
   }
   return Object.freeze({alreadyGranted:result.alreadyGranted,...counts,...(!result.alreadyGranted?{granted:Object.freeze({...result.granted})}:{})});
  },
  async dailyLoginGrant(playerId){
   const result=await db.call('boost_daily_login_grant',{playerId:requirePlayer(playerId)});
   if(!result||typeof result.day!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(result.day)||typeof result.replayed!=='boolean'||(result.boost!==null&&!['time','score','sc'].includes(result.boost))||typeof result.allFull!=='undefined'&&typeof result.allFull!=='boolean'||typeof result.welcomeDay!=='undefined'&&typeof result.welcomeDay!=='boolean')throw new TypeError('Invalid daily login grant result');
   return Object.freeze({day:result.day,boost:result.boost,replayed:result.replayed,allFull:result.allFull===true,welcomeDay:result.welcomeDay===true});
  },
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
