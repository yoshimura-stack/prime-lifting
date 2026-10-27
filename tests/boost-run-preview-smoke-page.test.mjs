import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('isolated preview bundles manual run smoke page without exposing secrets',()=>{
 const html=file('boost-run-preview.html'),js=file('js/boost-run-preview-client.mjs'),build=file('scripts/build-boost-preview.mjs');
 assert.match(html,/id="token" type="password"/);
 assert.match(html,/ステージング専用テストアカウント/);
 assert.match(js,/createBoostStagingHttpClient/);
 assert.match(js,/client\.finish\(\{events:\[\],worldWidth:1000,device:'pc',claimedScore:0\}\)/);
 assert.match(js,/inventory=null; \/\/ Reload authoritative inventory/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|service_role/);
 assert.match(build,/boost-run-preview\.html/);
 assert.match(build,/boost-run-preview-client\.mjs/);
});
test('isolated preview API stays disabled unless both server kill switches are explicitly true',()=>{
 const worker=file('server/boost-preview-worker.mjs'),config=file('wrangler.boost-preview.jsonc');
 assert.match(worker,/env\.BOOST_PREVIEW_ENABLED!=='true'/);
 assert.match(worker,/env\.BOOST_STAGING_RUNS_ENABLED!=='true'/);
 assert.match(config,/"BOOST_PREVIEW_ENABLED": "true"/);
 assert.match(config,/"BOOST_WELCOME_GRANT_ENABLED": "true"/);
 assert.match(config,/"BOOST_PREVIEW_PROJECT_ID": "tarnzjkxexlozqqmyqof"/);
 assert.match(config,/"BOOST_STAGING_RUNS_ENABLED": "true"/);
 assert.match(worker,/env\.BOOST_RUN_SIGNING_SECRET\.length<32/);
 assert.match(worker,/env\.BOOST_PREVIEW_PROJECT_ID!==STAGING_PROJECT/);
});
