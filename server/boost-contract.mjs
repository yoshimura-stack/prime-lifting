// PRIME BOOST preview contract: not wired into the live Worker.
import {BOOST_TYPES,BOOST_CAP,validateBoostSelection} from '../js/boost-rules.mjs';
export function parseBoostCounts(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Invalid inventory');
 const result={};
 for(const type of BOOST_TYPES){
  if(!Number.isInteger(value[type])||value[type]<0||value[type]>BOOST_CAP)throw new RangeError('Invalid count');
  result[type]=value[type];
 }
 return Object.freeze(result);
}
export function boostReservePayload(playerId,runId,boost){
 const type=validateBoostSelection(boost);
 if(type===null)throw new TypeError('No reservation needed');
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(playerId)||!uuid.test(runId))throw new TypeError('Invalid identifier');
 return {payload:{playerId,runId,boost:type}};
}
export function parseSlotResult(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value.day)||typeof value.replayed!=='boolean')throw new TypeError('Invalid slot result');
 if(value.allFull===true){
  if(value.boost!==null||value.reels!==null||value.replayed)throw new TypeError('Invalid full slot');
  return {day:value.day,boost:null,reels:null,allFull:true,replayed:false};
 }
 const type=value.boost==='miss'?'miss':validateBoostSelection(value.boost);
 if(type===null||!Array.isArray(value.reels)||value.reels.length!==3||!value.reels.every(item=>item===type))throw new TypeError('Invalid slot reels');
 return {day:value.day,boost:type,reels:[...value.reels],replayed:value.replayed};
}
