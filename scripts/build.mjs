import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
const root=new URL('../',import.meta.url),target=new URL('dist/',root);
// Fixed path derived only from this file, never from user input.
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
for(const file of ['index.html','style.css','mobile-ranking.css','game.js'])await copyFile(new URL(file,root),new URL(file,target));
for(const dir of ['js','vendor'])await cp(new URL(dir,root),new URL(dir,target),{recursive:true});
console.log('Public assets built.');
