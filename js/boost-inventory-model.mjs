// Reference model for isolated tests only. Production inventory MUST use an
// atomic database transaction/RPC; never use this in-memory model in Worker.
import {BOOST_TYPES,BOOST_CAP,validateBoostSelection,slotOutcome} from './boost-rules.mjs';
export function createBoostInventoryModel(initial={time:0,score:0,sc:0}){
 const counts={};
 for(const type of BOOST_TYPES){
  const n=initial[type]??0;
  if(!Number.isInteger(n)||n<0||n>BOOST_CAP)throw new RangeError('Invalid initial inventory');
  counts[type]=n;
 }
 const uses=new Map(),spins=new Map();
 const snapshot=()=>Object.freeze({...counts});
 return Object.freeze({
  snapshot,
  reserve({runId,boost}){
   if(typeof runId!=='string'||!runId.trim())throw new TypeError('Invalid run id');
   const type=validateBoostSelection(boost);
   if(uses.has(runId)){
    if(uses.get(runId)!==type)throw new Error('Run already reserved with different BOOST');
    return Object.freeze({boost:type,inventory:snapshot(),replayed:true});
   }
   if(type!==null){
    if(counts[type]<1)throw new Error('BOOST inventory exhausted');
    counts[type]--;
   }
   uses.set(runId,type);
   return Object.freeze({boost:type,inventory:snapshot(),replayed:false});
  },
  spin({day,random}){
   if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new TypeError('Invalid JST day');
   if(spins.has(day))return Object.freeze({outcome:spins.get(day),inventory:snapshot(),replayed:true});
   const outcome=slotOutcome(counts,random);
   if(!outcome)return Object.freeze({outcome:null,inventory:snapshot(),replayed:false});
   counts[outcome.type]++;
   spins.set(day,outcome);
   return Object.freeze({outcome,inventory:snapshot(),replayed:false});
  }
 });
}
