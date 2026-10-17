import {mkdir,copyFile,cp,rm,readFile,access} from 'node:fs/promises';
const root=new URL('../',import.meta.url),target=new URL('public/',root);
// Fixed paths derived only from this file, never from user input.
// Keep new root-level CSS in the deployed static bundle.
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
for(const file of [
 'index.html','style.css','mobile-ranking.css','mobile-result.css',
 'pc-cockpit.css','mobile-icon-rails.css','mobile-kit-portrait.css','game.js'
])await copyFile(new URL(file,root),new URL(file,target));
for(const dir of ['js','vendor'])await cp(new URL(dir,root),new URL(dir,target),{recursive:true});
// Fail the build when HTML references a CSS file that is not shipped to Workers.
// This catches a regression where UI PRs pass CI but render without their styles.
const html=await readFile(new URL('index.html',target),'utf8');
for(const match of html.matchAll(/<link\b[^>]*href="([^"]+)"/g)){
 const asset=match[1].split('?')[0];
 if(!asset.endsWith('.css'))continue;
 if(asset.startsWith('/')||asset.includes('..')||!/^[-a-zA-Z0-9_./]+$/.test(asset))
   throw new Error('Unexpected stylesheet path: '+asset);
 await access(new URL(asset,target));
}
console.log('Public assets built and stylesheet links verified.');
