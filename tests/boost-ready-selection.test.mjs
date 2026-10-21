import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadyBoostSelection} from '../js/boost-ready-selection.mjs';
test('selection is visual only; NONE and stocked BOOST work',()=>{
 const ready=createReadyBoostSelection({time:2,score:1,sc:0});
 assert.equal(ready.selected,null);
 assert.equal(ready.select('score'),'score');
 assert.equal(ready.stock.score,1);
 assert.throws(()=>ready.select('sc'),RangeError);
 assert.equal(ready.select(null),null);
});
test('START requires trusted confirmation and never treats failed response as success',async()=>{
 const ready=createReadyBoostSelection({time:2,score:1,sc:0});
 ready.select('score');
 await assert.rejects(ready.start(async()=>({runId:'id',boost:'score'})),/not confirmed/);
 assert.equal(ready.pending,false);
 const result=await ready.start(async boost=>({runId:'server-id',token:'server-token',boost}));
 assert.equal(result.boost,'score');
});
test('concurrent START and selection changes are rejected',async()=>{
 const ready=createReadyBoostSelection({time:2,score:1,sc:0});
 let resolve;
 const started=ready.start(()=>new Promise(r=>{resolve=r;}));
 assert.throws(()=>ready.select('score'),/pending/);
 await assert.rejects(ready.start(async()=>({})),/pending/);
 resolve({runId:'server-id',token:'server-token',boost:null});
 await started;
});
