// Isolated finish validation. Not connected to live score submission.
import {replay,ApiError} from './replay.mjs';
import {verifyBoostRunToken} from './boost-run-token.mjs';
import {verifiedBoostBreakdown} from '../js/boost-score-breakdown.mjs';

export function createBoostFinishValidator({secret,clock=()=>Date.now(),saveReceipt,claimRun}={}){
 const persist=saveReceipt??(typeof claimRun==='function'?async payload=>{
  const ok=await claimRun({playerId:payload.playerId,runId:payload.runId,boost:payload.boost});
  return ok===true?{runId:payload.runId,playScore:payload.playScore,replayed:false}:null;
 }:null);
 if(typeof secret!=='string'||secret.length<32||typeof clock!=='function'||typeof persist!=='function')throw new TypeError('Missing trusted dependencies');
 return Object.freeze({
  async validate({playerId,runId,token,events,worldWidth,device,claimedScore}){
   const signed=await verifyBoostRunToken(token,{playerId,runId,secret,now:clock()});
   if(!signed)throw new ApiError(401,'Invalid signed run');
   if(signed.boost==='time'||signed.boost==='sc')throw new ApiError(409,'BOOST replay rules pending');
   const verified=replay(events,worldWidth);
   const breakdown=verifiedBoostBreakdown(verified.score,device,signed.boost);
   if(claimedScore!==undefined&&claimedScore!==breakdown.playScore)throw new ApiError(400,'Score mismatch');
   // Only a trusted server injects this receipt store. The staging RPC atomically
   // verifies the matching reservation and deduplicates the score receipt.
   // Ranking persistence remains disconnected.
   const receipt=await persist({playerId,runId,...breakdown});
   if(!receipt||receipt.runId!==runId||receipt.playScore!==breakdown.playScore||typeof receipt.replayed!=='boolean')
    throw new ApiError(502,'Verified receipt not confirmed');
   return Object.freeze({runId,boost:signed.boost,...breakdown,verified,replayed:receipt.replayed});
  }
 });
}
