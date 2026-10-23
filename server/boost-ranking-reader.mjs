// STAGING ONLY: compose private best-run and verified receipt reads.
// No production Worker import, schema migration, or public RPC exposure.
import {decodePrivateBestRunLookup} from './boost-best-run-lookup.mjs';
import {projectVerifiedBoostLeaderboard} from './boost-leaderboard-read-model.mjs';
export function createBoostRankingReader(transport){
 if(!transport||typeof transport.call!=='function')throw new TypeError('Private trusted transport required');
 return Object.freeze({async enrich(players,entries){
  if(!Array.isArray(players)||!Array.isArray(entries)||players.length!==entries.length)throw new TypeError('Mismatched ranking data');
  const fallback=()=>entries.map(entry=>({...entry}));
  let lookup;
  try{lookup=await transport.call('boost_best_run_lookup',{playerIds:players.map(p=>p.id)});}catch{return fallback();}
  let trustedPlayers;
  try{trustedPlayers=decodePrivateBestRunLookup(lookup,players);}catch{return fallback();}
  if(!trustedPlayers.some(p=>p.bestRunId))return fallback();
  return projectVerifiedBoostLeaderboard(trustedPlayers,entries,{
   readReceipts:({playerIds,runIds})=>transport.call('boost_verified_receipt_list',{playerIds,runIds})
  });
 }});
}
