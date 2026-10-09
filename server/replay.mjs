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
 const c=structuredClone(globalThis.PRIME_DEFAULTS),g=new globalThis.LiftingGame(c);g.reset();let at=0,dir=0,tick=0;
 while(g.phase!=='ended'&&tick<7800){while(at<events.length&&events[at].t===tick){const e=events[at++];if(e.n==='move')dir=e.v;else g[e.n]();}g.update(c.FIXED_STEP,dir);g.events.length=0;tick++;}
 if(at!==events.length||g.phase!=='ended')throw new ApiError(400,'プレイ記録の終了位置が正しくありません。');
 return {score:g.score,hits:g.hits,combo:g.bestCombo,drops:g.drops};
}
// Keep historical V0.5.18 kit IDs valid for existing accounts and saved sessions.
// The new collection uses unlock-XX IDs; both are cosmetic and never affect replay.
const LEGACY_KIT_GROUPS={japan:20,germany:4,england:4,spain:4,italy:4,france:4,world:4};
export function validKit(id){
 if(typeof id!=='string')return false;
 if(globalThis.PRIME_KITS.kits.some(k=>k.id===id))return true;
 const m=/^(japan|germany|england|spain|italy|france|world)-(\d{2})$/.exec(id);
 return !!m&&Number(m[2])>=1&&Number(m[2])<=LEGACY_KIT_GROUPS[m[1]];
}
