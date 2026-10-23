// Staging-only private DB result contract for personal-best BOOST attribution.
// Do not add bestRunId to the public leaderboard response or existing RPC.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function decodePrivateBestRunLookup(response,players){
 if(!Array.isArray(players))throw new TypeError('Invalid player list');
 const ids=players.map(p=>p?.id);
 if(ids.some(id=>typeof id!=='string'||!uuid.test(id))||new Set(ids).size!==ids.length)throw new TypeError('Invalid private player IDs');
 // A missing or malformed DB response cannot confer BOOST credit.
 if(!response||typeof response!=='object'||Array.isArray(response))return players.map(p=>({...p,bestRunId:null}));
 return players.map(p=>{
  const item=Object.hasOwn(response,p.id)?response[p.id]:null;
  // Both best score and exact run ID must originate in the same trusted DB lookup.
  const bestRunId=item?.bestRunId;
  const valid=uuid.test(bestRunId??'')&&Number.isSafeInteger(item?.bestScore)&&item.bestScore>=0&&item.bestScore===p.best;
  return {...p,bestRunId:valid?bestRunId:null};
 });
}
