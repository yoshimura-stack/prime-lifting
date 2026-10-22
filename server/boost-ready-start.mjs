// Isolated staging START-to-engine bridge. Only the trusted server runs this.
// Never expose the signing secret or the transport to the browser.
import {createReadyBoostSelection} from '../js/boost-ready-selection.mjs';
import {createBoostRunCoordinator} from './boost-run-coordinator.mjs';
import {verifiedBoostGameConfig} from './boost-game-config.mjs';

export function createBoostReadyStart({inventory,transport,secret,clock,newRunId,baseConfig,playerId}={}){
 const ready=createReadyBoostSelection(inventory);
 const coordinator=createBoostRunCoordinator({transport,secret,clock,newRunId});
 let started=false;
 return Object.freeze({
  get selected(){return ready.selected;},
  get pending(){return ready.pending;},
  select(boost){
   if(started)throw new Error('Run already started');
   return ready.select(boost);
  },
  async start(){
   if(started)throw new Error('Run already started');
   return ready.start(async boost=>{
    // The server must derive playerId from an authenticated session, not request body.
    const run=await coordinator.start({playerId,boost});
    const verified=await verifiedBoostGameConfig({
     token:run.token,playerId,runId:run.runId,secret,now:clock?.()??Date.now(),baseConfig
    });
    if(verified.boost!==boost)throw new Error('BOOST mismatch');
    started=true;
    return Object.freeze({...run,config:verified.config});
   });
  }
 });
}
