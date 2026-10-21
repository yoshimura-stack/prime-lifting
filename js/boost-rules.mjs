// PRIME BOOST pure rules. Not wired to production UI, ranking or inventory.
export const BOOST_TYPES=Object.freeze(['time','score','sc']);
export const BOOST_CAP=2;
export const BOOST_COLOR=Object.freeze({time:'#3B82F6',score:'#FACC15',sc:'#22C55E'});
export function eligibleBoosts(inventory){
 return BOOST_TYPES.filter(type=>Number.isInteger(inventory?.[type])&&inventory[type]>=0&&inventory[type]<BOOST_CAP);
}
export const SLOT_WEIGHTS=Object.freeze({miss:40,time:20,score:20,sc:20});
export function slotOutcome(inventory,random=Math.random){
 const eligible=eligibleBoosts(inventory);
 if(!eligible.length)return null; // all full: skip without consuming daily spin
 const roll=random();
 if(!Number.isFinite(roll)||roll<0||roll>=1)throw new RangeError('Invalid random draw');
 const outcomes=['miss',...eligible];
 const total=outcomes.reduce((sum,type)=>sum+SLOT_WEIGHTS[type],0);
 let ticket=roll*total;
 for(const type of outcomes){
  ticket-=SLOT_WEIGHTS[type];
  if(ticket<0)return Object.freeze({type,reels:[type,type,type]});
 }
 throw new RangeError('Invalid slot draw');
}
export function scoreMultiplier(device,boost=null){
 if(device!=='pc'&&device!=='mobile')throw new TypeError('Unknown device');
 if(boost!==null&&!BOOST_TYPES.includes(boost))throw new TypeError('Unknown boost');
 return 10+(boost==='score'?1:0); // integer tenths
}
export function finalScore(baseScore,device,boost=null){
 if(!Number.isSafeInteger(baseScore)||baseScore<0)throw new RangeError('Invalid base score');
 // Existing production worker uses Math.round; preserve the rounding convention.
 return Math.round(baseScore*scoreMultiplier(device,boost)/10);
}
export function ballColor(boost,scUsed=false){
 if(boost===null)return null; // normal white ball renderer
 if(!BOOST_TYPES.includes(boost))throw new TypeError('Unknown boost');
 return boost==='sc'&&scUsed?null:BOOST_COLOR[boost];
}
export function shouldProtectDrop(boost,scUsed){
 return boost==='sc'&&!scUsed;
}

/**
 * Standalone per-run state machine. This does NOT modify the current engine.
 * An integration must call onDrop BEFORE the existing combo-reset path,
 * and suppress only that reset when protected. NEXT BALL remains untouched.
 */
export function createBoostRun(boost=null){
 if(boost!==null&&!BOOST_TYPES.includes(boost))throw new TypeError('Unknown boost');
 let scUsed=false;
 return Object.freeze({
  boost,
  durationSeconds:boost==='time'?65:60,
  onDrop(){
   const protectedCombo=shouldProtectDrop(boost,scUsed);
   if(protectedCombo)scUsed=true;
   return Object.freeze({protectedCombo,allowExistingRespawn:true});
  },
  get scUsed(){return scUsed;},
  get activeBallColor(){return ballColor(boost,scUsed);},
  get historyBallColor(){return ballColor(boost,false);}
 });
}

/** Exactly zero or one BOOST may be equipped per run. */
export function validateBoostSelection(selection){
 if(selection===null)return null;
 if(typeof selection!=='string'||!BOOST_TYPES.includes(selection))throw new TypeError('Exactly one valid BOOST or none is allowed');
 return selection;
}
