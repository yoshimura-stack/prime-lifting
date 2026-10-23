// Staging-only ranking presentation contract; not connected to live ranking UI.
// A saved total always remains the ranking score. Never fabricate legacy bonus.
import {rankingBoostBreakdown} from './boost-score-breakdown.mjs';
export function rankingBoostDisplay(record){
 const breakdown=rankingBoostBreakdown(record);
 const score=breakdown.playScore;
 if(breakdown.legacy)return Object.freeze({score,baseScore:null,boostBonus:null,boost:null,showBreakdown:false});
 return Object.freeze({score,baseScore:breakdown.baseScore,boostBonus:breakdown.boostBonus,boost:breakdown.boost,showBreakdown:breakdown.boost==='score'});
}
