// Canonical bit positions for the eight collectible titles.
// The mask is derived only from a replay accepted by the Worker.
export const TITLES=['30 KEEPS CLUB','AIR MASTER','SPIN KING','SHOULDER ACE','SCORE HUNTER','QUAD MASTER','AIR QUAD','DOUBLE AIR'];
export function achievementMask(result,finalScore){
 const p=result.achievementProof||{};
 return (result.combo>=30?1:0)
 |(p.maxAirStreak>=3?2:0)
 |(p.spinKing===true?4:0)
 |(p.shoulderHits>=3?8:0)
 |(finalScore>=50000?16:0)
 |(p.quadMaster===true?32:0)
 |(p.airQuad===true?64:0)
 |(p.doubleAir===true?128:0);
}
export function publicProgress(data){
 const mask=data?.mask;
 if(!Number.isInteger(mask)||mask<0||mask>255)throw new Error('Invalid achievement progress');
 return {mask,master:mask===255,earned:TITLES.filter((_,i)=>!!(mask&(1<<i)))};
}

/** NEXT LEVEL titles are an independent eight-bit mask; never overwrite base titles. */
export const NEXT_TITLES=['FOOT MASTER','KNEE MASTER','TRAP MASTER','HEADING MASTER','SPIN MASTER','JUMP MASTER','SHOULDER MASTER','LIFTING LEGEND'];
export function nextLevelMask(result){
 const p=result?.nextProof;
 if(!p||!Number.isInteger(p.totalHits)||p.totalHits<0)return 0;
 const first=p.first30;
 const valid=first?.hits===30&&first.unbroken===true;
 const pure=key=>valid&&first[key]===30;
 const legend=['foot','knee','chest','heading','shoulder','spin','jump'].every(key=>Number.isInteger(p[key])&&p[key]>=4);
 return (pure('foot')?1:0)
  |(pure('knee')?2:0)
  |(pure('chest')?4:0)
  |(pure('heading')?8:0)
  |(pure('spin')?16:0)
  |(pure('jump')?32:0)
  |(p.shoulder>=10?64:0)
  |(legend?128:0);
}
