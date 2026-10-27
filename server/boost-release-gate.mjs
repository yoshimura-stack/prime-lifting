// STAGING ONLY. Fail closed before enabling BOOST when the real ranked-submit
// transaction or private leaderboard provenance reads are unavailable.
// A verified receipt by itself is NOT a ranked score submission.
const REQUIRED=Object.freeze([
 'lifting_api_submit_boost_atomic',
 'lifting_api_boost_best_run_lookup',
 'lifting_api_boost_verified_receipt_list'
]);
export function assessBoostReleaseReadiness({functions=[],tables=[],workerWired=false,uiWired=false,ciPassed=false,rankingPersistence='unverified'}={}){
 const present=new Set(functions);
 const existingTables=new Set(tables);
 const missing=REQUIRED.filter(name=>!present.has(name));
 if(!existingTables.has('lifting_runs'))missing.push('lifting_runs');
 if(!existingTables.has('lifting_players'))missing.push('lifting_players');
 // A shadow/test-double ranking is never sufficient for a production release.
 if(rankingPersistence!=='production-compatible-atomic')missing.push('production_compatible_atomic_ranking');
 if(!workerWired)missing.push('authenticated_worker_routes');
 if(!uiWired)missing.push('game_ui_wiring');
 if(!ciPassed)missing.push('end_to_end_ci');
 return Object.freeze({ready:missing.length===0,missing:Object.freeze(missing)});
}
export const BOOST_REQUIRED_RELEASE_FUNCTIONS=REQUIRED;
