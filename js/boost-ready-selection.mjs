// Staging-only BOOST selection state for the ready screen.
// Visual selection does not reserve or spend stock; START must be server-confirmed.
import {BOOST_TYPES,BOOST_CAP,validateBoostSelection} from './boost-rules.mjs';
export function createReadyBoostSelection(inventory){
 if(!inventory||BOOST_TYPES.some(type=>!Number.isInteger(inventory[type])||inventory[type]<0||inventory[type]>BOOST_CAP))
  throw new TypeError('Verified inventory required');
 const stock=Object.freeze(Object.fromEntries(BOOST_TYPES.map(type=>[type,inventory[type]])));
 let selection=null;
 let pending=false;
 return Object.freeze({
  stock,
  get selected(){return selection;},
  get pending(){return pending;},
  select(boost){
   if(pending)throw new Error('START pending');
   const type=validateBoostSelection(boost);
   if(type!==null&&stock[type]===0)throw new RangeError('BOOST out of stock');
   selection=type;
   return selection;
  },
  async start(startOfficialRun){
   if(pending)throw new Error('START pending');
   if(typeof startOfficialRun!=='function')throw new TypeError('Trusted start callback required');
   pending=true;
   try{
    const run=await startOfficialRun(selection);
    if(!run||typeof run.runId!=='string'||typeof run.token!=='string'||run.boost!==selection)
     throw new Error('Official run not confirmed');
    return run;
   }finally{pending=false;}
  }
 });
}
