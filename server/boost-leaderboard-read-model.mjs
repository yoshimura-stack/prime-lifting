// STAGING ONLY. Read-only, fail-closed projection of private verified BOOST receipts.
// Not imported by the production Worker; never call a client-supplied endpoint.
import {attachVerifiedBoostToLeader} from './boost-leaderboard-bridge.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function projectVerifiedBoostLeaderboard(players,publicEntries,{readReceipts}={}){
 if(!Array.isArray(players)||!Array.isArray(publicEntries)||players.length!==publicEntries.length)throw new TypeError('Mismatched ranking data');
 if(typeof readReceipts!=='function')throw new TypeError('Trusted private receipt reader required');
 const ids=players.map(p=>p?.id);
 if(ids.some(id=>typeof id!=='string'||!uuid.test(id))||new Set(ids).size!==ids.length)throw new TypeError('Invalid private player IDs');
 // One private batch read. Failure never suppresses the normal leaderboard.
 let receipts;
 try{receipts=await readReceipts({playerIds:ids});}catch{return publicEntries.map(entry=>({...entry}));}
 if(!receipts||typeof receipts!=='object'||Array.isArray(receipts))return publicEntries.map(entry=>({...entry}));
 return publicEntries.map((entry,index)=>{
  const player=players[index];
  const receipt=Object.hasOwn(receipts,player.id)?receipts[player.id]:null;
  try{return attachVerifiedBoostToLeader(entry,receipt,player.id);}catch{return {...entry};}
 });
}
