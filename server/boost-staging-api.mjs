// Staging-only composition boundary for future authenticated Worker routes.
// Caller must derive playerId from a verified session; never accept it from request JSON.
import {createBoostRunCoordinator} from './boost-run-coordinator.mjs';
import {createBoostFinishValidator} from './boost-finish-validator.mjs';
import {createBoostVerifiedReceiptStore} from './boost-verified-receipt.mjs';
import {ApiError} from './replay.mjs';
export function createBoostStagingApi({transport,secret,clock,newRunId}={}){
 const coordinator=createBoostRunCoordinator({transport,secret,clock,newRunId});
 const receipts=createBoostVerifiedReceiptStore(transport);
 const finish=createBoostFinishValidator({secret,clock,saveReceipt:receipts.save});
 return Object.freeze({
  async start({authenticatedPlayerId,body={}}){
   if(!body||typeof body!=='object'||Array.isArray(body))throw new ApiError(400,'Invalid request');
   if(Object.hasOwn(body,'playerId')||Object.hasOwn(body,'runId')||Object.hasOwn(body,'token'))throw new ApiError(403,'Client cannot supply trusted identity or run ID');
   const allowed=new Set(['boost']);
   if(Object.keys(body).some(key=>!allowed.has(key)))throw new ApiError(400,'Unknown BOOST start field');
   return coordinator.start({playerId:authenticatedPlayerId,boost:body.boost??null});
  },
  async finish({authenticatedPlayerId,body={}}){
   if(!body||typeof body!=='object'||Array.isArray(body))throw new ApiError(400,'Invalid request');
   if(Object.hasOwn(body,'playerId')||Object.hasOwn(body,'boost')||Object.hasOwn(body,'baseScore')||Object.hasOwn(body,'boostBonus'))throw new ApiError(403,'Client cannot claim trusted score or BOOST');
   const allowed=new Set(['runId','token','events','worldWidth','device','claimedScore']);
   if(Object.keys(body).some(key=>!allowed.has(key)))throw new ApiError(400,'Unknown BOOST finish field');
   return finish.validate({playerId:authenticatedPlayerId,...body});
  }
 });
}
