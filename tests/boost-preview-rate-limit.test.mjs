import test from 'node:test';
import assert from 'node:assert/strict';
import {allowPreviewRequest} from '../server/boost-preview-rate-limit.mjs';
const request=new Request('https://preview.example/',{headers:{'CF-Connecting-IP':'192.0.2.10'}});
test('preview limiter accepts only explicit success',async()=>{
 assert.equal(await allowPreviewRequest(request,{limit:async({key})=>({success:key==='boost-preview:192.0.2.10'})}),true);
 assert.equal(await allowPreviewRequest(request,{limit:async()=>({success:false})}),false);
});
test('preview limiter fails closed when missing, broken or no IP',async()=>{
 assert.equal(await allowPreviewRequest(request,null),false);
 assert.equal(await allowPreviewRequest(request,{limit:async()=>{throw Error('outage');}}),false);
 assert.equal(await allowPreviewRequest(new Request('https://preview.example/'),{limit:async()=>({success:true})}),false);
});
