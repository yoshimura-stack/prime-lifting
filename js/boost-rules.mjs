// PRIME BOOST pure rules. Not wired to production UI, ranking or inventory.
export const BOOST_TYPES=Object.freeze(['time','score','sc']);
export const BOOST_CAP=2;
export const BOOST_COLOR=Object.freeze({time:'#3B82F6',score:'#FACC15',sc:'#22C55E'});
export function eligibleBoosts(inventory){
 return BOOST_TYPES.filter(type=>Number.isInteger(inventory?.[type])&&inventory[type]>=0&&inventory[type]<BOOST_CAP);
}
export function slotOutcome(inventory,random=Math.random){
 const eligible=eligibleBoosts(inventory);
 if(!eligible.length)return null; // all full: skip daily slot
 const roll=random();
 if(!Number.isFinite(roll)||roll<0||roll>=1)throw new RangeError('Invalid random draw');
 const type=eligible[Math.floor(roll*eligible.length)];
 return Object.freeze({type,reels:[type,type,type]});
}
export function scoreMultiplier(device,boost=null){
 if(device!=='pc'&&device!=='mobile')throw new TypeError('Unknown device');
 if(boost!==null&&!BOOST_TYPES.includes(boost))throw new TypeError('Unknown boost');
 return (device==='mobile'?11:10)+(boost==='score'?1:0); // integer tenths
}
export function finalScore(baseScore,device,boost=null){
 if(!Number.isSafeInteger(baseScore)||baseScore<0)throw new RangeError('Invalid base score');
 return Math.floor(baseScore*scoreMultiplier(device,boost)/10);
}
export function ballColor(boost,scUsed=false){
 if(boost===null)return null; // normal white ball renderer
 if(!BOOST_TYPES.includes(boost))throw new TypeError('Unknown boost');
 return boost==='sc'&&scUsed?null:BOOST_COLOR[boost];
}
export function shouldProtectDrop(boost,scUsed){
 return boost==='sc'&&!scUsed;
}
