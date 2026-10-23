import test from 'node:test';
import assert from 'node:assert/strict';
import {planAtomicBestRunUpdate as plan} from '../server/boost-atomic-best-plan.mjs';
const a='123e4567-e89b-42d3-a456-426614174010';
const b='123e4567-e89b-42d3-a456-426614174011';
test('new verified BOOST best sets score and provenance together',()=>{
 assert.deepEqual(plan({currentBest:50000,runId:a,verifiedScore:55000,boost:'score'}),{nextBest:55000,nextBestRunId:a,changed:true});
});
test('equal score from a different run cannot steal BOOST attribution',()=>{
 assert.deepEqual(plan({currentBest:55000,currentBestRunId:a,runId:b,verifiedScore:55000,boost:'score'}),{nextBest:55000,nextBestRunId:a,changed:false});
});
test('higher normal run clears stale BOOST provenance',()=>{
 assert.deepEqual(plan({currentBest:55000,currentBestRunId:a,runId:b,verifiedScore:60000}),{nextBest:60000,nextBestRunId:null,changed:true});
});
test('replayed verified run cannot mutate the committed best pointer',()=>{
 assert.deepEqual(plan({currentBest:60000,currentBestRunId:b,runId:a,verifiedScore:65000,boost:'score',replayed:true}),{nextBest:60000,nextBestRunId:b,changed:false});
});
test('lower score and legacy best remain unchanged',()=>{
 assert.deepEqual(plan({currentBest:60000,runId:a,verifiedScore:55000,boost:'score'}),{nextBest:60000,nextBestRunId:null,changed:false});
});
test('rejects untrusted scores and run IDs',()=>{
 assert.throws(()=>plan({currentBest:1,runId:'bad',verifiedScore:2}),TypeError);
 assert.throws(()=>plan({currentBest:1,runId:a,verifiedScore:-1}),TypeError);
});
