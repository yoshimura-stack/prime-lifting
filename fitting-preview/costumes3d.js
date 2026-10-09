/* Visual-only costume overlay for the isolated fitting room. No gameplay logic. */
(function(root){'use strict';
function createCostumes(T,model){
 const player=model.player, group=player.group, costume=new T.Group();group.add(costume);
 const M=(c,metal=0,glow=0)=>new T.MeshStandardMaterial({color:c,metalness:metal,roughness:metal?.3:.75,emissive:c,emissiveIntensity:glow});
 const mesh=(geo,mat,x,y,z,par=costume)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;par.add(o);return o;};
 const box=(w,h,d,c,x,y,z,par=costume,metal=0,glow=0)=>mesh(new T.BoxGeometry(w,h,d),M(c,metal,glow),x,y,z,par);
 const ball=(r,c,x,y,z,par=costume,metal=0,glow=0)=>mesh(new T.SphereGeometry(r,18,12),M(c,metal,glow),x,y,z,par);
 const cone=(rt,rb,h,c,x,y,z,par=costume)=>mesh(new T.CylinderGeometry(rt,rb,h,12),M(c),x,y,z,par);
 const ring=(r,t,c,x,y,z,par=costume,glow=0)=>{const o=mesh(new T.TorusGeometry(r,t,8,36),M(c,.4,glow),x,y,z,par);return o;};
 function dress(k){while(costume.children.length){const o=costume.children[0];costume.remove(o);o.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)n.material.dispose();});}
 const pts=k.pts;const is=key=>k.name.includes(key);const dark='#151821',gold='#e8bb4c';
 // Static torso/head accessories only. Legs use animated meshes in renderer3d.js; fixed world-space thigh/shin boxes caused clipping on kicks.
 if(pts<40000)return;
 if(is('SUIT')||is('TUXEDO')||is('BUSINESS')||is('PHANTOM')){
  const col=is('TUXEDO')?'#17131a':is('PHANTOM')?'#3a254b':'#15171c';
  box(42,56,27,col,0,101,0);box(14,51,28,'#f3f3e9',0,101,14);
  for(const s of [-1,1]){const lap=box(12,37,3,col,s*11,108,17);lap.rotation.z=s*.25;}
  const tie=box(5,27,2,is('TUXEDO')?gold:'#c82835',0,107,23);tie.rotation.z=.04;
  if(is('PHANTOM')){ring(26,2,'#b99bff',0,144,0,costume,.7);}
 } else if(is('LEOPARD')||is('TIGER')||is('ZEBRA')){
  const c=is('LEOPARD')?'#c89442':is('TIGER')?'#f18a28':'#eae9dc';box(51,56,35,c,0,103,0);for(const s of [-1,1]){ball(13,c,s*23,119,0);}
  for(let i=0;i<85;i++){const a=i*2.399, y=78+(i%13)*4, x=Math.sin(a)*24,z=Math.cos(a)*18;if(Math.abs(x)<23){ball(1.5+(i%3),is('ZEBRA')?'#121212':'#302014',x,y,z);}}
  ring(14,2,gold,0,125,0);for(const s of [-1,1])ball(5,'#161616',s*5,145,13);
 } else if(is('HOODIE')||is('DENIM')||is('DISCO')){
  const c=is('DENIM')?'#27649a':is('DISCO')?'#e832b9':'#455f66';box(45,52,31,c,0,101,0);box(18,12,10,'#eeeeee',0,101,19);if(is('HOODIE')){const hood=ring(16,7,c,0,140,-4);hood.rotation.x=.4;}if(is('DISCO'))for(let i=0;i<16;i++)ball(3,i%2?'#fbe14c':'#38eaf7',Math.sin(i*2.4)*23,85+(i%8)*7,Math.cos(i*2.4)*16);
 } else if(is('GALAXY')||is('SPACE')||is('CYBER')||is('PLASMA')||is('NEON')){
  const c=is('GALAXY')?'#30225d':'#0a2a3a', neon=is('PLASMA')?'#f052ff':'#35f5ed';box(51,54,36,c,0,102,0,.0||costume,.4);for(const s of [-1,1]){ball(13,c,s*24,117,0);box(3,38,3,neon,s*24,99,17,costume,.2,.9);}ring(20,3,neon,0,145,0,costume,.7);ring(29,2,neon,0,105,0,costume,.8).rotation.x=Math.PI/2;
  if(is('GALAXY')){for(let i=0;i<30;i++)ball(1.5,i%2?'#ff8eff':'#a9f9ff',Math.sin(i*2.4)*26,79+(i%12)*5,Math.cos(i*2.4)*19,costume,.2,.6);}
 } else if(is('SAMURAI')||is('ARMOR')||is('DRAGON')||is('EMPEROR')||is('ROYAL')||is('DIAMOND')){
  const c=is('DRAGON')?'#165e49':is('DIAMOND')?'#b9d4e9':is('ARMOR')?'#5d2520':'#bb8727';box(48,50,35,c,0,104,0,costume,.65);for(const s of [-1,1]){const shoulder=box(27,12,35,gold,s*29,122,0,costume,.75);shoulder.rotation.z=s*.23;cone(2,11,17,gold,s*30,128,0);}box(42,8,35,gold,0,83,0,costume,.7);cone(5,16,16,c,0,169,0);for(const s of [-1,1])cone(0,5,23,gold,s*12,181,0);if(is('ROYAL')||is('EMPEROR')){const cape=box(58,85,3,is('ROYAL')?'#7226aa':'#b72b34',0,79,-22);cape.rotation.x=-.13;}
 } else if(is('ICE')||is('LAVA')){
  const c=is('ICE')?'#8fe9ff':'#fc4d22';box(48,54,34,is('ICE')?'#4d8baf':'#54201c',0,102,0);for(let i=0;i<18;i++){const a=i*2.4;cone(0,3+(i%3)*2,12+(i%4)*5,c,Math.sin(a)*24,90+(i%7)*8,Math.cos(a)*19);}ring(25,3,c,0,143,0,costume,.6);
 } else if(is('LEGEND')){
  const colors=['#ffe15e','#5eeeff','#f46bff','#9cff6b'];box(56,59,40,'#e8e3f7',0,103,0,costume,.85);for(const s of [-1,1]){ball(17,colors[s===1?1:2],s*27,119,0,costume,.8,.7);}const crown=cone(12,15,15,'#fce178',0,169,0);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;cone(0,3,14,colors[i%4],Math.sin(a)*11,180,Math.cos(a)*11);}ring(38,4,'#ffe27a',0,146,-12,costume,.8);ring(48,2,'#6df7ff',0,104,-14,costume,.9);for(let i=0;i<10;i++)ball(3,colors[i%4],Math.sin(i*2.4)*43,80+(i%6)*17,Math.cos(i*2.4)*22,costume,.7,.9);
 } else {box(48,51,32,k.primary,0,104,0);ring(18,2,k.accent,0,145,0,costume,.5);}
 }
 return {dress,group:costume};
}
root.PrimeCostumes3D={createCostumes};
})(window);
