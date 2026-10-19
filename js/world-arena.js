/* WORLD ARENA — real stepped stands around the unchanged training camera.
   Static scenery only: no game state, unlock, input or network dependencies. */
(function(root){
'use strict';
root.PRIME_WORLD_ARENA=function(host){
 const T=host.T,g=host.ground,group=new T.Group();group.name='world-arena';host.scene.add(group);
 const material=(color)=>new T.MeshStandardMaterial({color,roughness:.9});
 const concrete=material('#273044'),riser=material('#171e30'),apron=material('#27333c');
 const pink=new T.MeshBasicMaterial({color:'#ff69be'}),ice=new T.MeshBasicMaterial({color:'#a2e9ff'});
 const dark=material('#101b2c'),metal=material('#506079');
 const box=(name,x,y,z,w,h,d,mat)=>{const m=new T.Mesh(host.boxGeo,mat);m.name=name;m.position.set(x,y,z);m.scale.set(w,h,d);group.add(m);return m;};
 const floor=(name,x,z,w,d,mat,y=g)=>{const m=new T.Mesh(new T.PlaneGeometry(w,d),mat);m.name=name;m.rotation.x=-Math.PI/2;m.position.set(x,y,z);group.add(m);return m;};

 // Turf is exclusively horizontal. Its rear edge meets the service apron,
 // rather than extending upward behind the people or through the stands.
 let seed=20261015;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const grass=host.texture(512,512,(ctx,w,h)=>{
  ctx.fillStyle='#4d793a';ctx.fillRect(0,0,w,h);
  for(let i=0;i<24000;i++){const x=rand()*w,y=rand()*h;ctx.strokeStyle=rand()>.5?'rgba(174,199,105,.19)':'rgba(12,45,27,.25)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*2-1,y-2-rand()*3);ctx.stroke();}
 });
 grass.wrapS=grass.wrapT=T.RepeatWrapping;grass.repeat.set(5,5);
 floor('pitch',0,350,2800,2000,new T.MeshStandardMaterial({map:grass,bumpMap:grass,bumpScale:.65,roughness:1}));
 floor('service-apron',0,-1200,3600,1100,apron,g-.1);
 const mowing=new T.MeshStandardMaterial({color:'#c2d4a1',transparent:true,opacity:.12,depthWrite:false});
 for(let i=0;i<8;i++)floor('mowing-band',0,-585+i*260,2800,130,mowing,g+.12);
 const chalk=material('#dde5dc');floor('back-touchline',0,-405,2500,3,chalk,g+.35);
 floor('side-touchline',-448,80,3,1850,chalk,g+.35);
 const ring=new T.Mesh(new T.RingGeometry(221,224,120),chalk);ring.name='center-circle';ring.rotation.x=-Math.PI/2;ring.position.set(0,g+.4,-10);group.add(ring);

 // Curved strips use real x/y/z geometry. Each tread is horizontal and each
 // riser vertical; increasing radius and elevation form the stadium bowl.
 const arc=1.3,segments=64,centerZ=250;
 const point=(rx,rz,y,a)=>[Math.sin(a)*rx,g+y,centerZ-Math.cos(a)*rz];
 function strips(name,bands,mat){
  const vertices=[];
  for(const [inner,outer] of bands)for(let i=0;i<segments;i++){
   const a=-arc+2*arc*i/segments,b=-arc+2*arc*(i+1)/segments;
   const p=point(...inner,a),q=point(...inner,b),r=point(...outer,a),s=point(...outer,b);
   vertices.push(...p,...q,...r,...q,...s,...r);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const m=new T.Mesh(geo,mat);m.name=name;group.add(m);return m;
 }
 // Back faces are visible on the curved returns and roof soffit.
 for(const mat of [concrete,riser,metal,pink,ice])mat.side=T.DoubleSide;
 const seats=[],treads=[],risers=[];
 const rows=8,columns=320;
 for(let tier=0;tier<3;tier++){
  const rx=900+tier*220,rz=1100+tier*220,y=18+tier*72;
  for(let row=0;row<rows;row++){
   const r1=rx+row*22,r2=rz+row*22,h=y+row*6;
   treads.push([[r1,r2,h],[r1+22,r2+22,h]]);
   risers.push([[r1,r2,h-7],[r1,r2,h]]);
   for(let col=0;col<columns;col++){
    // Leave eight radial gangways open so the crowd has readable sections.
    if(col%40<3)continue;
    const angle=-arc+(col+.25+(row%2)*.5+(rand()-.5)*.65)*2*arc/columns;
    seats.push({position:point(r1+12,r2+12,h,angle),angle,shade:Math.floor(rand()*11),height:.75+rand()*.55});
   }
  }
  strips('concourse-'+tier,[[[rx-35,rz-35,y-7],[rx,rz,y-7]]],concrete);
  strips('tier-fascia-'+tier,[[[rx-35,rz-35,y-7],[rx-35,rz-35,y-20]]],riser);
  strips('tier-led-'+tier,[[[rx-36,rz-36,y-9],[rx-36,rz-36,y-13]]],pink);
 }
 strips('stadium-treads',treads,concrete);strips('stadium-risers',risers,riser);

 // Thousands of spectators are two static instanced draws, with no individual
 // animation, shadow maps, textures or per-frame allocations.
 const crowdBody=new T.InstancedMesh(new T.LatheGeometry([[0,2.4],[2,2.6],[5.4,2.9],[7,1.4]].map(([y,r])=>new T.Vector2(r,y-3.5)),8),new T.MeshBasicMaterial({color:0xffffff}),seats.length);
 const crowdHead=new T.InstancedMesh(new T.SphereGeometry(2.15,6,4),new T.MeshBasicMaterial({color:0xffffff}),seats.length);
 crowdBody.name='crowd-bodies';crowdHead.name='crowd-heads';
 const dummy=new T.Object3D(),color=new T.Color(),shirts=['#6fcbe9','#ec65b6','#edf4ff','#364b70','#94d9ef','#e7a9d1','#667fa1','#e4efff','#5279aa','#d64d9b','#afcddd'];
 seats.forEach((seat,i)=>{
  const [x,y,z]=seat.position;dummy.position.set(x,y+6*seat.height,z);dummy.rotation.set(0,-seat.angle,0);dummy.scale.set(1,seat.height,1);dummy.updateMatrix();crowdBody.setMatrixAt(i,dummy.matrix);crowdBody.setColorAt(i,color.set(shirts[seat.shade]));
  dummy.position.y=y+11*seat.height;dummy.scale.set(1,1,1);dummy.updateMatrix();crowdHead.setMatrixAt(i,dummy.matrix);crowdHead.setColorAt(i,color.set(['#b99d8d','#806e65','#c4afa2'][i%3]));
 });
 for(const m of [crowdBody,crowdHead]){m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;group.add(m);}
 group.userData.crowdCount=seats.length;

 // Roof canopy, radial steel ribs and visible lamps establish a large enclosed
 // arena. Only the main white floodlight casts a real-time shadow.
 // Deep ring truss: two chords, diagonal webs and radial roof rafters.
 strips('roof-canopy',[[[1450,1630,272],[1830,2010,330]]],dark).material.side=T.DoubleSide;
 strips('roof-edge',[[[1450,1630,269],[1450,1630,280]]],metal);
 const beamGeo=new T.CylinderGeometry(1,1,1,6);
 const beams=[];
 const beam=(p,q,width=1.6)=>{const m=new T.Mesh(beamGeo,metal);host.connect(m,p,q,width);m.updateMatrix();beams.push(m.matrix.clone());};
 for(let i=0;i<32;i++){
  const a=-arc+2*arc*i/32,b=-arc+2*arc*(i+1)/32;
  const lo=point(1440,1620,270,a),hi=point(1440,1620,298,a),next=point(1440,1620,270,b),top=point(1440,1620,298,b);
  beam(lo,next,2.4);beam(hi,top,2.4);beam(lo,hi);beam(lo,top);beam(hi,next);
  if(i%2===0){beam(hi,point(1830,2010,330,a),3);beam(lo,point(1710,1890,310,a),2);}
 }
 const truss=new T.InstancedMesh(beamGeo,metal,beams.length);truss.name='roof-truss';beams.forEach((m,i)=>truss.setMatrixAt(i,m));group.add(truss);
 // Lit access stairs and concourse doors divide the crowd into believable bays.
 for(let tier=0;tier<3;tier++)for(let bay=1;bay<8;bay++){
  const a=-arc+2*arc*bay/8,rx=900+tier*220,rz=1100+tier*220,y=18+tier*72;
  for(let row=0;row<8;row++){
   const pos=point(rx+row*22+8,rz+row*22+8,y+row*6+.8,a);
   const step=box('aisle-light',...pos,12,1,3,ice);step.rotation.y=-a;
  }
  const pos=point(rx-18,rz-18,y+9,a);const door=box('concourse-door',...pos,17,25,5,dark);door.rotation.y=-a;
 }
 const glowTexture=host.texture(64,64,(ctx)=>{const gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,.7)');gradient.addColorStop(.2,'rgba(255,255,255,.2)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);});
 const lamps=new T.InstancedMesh(host.boxGeo,new T.MeshBasicMaterial({color:'#eaf7ff',depthTest:false}),24);
 lamps.name='match-floodlights';lamps.renderOrder=50;let lampIndex=0;
 for(const x of [-380,-125,125,380]){
  box('floodlight-support',x,g+331,-900,2,32,3,metal);
  box('floodlight-housing',x,g+315,-898,49,12,7,dark);
  for(let n=0;n<6;n++){dummy.position.set(x-19+n*7.6,g+315,-893);dummy.rotation.set(0,0,0);dummy.scale.set(5.5,7,2);dummy.updateMatrix();lamps.setMatrixAt(lampIndex++,dummy.matrix);}
  const glow=new T.Mesh(new T.PlaneGeometry(155,105),new T.MeshBasicMaterial({map:glowTexture,color:'#c7e8ff',transparent:true,opacity:1,depthTest:false,depthWrite:false,blending:T.AdditiveBlending}));glow.renderOrder=51;glow.position.set(x,g+315,-890);group.add(glow);
 }
 lamps.instanceMatrix.needsUpdate=true;group.add(lamps);
 const shaftTex=host.texture(64,128,(ctx,w,h)=>{const fade=ctx.createLinearGradient(0,0,0,h);fade.addColorStop(0,'rgba(190,223,255,.16)');fade.addColorStop(1,'rgba(190,223,255,0)');ctx.fillStyle=fade;ctx.beginPath();ctx.moveTo(w*.45,0);ctx.lineTo(w*.55,0);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();});
 const shaftMat=new T.MeshBasicMaterial({map:shaftTex,transparent:true,opacity:.28,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
 for(const x of [-380,380]){const shaft=new T.Mesh(new T.PlaneGeometry(210,265),shaftMat);shaft.position.set(x,g+180,-660);shaft.rotation.z=x<0?-.18:.18;group.add(shaft);}


 // A low boundary sits behind the technical area. Feet are never placed on
 // top of it; the crew stand on exactly the same ground plane as the player.
 box('advertising-wall',0,g+14,-750,1700,28,8,dark);
 for(const side of [-1,1])box('advertising-led',side*500,g+29,-744,580,2,2,side<0?pink:ice);
 const title=host.texture(1024,96,(ctx,w,h)=>{ctx.fillStyle='#101b2c';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.font='bold 36px Arial';ctx.fillStyle='#c5edff';ctx.fillText('WORLD ARENA  /  PRIME',w/2,62);});
 const sign=new T.Mesh(new T.PlaneGeometry(330,28),new T.MeshBasicMaterial({map:title}));sign.name='arena-sign';sign.position.set(0,g+15,-744);group.add(sign);
 for(const side of [-1,1]){
  box('dugout-seat',side*300,g+29,-627,260,5,25,dark);
  box('dugout-back',side*300,g+43,-640,260,25,5,dark);
  for(const dx of [-100,100])box('dugout-leg',side*300+dx,g+13,-627,4,26,18,metal);
 }

 // Reuse TRAINING LAB's actual human model, then batch its static parts by
 // geometry. This keeps the faces, shoes and proportions without ~200 draws.
 const batches=new Map(),crew=[];
 for(let i=0;i<10;i++){
  const human=host.makeSpectator(i),role=i===4?'manager':i===5||i===9?'staff':'substitute';
  human.children[0].material.color.set(role==='manager'?'#293447':role==='staff'?'#81b8c9':'#b25586');
  human.position.set([-430,-355,-280,-205,-130,130,205,280,355,430][i],g,-535-(i%3)*22);
  human.scale.setScalar(.70+(i%3)*.025);human.rotation.y=(i%3-1)*.12;human.updateMatrixWorld(true);
  crew.push({role,x:human.position.x,y:g,z:human.position.z,scale:human.scale.x});
  human.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const key=mesh.geometry.type+JSON.stringify(mesh.geometry.parameters);
   if(!batches.has(key))batches.set(key,{geometry:mesh.geometry,parts:[]});
   batches.get(key).parts.push({matrix:mesh.matrixWorld.clone(),color:mesh.material.color.clone()});
  });
  // makeSpectator owns its materials, but shares host sphere/cylinder geometry.
  const owned=new Set();human.traverse(m=>{if(m.isMesh)owned.add(m.material);});for(const mat of owned)mat.dispose();
 }
 for(const {geometry,parts} of batches.values()){
  const mesh=new T.InstancedMesh(geometry,new T.MeshStandardMaterial({color:0xffffff,roughness:.85}),parts.length);
  mesh.name='technical-area-people';parts.forEach((part,i)=>{mesh.setMatrixAt(i,part.matrix);mesh.setColorAt(i,part.color);});
  mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;group.add(mesh);
 }

 group.userData.staffCount=crew.length;group.userData.crew=crew;

 // Merge repeated static architectural boxes into material batches.
 const trimBatches=new Map();
 for(const m of [...group.children])if(m.isMesh&&!m.isInstancedMesh&&m.geometry===host.boxGeo){
  m.updateMatrix();if(!trimBatches.has(m.material))trimBatches.set(m.material,[]);
  trimBatches.get(m.material).push(m.matrix.clone());group.remove(m);
 }
 for(const [mat,matrices] of trimBatches){const batch=new T.InstancedMesh(host.boxGeo,mat,matrices.length);batch.name='architecture-trim';matrices.forEach((m,i)=>batch.setMatrixAt(i,m));group.add(batch);}
 const ambient=new T.HemisphereLight(0xb8d7f5,0x17251e,.95);group.add(ambient);
 const key=new T.DirectionalLight(0xeaf4ff,3.1);key.name='arena-shadow-light';key.position.set(-350,800,420);key.target.position.set(0,g,-180);
 group.add(key,key.target);
 const pinkFill=new T.DirectionalLight(0xff77bc,.45);pinkFill.position.set(-650,350,-400);group.add(pinkFill);
 const blueFill=new T.DirectionalLight(0x8adfff,.65);blueFill.position.set(650,400,200);group.add(blueFill);
 const sky=new T.Color('#080f20'),fog=new T.Fog('#141e33',2600,5500);
 return {group,show(visible){
  group.visible=visible;host.trainingGroup.visible=!visible;
  host.scene.background=visible?sky:host.trainingBackground;host.scene.fog=visible?fog:host.trainingFog;
  if(host.trainingLights)for(const light of host.trainingLights)light.visible=!visible;
 }};
};
})(globalThis);
