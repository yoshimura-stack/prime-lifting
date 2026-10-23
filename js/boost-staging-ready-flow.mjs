// Staging-only integration of confirmed inventory/ready UI with signed HTTP.
// The real game can pass applyConfirmedBoostRun as beginGame once its staging
// authentication, replay capture and result submission are connected.
import {createBoostBrowserReady} from './boost-browser-ready.mjs';
import {createBoostStagingHttpClient} from './boost-staging-http-client.mjs';
export function createBoostStagingReadyFlow({inventory,getBearer,fetcher,origin,beginGame,onStatus}={}){
 const client=createBoostStagingHttpClient({getBearer,fetcher,origin});
 const makeReady=()=>createBoostBrowserReady({
  inventory,
  startOfficialRun:boost=>client.start(boost),
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
