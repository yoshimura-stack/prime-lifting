// STAGING ONLY: pure model of the future database transaction, NOT a DB writer.
// Used to test best-run pointer rules before integrating with verified submit.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function planAtomicBestRunUpdate({currentBest,currentBestRunId=null,runId,verifiedScore,boost=null,replayed=false}){
 if(!Number.isSafeInteger(currentBest)||currentBest<0||!Number.isSafeInteger(verifiedScore)||verifiedScore<0||!uuid.test(runId??'')||currentBestRunId!==null&&!uuid.test(currentBestRunId)||!([null,'time','score','sc'].includes(boost))||typeof replayed!=='boolean')throw new TypeError('Invalid verified submit state');
 // Existing run ID must never mutate best score or its provenance.
 if(replayed)return Object.freeze({nextBest:currentBest,nextBestRunId:currentBestRunId,changed:false});
 // Ties preserve the first committed best run. A higher non-BOOST run removes attribution.
 if(verifiedScore<=currentBest)return Object.freeze({nextBest:currentBest,nextBestRunId:currentBestRunId,changed:false});
 return Object.freeze({nextBest:verifiedScore,nextBestRunId:boost===null?null:runId,changed:true});
}
