// STAGING ONLY: deterministic model of post-submit retry behavior.
// This is not connected to Worker, Supabase, or production RPCs.
// A submitted run can be retried after an achievement/daily failure.
// The DB implementations of each RPC must separately guarantee idempotency.
export function createBoostRetryHarness({submit,achievementMerge,nextAchievementMerge,dailyAward}){
 for(const fn of [submit,achievementMerge,nextAchievementMerge,dailyAward]){
  if(typeof fn!=='function')throw new TypeError('Trusted retry dependency required');
 }
 return Object.freeze({
  async process({playerId,runId,score,dailyEnabled=true}){
   if(!playerId||!runId||!Number.isSafeInteger(score)||score<0||typeof dailyEnabled!=='boolean')
    throw new TypeError('Invalid run');
   const saved=await submit({playerId,runId,score});
   // Even a replayed submit must continue to unfinished achievements and daily.
   const achievement=await achievementMerge({playerId,runId,score});
   let next=null;
   if(achievement.master)next=await nextAchievementMerge({playerId,runId,score});
   let daily=null;
   if(dailyEnabled)daily=await dailyAward({playerId,runId,score});
   return Object.freeze({saved,achievement,next,daily});
  }
 });
}
