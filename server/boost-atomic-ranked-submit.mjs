// STAGING ONLY: isolated ranked-submit orchestration contract.
// This must be backed by ONE database transaction for both normal and BOOST runs.
// Never call the receipt-only RPC as a substitute for atomic ranked submission.
import {rankingBoostBreakdown} from '../js/boost-score-breakdown.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createBoostAtomicRankedSubmit({transport}={}){
 if(!transport||typeof transport.call!=='function')throw new TypeError('Trusted atomic submit transport required');
 return Object.freeze({async submit({playerId,runId,verified}={}){
  if(!uuid.test(playerId??'')||!uuid.test(runId??''))throw new TypeError('Trusted player and run required');
  if(!verified||typeof verified!=='object'||Array.isArray(verified))throw new TypeError('Verified replay required');
  const {boost,baseScore,boostBonus,playScore}=verified;
  const checked=rankingBoostBreakdown({boost,baseScore,boostBonus,playScore});
  if(checked.legacy||boost==='score'&&playScore!==Math.round(baseScore*1.1))
   throw new TypeError('Invalid verified BOOST breakdown');
  // Caller must be the signed replay validator, not a browser request body.
  const result=await transport.call('boost_atomic_ranked_submit',{playerId,runId,boost,baseScore,boostBonus,playScore});
  if(!result||typeof result!=='object'||Array.isArray(result)||
   result.runId!==runId||result.playScore!==playScore||
   typeof result.replayed!=='boolean'||typeof result.personalBest!=='boolean')
   throw new TypeError('Unconfirmed atomic ranked submit');
  return Object.freeze({runId,playScore,replayed:result.replayed,personalBest:result.personalBest});
 }});
}
