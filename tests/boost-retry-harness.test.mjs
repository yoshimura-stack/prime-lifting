import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostRetryHarness} from '../server/boost-retry-harness.mjs';

function fixture({failAt=null,master=false}={}){
 const calls=[],submitted=new Map(),achievements=new Set(),nexts=new Set(),daily=new Set();
 let failOnce=failAt;
 const fail=(stage)=>{if(failOnce===stage){failOnce=null;throw new Error(stage+' temporary failure');}};
 const harness=createBoostRetryHarness({
  async submit({runId,score}){calls.push('submit');fail('submit');const replayed=submitted.has(runId);if(replayed&&submitted.get(runId)!==score)throw new Error('conflicting replay');submitted.set(runId,score);return {replayed};},
  async achievementMerge({runId}){calls.push('achievement');fail('achievement');achievements.add(runId);return {master};},
  async nextAchievementMerge({runId}){calls.push('next');fail('next');nexts.add(runId);return {ok:true};},
  async dailyAward({runId}){calls.push('daily');fail('daily');daily.add(runId);return {ok:true};}
 });
 return {harness,calls,submitted,achievements,nexts,daily};
}
const run={playerId:'player',runId:'run',score:55000};
for(const stage of ['achievement','next','daily']){
 test('retry after '+stage+' failure retains one submit and one reward',async()=>{
  const f=fixture({failAt:stage,master:true});
  await assert.rejects(f.harness.process(run),new RegExp(stage));
  const result=await f.harness.process(run);
  assert.equal(result.saved.replayed,true);
  assert.equal(f.submitted.size,1);
  assert.equal(f.achievements.size,1);
  assert.equal(f.nexts.size,1);
  assert.equal(f.daily.size,1);
  assert.deepEqual(f.calls.slice(0,4),stage==='achievement'?['submit','achievement','submit','achievement']:stage==='next'?['submit','achievement','next','submit']:['submit','achievement','next','daily']);
 });
}
test('daily-disabled path never grants credits',async()=>{
 const f=fixture();const result=await f.harness.process({...run,dailyEnabled:false});
 assert.equal(result.daily,null);assert.equal(f.daily.size,0);assert.deepEqual(f.calls,['submit','achievement']);
});
test('same run conflicting score is rejected without another reward',async()=>{
 const f=fixture();await f.harness.process(run);
 await assert.rejects(f.harness.process({...run,score:60000}),/conflicting replay/);
 assert.equal(f.submitted.size,1);assert.equal(f.daily.size,1);
});
test('missing trusted dependency fails closed',()=>{
 assert.throws(()=>createBoostRetryHarness({submit:async()=>{}}),/Trusted retry dependency/);
});
