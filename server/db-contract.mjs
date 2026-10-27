// All privileged RPC calls run only from the Cloudflare Worker.
const player=p=>p&&({id:p.id,name:p.name,best:p.best,rank:p.rank,kit:p.kit??null,lastPlayed:p.lastPlayed??null,bestDevice:p.bestDevice==='mobile'||p.bestDevice==='pc'?p.bestDevice:null,dailyBonus:Number.isSafeInteger(p.dailyBonus)&&p.dailyBonus>=0?p.dailyBonus:null});
export default {
 verified:true,
 operations:Object.fromEntries(['register','login','me','leaderboard','submit','achievement_get','achievement_merge','achievement_list','next_achievement_get','next_achievement_merge','next_achievement_list','daily_award','daily_status','score_breakdown_list','boost_login_grant','boost_inventory','boost_reserve'].map(op=>[op,{
  rpc:'lifting_api_'+op,
  encode:input=>({payload:input}),
  decode:data=>{
   if(!data||typeof data!=='object')throw new Error('Invalid DB response');
   if(op==='daily_award'||op==='daily_status'||op==='score_breakdown_list'||op==='boost_login_grant'||op==='boost_inventory'||op==='boost_reserve')return data;
   if(op==='achievement_get'||op==='achievement_merge'||op==='achievement_list'||op.startsWith('next_achievement_'))return data;
   if(op==='leaderboard')return {entries:data.entries?.map(player)};
   if(op==='submit')return {...data,player:player(data.player)};
   return {player:player(data.player)};
  }
 }]))
};
