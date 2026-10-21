// Isolated finish validation. Not connected to live score submission.
import {replay,ApiError} from './replay.mjs';
import {verifyBoostRunToken} from './boost-run-token.mjs';
import {verifiedBoostBreakdown} from '../js/boost-score-breakdown.mjs';

export function createBoostFinishValidator({secret,clock=()=>Date.now(),claimRun}={}){
 if(typeof secret!=='string'||secret.length<32||typeof clock!=='function'||typeof claimRun!=='function')throw new TypeError('Missing trusted dependencies');
 return Object.freeze({
  async validate({playerId,runId,token,events,worldWidth,device,claimedScore}){
   const signed=await verifyBoostRunToken(token,{playerId,runId,secret,now:clock()});
   if(!signed)throw new ApiError(401,'Invalid signed run');
   if(signed.boost==='time'||signed.boost==='sc')throw new ApiError(409,'BOOST replay rules pending');
   const verified=replay(events,worldWidth);
   const breakdown=verifiedBoostBreakdown(verified.score,device,signed.boost);
   if(claimedScore!==undefined&&claimedScore!==breakdown.playScore)throw new ApiError(400,'Score mismatch');
   // claimRun must atomically confirm reservation and mark this run as used.
   // This is a server dependency, never client-supplied. No ranking write here.
   const claimed=await claimRun({playerId,runId,boost:signed.boost});
   if(claimed!==true)throw new ApiError(409,'Run already consumed or not reserved');
   return Object.freeze({runId,boost:signed.boost,...breakdown,verified});
  }
 });
}
