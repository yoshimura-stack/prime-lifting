// Staging browser adapter. No secret or DB authority is available to this module.
// A trusted API must supply the verified inventory and confirm each START.
// Never read BOOST stock from URL, DOM or localStorage.
import {createReadyBoostSelection} from './boost-ready-selection.mjs';

export function createBoostBrowserReady({inventory,startOfficialRun,beginGame,onStatus=()=>{}}={}){
 if(typeof startOfficialRun!=='function'||typeof beginGame!=='function')throw new TypeError('Trusted callbacks required');
 const ready=createReadyBoostSelection(inventory);
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
   onStatus('BOOST開始を確認中');
   try{
    const run=await ready.start(startOfficialRun);
    // Browser only accepts a server-confirmed run; it never calculates its own
    // duration from an untrusted URL or inventory snapshot.
    if(!Number.isInteger(run.durationSeconds)||run.durationSeconds!==(run.boost==='time'?65:60))
     throw new Error('Server duration not confirmed');
    started=true;
    beginGame(Object.freeze({runId:run.runId,token:run.token,boost:run.boost,durationSeconds:run.durationSeconds}));
    onStatus('プレイ開始');
    return run;
   }catch(error){
    onStatus('開始を確認できませんでした。再試行してください');
    throw error;
   }
  }
 });
}
