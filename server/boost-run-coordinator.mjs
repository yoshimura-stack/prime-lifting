// Staging-only game-start coordinator. NOT wired to production Worker or preview public routes.
// Requires trusted session identity and a server-created run ID. DB reserve RPC must be atomic.
import {validateBoostSelection} from '../js/boost-rules.mjs';
import {issueBoostRunToken,verifyBoostRunToken} from './boost-run-token.mjs';
import {verifiedBoostBreakdown} from '../js/boost-score-breakdown.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createBoostRunCoordinator({transport,secret,clock=()=>Date.now(),newRunId=()=>crypto.randomUUID()}={}){
 if(!transport||typeof transport.call!=='function'||typeof secret!=='string'||secret.length<32||typeof clock!=='function'||typeof newRunId!=='function')throw new TypeError('Trusted server dependencies required');
 return Object.freeze({
  async start({playerId,boost=null}){
   if(typeof playerId!=='string'||!uuid.test(playerId))throw new TypeError('Trusted player required');
   const selection=validateBoostSelection(boost);
   const runId=newRunId();if(typeof runId!=='string'||!uuid.test(runId))throw new TypeError('Server run ID required');
   // Only the trusted server calls this. Atomic DB reservation is the source of truth.
   // For NONE no BOOST inventory is consumed.
   if(selection!==null){
    const result=await transport.call('boost_reserve',{playerId,runId,boost:selection});
    if(!result||result.boost!==selection||result.replayed!==false||!Number.isInteger(result.remaining)||result.remaining<0||result.remaining>2)
     throw new Error('BOOST reservation not confirmed');
   }
   const token=await issueBoostRunToken({playerId,runId,boost:selection,secret,now:clock()});
   return Object.freeze({runId,boost:selection,token});
  },
  async score({playerId,runId,token,baseScore,device}){
   const verified=await verifyBoostRunToken(token,{playerId,runId,secret,now:clock()});
   if(!verified)throw new TypeError('Invalid official run token');
   // This computes a candidate only. A separate server-side replay, one-time run
   // consumption and verified inventory reservation are mandatory before DB submission.
   return verifiedBoostBreakdown(baseScore,device,verified.boost);
  }
 });
}
