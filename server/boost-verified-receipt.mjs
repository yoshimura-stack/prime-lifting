// Staging-only persistence adapter. Call ONLY after server replay and signed-run verification.
// This is not a score validator; the service-role RPC is private and MUST NOT be public.
import {rankingBoostBreakdown} from '../js/boost-score-breakdown.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createBoostVerifiedReceiptStore(transport){
 if(!transport||typeof transport.call!=='function')throw new TypeError('Trusted transport required');
 return Object.freeze({async save({playerId,runId,boost,baseScore,boostBonus,playScore}){
  if(typeof playerId!=='string'||!uuid.test(playerId)||typeof runId!=='string'||!uuid.test(runId))throw new TypeError('Invalid run');
  const parsed=rankingBoostBreakdown({boost,baseScore,boostBonus,playScore});
  if(parsed.legacy)throw new TypeError('Complete breakdown required');
  if(boost==='score'&&playScore!==Math.round(baseScore*1.1))throw new RangeError('Invalid SCORE BOOST multiplier');
  const result=await transport.call('boost_verified_receipt',{playerId,runId,boost,baseScore,boostBonus,playScore});
  if(!result||result.runId!==runId||result.playScore!==playScore||typeof result.replayed!=='boolean')throw new TypeError('Invalid receipt response');
  return Object.freeze({runId,playScore,replayed:result.replayed});
 }});
}
