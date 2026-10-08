// All privileged RPC calls run only from the Cloudflare Worker.
const player=p=>p&&({id:p.id,name:p.name,best:p.best,rank:p.rank,kit:p.kit??null,lastPlayed:p.lastPlayed??null});
export default {
 verified:true,
 operations:Object.fromEntries(['register','login','me','leaderboard','submit'].map(op=>[op,{
  rpc:'lifting_api_'+op,
  encode:input=>({payload:input}),
  decode:data=>{
   if(!data||typeof data!=='object')throw new Error('Invalid DB response');
   if(op==='leaderboard')return {entries:data.entries?.map(player)};
   if(op==='submit')return {...data,player:player(data.player)};
   return {player:player(data.player)};
  }
 }]))
};
