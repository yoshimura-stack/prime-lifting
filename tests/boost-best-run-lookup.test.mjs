import test from 'node:test';
import assert from 'node:assert/strict';
import {decodePrivateBestRunLookup} from '../server/boost-best-run-lookup.mjs';
const a='123e4567-e89b-42d3-a456-426614174001';
const b='123e4567-e89b-42d3-a456-426614174002';
const runId='123e4567-e89b-42d3-a456-426614174010';
const players=[{id:a,best:55000,name:'A'},{id:b,best:33000,name:'B'}];
test('private best-run lookup verifies player and saved best score before accepting run ID',()=>{
 assert.deepEqual(decodePrivateBestRunLookup({[a]:{bestRunId:runId,bestScore:55000}},players),[{...players[0],bestRunId:runId},{...players[1],bestRunId:null}]);
});
test('stale or forged best score never attaches a run ID',()=>{
 const output=decodePrivateBestRunLookup({[a]:{bestRunId:runId,bestScore:54000},[b]:{bestRunId:'bad',bestScore:33000}},players);
 assert.deepEqual(output,players.map(p=>({...p,bestRunId:null})));
});
test('missing or malformed lookup response falls back without changing saved best',()=>{
 for(const response of [null,[],42])assert.deepEqual(decodePrivateBestRunLookup(response,players),players.map(p=>({...p,bestRunId:null})));
});
test('duplicate player IDs are rejected before private attribution',()=>{
 assert.throws(()=>decodePrivateBestRunLookup({},[players[0],players[0]]),TypeError);
});
