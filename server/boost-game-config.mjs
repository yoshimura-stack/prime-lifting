// Staging-only bridge from a server-issued run token to a fresh engine config.
// No URL, localStorage, or browser-selected BOOST may control the timer.
import {verifyBoostRunToken} from './boost-run-token.mjs';
import {createBoostRun} from '../js/boost-rules.mjs';

export async function verifiedBoostGameConfig({token,playerId,runId,secret,now=Date.now(),baseConfig}={}){
 const signed=await verifyBoostRunToken(token,{playerId,runId,secret,now});
 if(!signed)throw new TypeError('Valid server-issued run token required');
 if(!baseConfig||baseConfig.GAME_DURATION!==60)throw new TypeError('Expected standard 60-second engine config');
 const run=createBoostRun(signed.boost);
 // Clone, never mutate the shared defaults or the live engine.
 return Object.freeze({boost:signed.boost,config:{...structuredClone(baseConfig),GAME_DURATION:run.durationSeconds}});
}
