// Preview-only scoring breakdown. No live ranking or database writes.
import {finalScore,validateBoostSelection} from './boost-rules.mjs';

/** Construct a server-verifiable BOOST delta, never a client-supplied bonus. */
export function verifiedBoostBreakdown(baseScore,device,boost=null){
 const selected=validateBoostSelection(boost);
 const playScore=finalScore(baseScore,device,selected);
 const boostBonus=playScore-baseScore;
 if(!Number.isSafeInteger(playScore)||!Number.isSafeInteger(boostBonus)||boostBonus<0)
  throw new RangeError('Invalid verified BOOST score');
 return Object.freeze({baseScore,boost:selected,boostBonus,playScore});
}

/** Existing records retain their already-saved totals; unknown breakdown is not invented. */
export function rankingBoostBreakdown(record){
 if(!record||!Number.isSafeInteger(record.playScore)||record.playScore<0)
  throw new TypeError('Invalid saved play score');
 const {baseScore,boostBonus,boost}=record;
 if(baseScore===undefined||boostBonus===undefined||boost===undefined)
  return Object.freeze({playScore:record.playScore,boostBonus:null,boost:null,legacy:true});
 const selected=validateBoostSelection(boost);
 if(!Number.isSafeInteger(baseScore)||baseScore<0||!Number.isSafeInteger(boostBonus)||boostBonus<0||baseScore+boostBonus!==record.playScore)
  throw new RangeError('Inconsistent BOOST breakdown');
 if(selected!=='score'&&boostBonus!==0)throw new RangeError('Non-score BOOST cannot award a score multiplier');
 return Object.freeze({playScore:record.playScore,baseScore,boostBonus,boost:selected,legacy:false});
}
