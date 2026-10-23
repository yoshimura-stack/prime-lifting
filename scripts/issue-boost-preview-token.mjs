#!/usr/bin/env node
// Offline-only staging tester token issuer. NEVER run in CI or browser.
import {issuePreviewToken} from '../server/boost-preview-auth.mjs';
const playerId=process.argv[2];
const secret=process.env.BOOST_PREVIEW_SESSION_SECRET;
if(process.argv.length!==3||typeof playerId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId)){
 console.error('Usage: BOOST_PREVIEW_SESSION_SECRET=<private staging secret> node scripts/issue-boost-preview-token.mjs <staging-player-uuid>');
 process.exitCode=2;
}else if(typeof secret!=='string'||secret.length<32){
 console.error('Dedicated BOOST_PREVIEW_SESSION_SECRET (>=32 chars) must be supplied via environment, never command arguments');
 process.exitCode=2;
}else{
 // Token is intentionally printed only on explicit local operator invocation.
 // Treat stdout as a credential; do not upload, paste in chat, or save in CI logs.
 console.log(await issuePreviewToken({playerId,secret,ttlSeconds:900}));
}
