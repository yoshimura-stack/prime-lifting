// Daily challenges are shared by all players and rotate at midnight JST.
// Pure functions: no cron, randomness, or database writes are required to select a day.
export const DAILY_POOLS=Object.freeze({
 easy:Object.freeze([
  {id:'keep10',label:'10キープ達成',target:10,metric:'combo'},
  {id:'keep15',label:'15キープ達成',target:15,metric:'combo'},
  {id:'foot10',label:'足タッチ10回成功',target:10,metric:'foot'},
  {id:'foot15',label:'足タッチ15回成功',target:15,metric:'foot'},
  {id:'knee3',label:'膝タッチ3回成功',target:3,metric:'knee'},
  {id:'chest3',label:'胸タッチ3回成功',target:3,metric:'chest'},
  {id:'spin1',label:'スピン付きタッチ1回',target:1,metric:'spin'},
  {id:'jump2',label:'ジャンプ付きタッチ2回',target:2,metric:'jump'},
  {id:'keep12',label:'12キープ達成',target:12,metric:'combo'},
  {id:'foot20',label:'足タッチ20回成功',target:20,metric:'foot'}
 ]),
 normal:Object.freeze([
  {id:'spin3',label:'スピン付きタッチ3回',target:3,metric:'spin'},
  {id:'jump5',label:'ジャンプ付きタッチ5回',target:5,metric:'jump'},
  {id:'knee8',label:'膝タッチ8回成功',target:8,metric:'knee'},
  {id:'chest6',label:'胸タッチ6回成功',target:6,metric:'chest'},
  {id:'keep20',label:'20キープ達成',target:20,metric:'combo'},
  {id:'foot30',label:'足タッチ30回成功',target:30,metric:'foot'},
  {id:'spin5',label:'スピン付きタッチ5回',target:5,metric:'spin'},
  {id:'jump8',label:'ジャンプ付きタッチ8回',target:8,metric:'jump'},
  {id:'knee12',label:'膝タッチ12回成功',target:12,metric:'knee'},
  {id:'chest10',label:'胸タッチ10回成功',target:10,metric:'chest'}
 ]),
 hard:Object.freeze([
  {id:'shoulder2',label:'肩タッチ2回成功',target:2,metric:'shoulder'},
  {id:'keep30',label:'30キープ達成',target:30,metric:'combo'},
  {id:'quad1',label:'4回転スピンを成功',target:1,metric:'quad'},
  {id:'keep40',label:'40キープ達成',target:40,metric:'combo'},
  {id:'shoulder3',label:'肩タッチ3回成功',target:3,metric:'shoulder'},
  {id:'spin10',label:'スピン付きタッチ10回',target:10,metric:'spin'},
  {id:'jump12',label:'ジャンプ付きタッチ12回',target:12,metric:'jump'},
  {id:'knee20',label:'膝タッチ20回成功',target:20,metric:'knee'},
  {id:'chest15',label:'胸タッチ15回成功',target:15,metric:'chest'},
  {id:'keep50',label:'50キープ達成',target:50,metric:'combo'}
 ])
});
export function jstDay(ms){
 if(!Number.isFinite(ms))throw new TypeError('Invalid timestamp');
 return new Date(ms+9*3600000).toISOString().slice(0,10);
}
function hash(value){let n=2166136261;for(const c of value){n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;}return n;}
// All players see the same mission. Avoid yesterday's mission without any DB writes.
function missionIndex(day,difficulty,length){
 const previous=new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 const beforePrevious=new Date(Date.parse(day+'T00:00:00Z')-172800000).toISOString().slice(0,10);
 const priorRaw=hash(previous+':'+difficulty)%length;
 const priorPriorRaw=hash(beforePrevious+':'+difficulty)%length;
 const priorIndex=priorRaw===priorPriorRaw?(priorRaw+1)%length:priorRaw;
 const index=hash(day+':'+difficulty)%length;
 return index===priorIndex?(index+1)%length:index;
}
export function dailyChallenges(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)throw new TypeError('Invalid day');
 return Object.entries(DAILY_POOLS).map(([difficulty,pool])=>({
  ...pool[missionIndex(day,difficulty,pool.length)],difficulty,reward:100,day
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

// Rank uses play best plus unique daily completions; the coin wallet is separate.
export function rankingTotal(playBest,dailyCompleted){
 if(!Number.isSafeInteger(playBest)||playBest<0||!Number.isSafeInteger(dailyCompleted)||dailyCompleted<0)throw new TypeError('Invalid ranking input');
 const total=playBest+dailyCompleted*100;
 if(!Number.isSafeInteger(total))throw new RangeError('Ranking total overflow');
 return total;
}
export function jstMonth(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new TypeError('Invalid JST day');
 return day.slice(0,7);
}
