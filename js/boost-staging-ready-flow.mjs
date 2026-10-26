// Staging-only integration of confirmed inventory/ready UI with signed HTTP.
// The real game can pass applyConfirmedBoostRun as beginGame once its staging
// authentication, replay capture and result submission are connected.
import {createBoostBrowserReady} from './boost-browser-ready.mjs';
import {createBoostStagingHttpClient} from './boost-staging-http-client.mjs';
export function createBoostStagingReadyFlow({inventory,getBearer,fetcher,origin,beginGame,onStatus}={}){
 const client=createBoostStagingHttpClient({getBearer,fetcher,origin});
 // Keep a conservative local count after a confirmed reservation. The server
 // remains authoritative; never re-offer a consumed item from a stale snapshot.
 const stock={time:inventory?.time??0,score:inventory?.score??0,sc:inventory?.sc??0};
 const makeReady=()=>createBoostBrowserReady({
  inventory:stock,
  startOfficialRun:async boost=>{
   const run=await client.start(boost);
   if(boost!==null)stock[boost]=Math.max(0,stock[boost]-1);
   return run;
  },
  beginGame,
  onStatus
 });
 let ready=makeReady();
 return Object.freeze({
  get selected(){return ready.selected;},
  get pending(){return ready.pending;},
  get activeRun(){return client.activeRun;},
  select:boost=>ready.select(boost),
  start:()=>ready.start(),
  async finish(input){
   const result=await client.finish(input);
   ready=makeReady();
   return result;
  }
 });
}
