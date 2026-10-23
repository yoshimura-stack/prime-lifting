// Staging-only bridge for trusted leaderboard receipt data.
// The production leaderboard and score_breakdown_list RPCs remain unchanged.
import {rankingBoostDisplay} from '../js/boost-ranking-display.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function attachVerifiedBoostToLeader(entry,receipt,internalPlayerId=entry?.playerId,internalBestRunId){
 if(!entry||!Number.isSafeInteger(entry.score)||entry.score<0)throw new TypeError('Invalid leaderboard entry');
 if(receipt==null)return Object.freeze({...entry});
 // Match the saved personal-best play, never a different run or daily-inclusive total.
 const savedPlayScore=Number.isSafeInteger(entry.playScore)?entry.playScore:entry.score;
 if(!uuid.test(internalPlayerId??'')||!uuid.test(internalBestRunId??'')||receipt.playerId!==internalPlayerId||receipt.runId!==internalBestRunId||receipt.playScore!==savedPlayScore)return Object.freeze({...entry});
 const verified=rankingBoostDisplay(receipt);
 if(!verified.showBreakdown)return Object.freeze({...entry});
 return Object.freeze({...entry,boost:'score',boostBaseScore:verified.baseScore,boostBonus:verified.boostBonus});
}
