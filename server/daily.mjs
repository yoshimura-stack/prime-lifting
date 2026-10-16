// Daily challenges are shared by all players and rotate at midnight JST.
// Pure functions: no cron, randomness, or database writes are required to select a day.
export const DAILY_POOLS=Object.freeze({
 easy:Object.freeze([
  {id:'keep10',label:'10キープ達成',target:10,metric:'combo'},
  {id:'keep15',label:'15キープ達成',target:15,metric:'combo'},
  {id:'foot10',label:'足タッチ10回成功',target:10,metric:'foot'}
 ]),
 normal:Object.freeze([
  {id:'spin3',label:'スピン付きタッチ3回',target:3,metric:'spin'},
  {id:'jump5',label:'ジャンプ付きタッチ5回',target:5,metric:'jump'},
  {id:'knee8',label:'膝タッチ8回成功',target:8,metric:'knee'},
  {id:'chest6',label:'胸タッチ6回成功',target:6,metric:'chest'}
 ]),
 hard:Object.freeze([
  {id:'shoulder2',label:'肩タッチ2回成功',target:2,metric:'shoulder'},
  {id:'keep30',label:'30キープ達成',target:30,metric:'combo'},
  {id:'quad1',label:'4回転スピンを成功',target:1,metric:'quad'}
 ])
});
export function jstDay(ms){
 if(!Number.isFinite(ms))throw new TypeError('Invalid timestamp');
 return new Date(ms+9*3600000).toISOString().slice(0,10);
}
function hash(value){let n=2166136261;for(const c of value){n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;}return n;}
export function dailyChallenges(day){
 if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(day)||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)throw new TypeError('Invalid day');
 return Object.entries(DAILY_POOLS).map(([difficulty,pool])=>({
  ...pool[hash(day+':'+difficulty)%pool.length],difficulty,reward:100,day
 }));
}
export function dailyRunProgress(result){
 const p=result?.nextProof||{};
 return {combo:Math.max(0,Number(result?.combo)||0),
  foot:Math.max(0,Number(p.foot)||0),knee:Math.max(0,Number(p.knee)||0),
  chest:Math.max(0,Number(p.chest)||0),shoulder:Math.max(0,Number(p.shoulder)||0),
  spin:Math.max(0,Number(p.spin)||0),jump:Math.max(0,Number(p.jump)||0),
  quad:result?.achievementProof?.quadMaster===true?1:0};
}
export function completedDailyChallenges(day,result){
 const metrics=dailyRunProgress(result);
 return dailyChallenges(day).filter(c=>metrics[c.metric]>=c.target).map(c=>c.id);
}
export function earnedPlayCoins(score,earnedToday=0){
 if(!Number.isSafeInteger(score)||score<0||!Number.isSafeInteger(earnedToday)||earnedToday<0)throw new TypeError('Invalid coin input');
 return Math.min(Math.floor(score/1000)*10,Math.max(0,2000-earnedToday));
}
