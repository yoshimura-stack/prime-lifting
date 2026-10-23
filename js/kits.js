// Current free starter kit only. Legacy paid-style palettes are intentionally retired.
// Keep the historical id for saved runs and leaderboard compatibility until coin inventory migration.
(function(root){
'use strict';
const starter=Object.freeze({id:'japan-01',group:'DEFAULT',name:'WHITE',primary:'#ffffff',secondary:'#ffffff',accent:'#ffffff',pattern:'solid'});
root.PRIME_KITS={groups:['DEFAULT'],kits:[starter],defaultId:starter.id,get(){return starter;}};
})(globalThis);
