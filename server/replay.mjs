// Same V4.2 engine as the browser; the original simulation is not modified.
import '../js/config.js';
import '../js/engine.js';
import '../js/kits.js';
export const VERSION='v0.4.2';
export const RULESET='cockpit-v42';
export class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}
export function normalizeName(value){
 if(typeof value!=='string')throw new ApiError(400,'名前を入力してください。');
 const name=value.normalize('NFKC').trim().replace(/\s+/gu,' ');
 if([...name].length<1||[...name].length>16||/[\p{Cc}\p{Cf}<>]/u.test(name))throw new ApiError(400,'名前は1〜16文字で入力してください。');
 return {name,key:name.toLocaleLowerCase('ja')};
}
export function replay(events){
 if(!Array.isArray(events)||events.length>10000)throw new ApiError(400,'プレイ記録が正しくありません。');
 let prev=-1;
 for(const e of events){if(!e||!Number.isInteger(e.t)||e.t<prev||e.t<0||e.t>7800||!['move','jump','act','spin'].includes(e.n)||(e.n==='move'&&![-1,0,1].includes(e.v)))throw new ApiError(400,'プレイ記録が正しくありません。');prev=e.t;}
 const c=structuredClone(globalThis.PRIME_DEFAULTS),g=new globalThis.LiftingGame(c);g.reset();let at=0,dir=0,tick=0,jumpsSinceHit=0,maxAirStreak=0,shoulderHits=0,spinKing=false,quadMaster=false,airQuad=false,doubleAir=false;
 const nextProof={totalHits:0,foot:0,knee:0,chest:0,heading:0,shoulder:0,spin:0,jump:0,allSpin:true,allJump:true,first30:null};
 const prefix={hits:0,foot:0,knee:0,chest:0,heading:0,spin:0,jump:0,unbroken:true};
 while(g.phase!=='ended'&&tick<7800){while(at<events.length&&events[at].t===tick){const e=events[at++];if(e.n==='move')dir=e.v;else {const accepted=g[e.n]();if(e.n==='jump'&&accepted===true)jumpsSinceHit++;}}g.update(c.FIXED_STEP,dir);for(const event of g.events){if(event.type==='hit'){
    nextProof.totalHits++;
    const part=event.name==='FOOT'?'foot':event.name==='KNEE'?'knee':event.name==='CHEST'?'chest':event.name==='HEADER'||event.name==='JUMP_HEADER'?'heading':event.name==='SHOULDER'?'shoulder':null;
    if(part)nextProof[part]++;
    if(event.spinCount>0)nextProof.spin++;else nextProof.allSpin=false;
    // A jump must have been accepted since the previous successful touch; airborne alone is not sufficient.
    if(jumpsSinceHit>0)nextProof.jump++;else nextProof.allJump=false;
    if(prefix.hits<30){prefix.hits++;if(part&&Object.hasOwn(prefix,part))prefix[part]++;if(event.spinCount>0)prefix.spin++;if(jumpsSinceHit>0)prefix.jump++;if(prefix.hits===30&&prefix.unbroken)nextProof.first30={...prefix};}
    maxAirStreak=Math.max(maxAirStreak,event.airStreak||0);if(event.name==='SHOULDER')shoulderHits++;if(event.spinCount>=3)spinKing=true;if(event.spinCount>=4)quadMaster=true;if(event.spinCount>=4&&jumpsSinceHit>=1)airQuad=true;if(jumpsSinceHit>=2)doubleAir=true;jumpsSinceHit=0;}else if(event.type==='drop'){jumpsSinceHit=0;if(prefix.hits<30)prefix.unbroken=false;}}g.events.length=0;tick++;}
 if(at!==events.length||g.phase!=='ended')throw new ApiError(400,'プレイ記録の終了位置が正しくありません。');
 return {score:g.score,hits:g.hits,combo:g.bestCombo,drops:g.drops,achievementProof:{maxAirStreak,shoulderHits,spinKing,quadMaster,airQuad,doubleAir},nextProof};
}
export function validKit(id){return globalThis.PRIME_KITS.kits.some(k=>k.id===id);}
