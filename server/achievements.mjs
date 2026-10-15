// Canonical bit positions for the eight collectible titles.
// The mask is derived only from a replay accepted by the Worker.
export const TITLES=['30 KEEPS CLUB','AIR MASTER','SPIN KING','SHOULDER ACE','SCORE HUNTER','QUAD MASTER','AIR QUAD','DOUBLE AIR'];
export function achievementMask(result,finalScore){
 const p=result.achievementProof||{};
 return (result.combo>=30?1:0)
 |(p.maxAirStreak>=3?2:0)
 |(p.spinKing===true?4:0)
 |(p.shoulderHits>=1?8:0)
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
