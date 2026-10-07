import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import { readFileSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {init,begin,submit,leaderboard,replay,RULESET} from '../server/ranking.mjs';
const dir=mkdtempSync(join(tmpdir(),'prime-rank-')),file=join(dir,'test.sqlite');let db=new DatabaseSync(file);init(db);const start=100000,after=start+64000;
try{
 const context=vm.createContext({});for(const f of ['config.js','engine.js'])vm.runInContext(readFileSync(new URL('../js/'+f,import.meta.url),'utf8'),context);
 const game=new context.LiftingGame(structuredClone(context.PRIME_DEFAULTS));game.reset();const events=[];let tick=0,lastDir=0;
 while(game.phase!=='ended'&&tick<7800){const p=game.player,b=game.ball,r=game.regions().find(r=>r.name==='FOOT'&&r.side==='LEFT');
  if(game.phase==='playing'&&b.active&&b.vy>0&&Math.hypot(b.x-r.x,b.y-r.y)<r.r*.65&&game.cooldown===0){events.push({t:tick,n:'act'});game.act();}
  const error=b.x-19-p.x,dir=tick%6?lastDir:(Math.abs(error)<4?0:(error-p.vx*.12>0?1:-1));if(dir!==lastDir){events.push({t:tick,n:'move',v:dir});lastDir=dir;}
  game.update(1/120,dir);tick++;
 }
 assert.ok(game.score>0);assert.equal(replay(events).score,game.score);
 const best1=begin(db,'best1',start),best2=begin(db,'best2',start);submit(db,{runId:best1.runId,name:'最高得点テスト',ruleset:RULESET,events:[]},after);submit(db,{runId:best2.runId,name:'最高得点テスト',ruleset:RULESET,events},after+1);assert.equal(leaderboard(db).entries[0].score,game.score);
 db.prepare('DELETE FROM scores_v031').run();db.prepare('DELETE FROM runs_v031').run();
 const a=begin(db,'a',start);assert.throws(()=>submit(db,{runId:a.runId,name:'A',ruleset:RULESET,events:[]},start+100),/60秒/);
 const saved=submit(db,{runId:a.runId,name:'テスト 太郎',ruleset:RULESET,events:[]},after);assert.equal(saved.score,0);assert.equal(saved.rank,1);
 submit(db,{runId:a.runId,name:'テスト 太郎',ruleset:RULESET,events:[]},after+1);assert.equal(db.prepare('SELECT COUNT(*) n FROM scores_v031').get().n,1);
 assert.throws(()=>submit(db,{runId:a.runId,name:'別人',ruleset:RULESET,events:[]},after),/登録済み/);
 const b=begin(db,'b',start);submit(db,{runId:b.runId,name:'テスト 次郎',ruleset:RULESET,events:[]},after+1);assert.deepEqual(leaderboard(db).entries.map(e=>e.name),['テスト 太郎','テスト 次郎']);
 const c=begin(db,'c',start);submit(db,{runId:c.runId,name:'テスト 太郎',ruleset:RULESET,events:[],score:999999999},after+2);assert.equal(leaderboard(db).entries.length,2);assert.equal(leaderboard(db).entries[0].score,0);
 assert.throws(()=>submit(db,{runId:'missing',name:'A'},after),/見つかりません/);
 assert.throws(()=>submit(db,{runId:c.runId,name:'<script>'},after),/1〜16文字/);
 assert.throws(()=>replay([{t:3,n:'act'},{t:1,n:'move',v:1}]),/正しくありません/);
 assert.throws(()=>replay([{t:0,n:'teleport'}]),/正しくありません/);
 db.close();db=new DatabaseSync(file);init(db);assert.equal(leaderboard(db).players,2);
 console.log('PASS persistence, cross-client shared data, per-name best, stable ties, idempotency, ticket validation, early submission rejection, server-computed scores_v031, name validation, replay validation.');
}finally{db.close();rmSync(dir,{recursive:true,force:true});}

