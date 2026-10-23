import {mkdir,copyFile,cp,rm,readFile,writeFile,access} from 'node:fs/promises';
const root=new URL('../',import.meta.url),target=new URL('../boost-preview-public/',import.meta.url);
await rm(target,{recursive:true,force:true});
await mkdir(new URL('js/',target),{recursive:true});
for(const file of ['boost-slot-preview.html','boost-slot-preview.css','boost-run-preview.html'])await copyFile(new URL(file,root),new URL(file,target));
await copyFile(new URL('js/boost-slot-preview.mjs',root),new URL('js/boost-slot-preview.mjs',target));
await copyFile(new URL('js/boost-slot-client.mjs',root),new URL('js/boost-slot-client.mjs',target));
for(const name of ['boost-staging-http-client.mjs','boost-run-preview-client.mjs'])await copyFile(new URL('js/'+name,root),new URL('js/'+name,target));

// Isolated playable staging game: copy source assets, never reuse the production Worker.
for(const file of ['style.css','mobile-ranking.css','mobile-result.css','pc-cockpit.css','mobile-icon-rails.css','mobile-king-marquee.css','update-news.css','ranking-daily-breakdown.css','ready-room.css','boost-preview.css','game.js'])
 await copyFile(new URL(file,root),new URL(file,target));
await cp(new URL('js/',root),new URL('js/',target),{recursive:true,force:true});
await cp(new URL('vendor/',root),new URL('vendor/',target),{recursive:true,force:true});
const original=await readFile(new URL('index.html',root),'utf8');
const gameStart=original.indexOf('<script src="game.js?v=');
const gameEnd=original.indexOf('</script>',gameStart);
if(gameStart<0||gameEnd<0)throw new Error('Cannot locate game script in staging HTML');
const isolated=original.slice(0,gameStart)+'<script type="module" src="js/boost-playable-staging-bootstrap.mjs"></script>'+original.slice(gameEnd+'</script>'.length);
if(isolated.includes('<script src="game.js?'))throw new Error('Unsafe double game boot');
await writeFile(new URL('boost-game-preview.html',target),isolated);

const html=await readFile(new URL('boost-slot-preview.html',target),'utf8');
const client=await readFile(new URL('js/boost-slot-client.mjs',target),'utf8');
if(!/id="preview-token"[^>]*disabled/.test(html)||!/id="preview-connect"[^>]*disabled/.test(html)||!client.includes('SLOT_BROWSER_ENABLED=false'))throw new Error('Preview UI must remain locked');
for(const file of ['boost-slot-preview.css','js/boost-slot-preview.mjs','js/boost-slot-client.mjs','boost-run-preview.html','js/boost-staging-http-client.mjs','js/boost-run-preview-client.mjs','boost-game-preview.html','js/boost-playable-staging-bootstrap.mjs'])await access(new URL(file,target));
console.log('Isolated locked slot preview assets built.');
