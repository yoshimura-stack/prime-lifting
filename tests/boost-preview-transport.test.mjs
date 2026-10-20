import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoostPreviewTransport} from '../server/boost-preview-transport.mjs';
const player='123e4567-e89b-42d3-a456-426614174001';
test('preview transport maps only allowlisted RPC names',async()=>{
 const calls=[];
 const transport=createBoostPreviewTransport({
  url:'https://staging.supabase.co/',expectedProjectHost:'staging.supabase.co',
  serviceKey:'staging-test-key',
  fetcher:async(url,options)=>{
   calls.push({url:String(url),options});
   return {ok:true,json:async()=>({replayed:false})};
  }
 });
 await transport.call('boost_slot_spin',{playerId:player});
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://staging.supabase.co/rest/v1/rpc/lifting_api_boost_slot_spin');
 assert.equal(JSON.parse(calls[0].options.body).payload.playerId,player);
 assert.equal(calls[0].options.headers.apikey,'staging-test-key');
 await assert.rejects(transport.call('delete_all',{}),TypeError);
 assert.equal(calls.length,1);
});
test('preview transport rejects malformed config and database failures',async()=>{
 assert.throws(()=>createBoostPreviewTransport({url:'http://staging.supabase.co/',expectedProjectHost:'staging.supabase.co',serviceKey:'x'}),TypeError);
 assert.throws(()=>createBoostPreviewTransport({url:'https://production.supabase.co/',expectedProjectHost:'staging.supabase.co',serviceKey:'x'}),TypeError);
 const transport=createBoostPreviewTransport({url:'https://staging.supabase.co/',expectedProjectHost:'staging.supabase.co',serviceKey:'x',fetcher:async()=>({ok:false})});
 await assert.rejects(transport.call('boost_reserve',{}),/Preview RPC rejected request/);
});
