/* A real 3D cabinet over the independent 2D simulation. Rendering never writes state. */
(function(root){
'use strict';
class StadiumPinball3DRenderer {
 constructor(canvas,P){
  const T=THREE;this.T=T;this.P=P;this.low=matchMedia('(pointer:coarse)').matches;
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,this.low?1.5:2));this.renderer.setSize(600,960,false);
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.scene=new T.Scene();this.scene.background=new T.Color('#081414');
  // Small procedural studio map supplies real reflections without a downloaded HDR asset.
  const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;const ec=envCanvas.getContext('2d');ec.fillStyle='#233c3d';ec.fillRect(0,0,512,256);ec.fillStyle='#9ab7a9';ec.fillRect(0,0,512,32);ec.fillStyle='#e8f4e7';ec.fillRect(50,45,70,90);ec.fillRect(320,50,120,35);ec.fillStyle='#060e14';ec.fillRect(0,185,512,71);
  const sourceEnv=new T.CanvasTexture(envCanvas);sourceEnv.colorSpace=T.SRGBColorSpace;sourceEnv.mapping=T.EquirectangularReflectionMapping;const pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromEquirectangular(sourceEnv);this.scene.environment=this.environment.texture;sourceEnv.dispose();pmrem.dispose();

  this.camera=new T.OrthographicCamera(-325,325,520,-520,1,3000);this.camera.position.set(0,-850,1700);this.camera.lookAt(0,0,0);
  this.scene.add(new T.HemisphereLight('#d9f5ff','#29412e',1.35));
  const sun=new T.DirectionalLight('#fff4d4',2.2);sun.position.set(-220,300,650);sun.castShadow=true;sun.shadow.mapSize.set(this.low?512:1024,this.low?512:1024);Object.assign(sun.shadow.camera,{left:-400,right:400,top:600,bottom:-600,near:1,far:1800});sun.shadow.bias=-.0008;sun.shadow.normalBias=.7;this.scene.add(sun);
  const fill=new T.DirectionalLight('#73c9ff',1.2);fill.position.set(400,-150,220);this.scene.add(fill);
  this.materials={};this.geometry={};this.zAxis=new T.Vector3(0,0,1);this.yAxis=new T.Vector3(0,1,0);
  this.metal=this.mat('#a8b9bc',.7,.28);this.dark=this.mat('#10252c',.45,.35);this.gold=this.mat('#c7a453',.65,.3);this.rubber=this.mat('#87c8bd',.05,.45);this.white=this.mat('#e5efdc',.15,.32);
  // Procedural artwork is cached into a single texture. Raised physical fixtures are separate meshes.
  const off=document.createElement('canvas'),art=new StadiumPinballRenderer(off,P);const texture=new T.CanvasTexture(art.cache);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());
  this.box(0,0,-12,610,970,22,this.dark);const floor=new T.Mesh(new T.PlaneGeometry(600,960),new T.MeshStandardMaterial({map:texture,roughness:.82,metalness:.05}));floor.receiveShadow=true;this.scene.add(floor);
  for(const x of [-305,305])this.box(x,0,10,12,970,45,this.dark);this.box(0,482,10,610,14,45,this.dark);this.box(0,-482,10,610,14,45,this.dark);
  P.walls.forEach(w=>{this.tube(w[0]-300,480-w[1],12,w[2]-300,480-w[3],12,4,this.metal);this.tube(w[0]-300,480-w[1],4,w[2]-300,480-w[3],4,5,this.dark);});
  for(const pts of [[[104,615],[165,735],[104,709]],[[456,615],[395,735],[456,709]]]){
   const shape=new T.Shape();pts.forEach(([x,y],i)=>i?shape.lineTo(x-300,480-y):shape.moveTo(x-300,480-y));shape.closePath();const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:12,bevelEnabled:true,bevelSize:2,bevelThickness:2,bevelSegments:1,steps:1}),this.dark);mesh.castShadow=true;this.scene.add(mesh);
   for(let i=0;i<3;i++){const a=pts[i],b=pts[(i+1)%3];this.tube(a[0]-300,480-a[1],14,b[0]-300,480-b[1],14,3,i===0?this.gold:this.metal);}
  }
  this.ballMat=this.makeBallMaterial();this.bumpers=P.bumpers.map(b=>{
   const x=b.x-300,y=480-b.y;this.cylinder(x,y,6,b.r+5,12,this.dark);this.cylinder(x,y,14,b.r+2,10,this.metal);
   const ring=this.ring(x,y,17,b.r,2.5,new T.MeshStandardMaterial({color:'#84e4d8',emissive:'#42bcae',emissiveIntensity:.8,roughness:.3}));
   const ball=new T.Mesh(new T.SphereGeometry(b.r-5,24,16),this.ballMat);ball.scale.z=.66;ball.position.set(x,y,25);ball.castShadow=true;this.scene.add(ball);return {ring,ball};
  });
  this.targets=P.targets.map((t,i)=>{const x=t.x-300,y=480-t.y;this.cylinder(x,y,5,t.r+3,10,this.metal);const face=this.cylinder(x,y,11,t.r-1,4,new T.MeshStandardMaterial({color:'#2f503d',emissive:'#ffbd39',emissiveIntensity:0,roughness:.4}));this.label('PRM'[i],x,y,14,23,23,'#fff1bf');return face;});
  this.flippers=[];
  for(let i=0;i<2;i++){const group=new T.Group();const mesh=new T.Mesh(new T.BoxGeometry(100,22,10),this.white);mesh.position.set(50,0,12);mesh.castShadow=true;group.add(mesh);
   for(const x of [0,100]){const cap=new T.Mesh(new T.CylinderGeometry(11,11,10,24),this.white);cap.rotation.x=Math.PI/2;cap.position.set(x,0,12);cap.castShadow=true;group.add(cap);}
   const strip=new T.Mesh(new T.BoxGeometry(87,4,1),this.gold);strip.position.set(49,0,17.6);group.add(strip);const hub=new T.Mesh(new T.CylinderGeometry(6,6,2,16),this.metal);hub.rotation.x=Math.PI/2;hub.position.set(0,0,18);group.add(hub);this.scene.add(group);this.flippers.push(group);}
  // Raised goal and net, seated on the far end of the miniature pitch.
  this.goalMat=new T.MeshStandardMaterial({color:'#b8ddd2',emissive:'#d7a543',emissiveIntensity:0,roughness:.3,metalness:.3});this.tube(-94,294,2,-94,294,45,2.5,this.goalMat);this.tube(68,294,2,68,294,45,2.5,this.goalMat);this.tube(-94,294,45,68,294,45,2.5,this.goalMat);this.label('SKILL SHOT',-175,301,2,75,17,'#f4d98d');this.ring(-175,300,1,24,1,this.gold);this.goalSign=this.label('GOAL LOCKED',-12,266,3,128,21,'#a2bfae');this.goalTextures={locked:this.textTexture('GOAL LOCKED','#a2bfae'),open:this.textTexture('SHOOT TO SCORE!','#ffdd86'),power:this.textTexture('POWER PLAY x3','#ffdd86')};
  const vertices=[];for(let i=0;i<=16;i++){let x=-94+i*162/16;vertices.push(x,294,45,x,330,0);}for(let i=0;i<=6;i++){let t=i/6;vertices.push(-94,294+36*t,45*(1-t),68,294+36*t,45*(1-t));}
  const netgeo=new T.BufferGeometry();netgeo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));this.scene.add(new T.LineSegments(netgeo,new T.LineBasicMaterial({color:'#adc7c2',transparent:true,opacity:.65})));
  this.buildStadium();
  this.ball=new T.Mesh(new T.SphereGeometry(P.R,20,14),this.ballMat);this.ball.castShadow=true;this.scene.add(this.ball);
  this.popups=Array.from({length:24},()=>{const mesh=new T.Sprite(new T.SpriteMaterial({map:this.textTexture('+100','#fff0bb'),transparent:true,depthTest:false}));mesh.visible=false;mesh.scale.set(56,28,1);this.scene.add(mesh);return mesh;});this.pointTextures={};for(const points of [50,100,200,300,600,1000,2000,2500,3000,3500,4000,4500,5000])this.pointTextures[points]=this.textTexture('+'+points,'#ffe591');
 }
 mat(color,metalness=0,roughness=.6){return new this.T.MeshStandardMaterial({color,metalness,roughness});}
 box(x,y,z,w,h,d,m){const mesh=new this.T.Mesh(new this.T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;this.scene.add(mesh);return mesh;}
 tube(x,y,z,x2,y2,z2,r,m){const T=this.T,a=new T.Vector3(x,y,z),b=new T.Vector3(x2,y2,z2),delta=b.clone().sub(a),mesh=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),8),m);mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(this.yAxis,delta.normalize());mesh.castShadow=true;this.scene.add(mesh);return mesh;}
 cylinder(x,y,z,r,h,m){const mesh=new this.T.Mesh(new this.T.CylinderGeometry(r,r,h,24),m);mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;this.scene.add(mesh);return mesh;}
 ring(x,y,z,r,t,m){const mesh=new this.T.Mesh(new this.T.TorusGeometry(r,t,8,32),m);mesh.position.set(x,y,z);this.scene.add(mesh);return mesh;}
 textTexture(text,color){const c=document.createElement('canvas');c.width=text.length===1?64:256;c.height=64;const x=c.getContext('2d');x.font=text.length===1?'bold 48px Arial':'bold 36px Arial';x.textAlign='center';x.fillStyle=color;x.shadowColor='#001410';x.shadowBlur=4;x.fillText(text,c.width/2,48);const t=new this.T.CanvasTexture(c);t.colorSpace=this.T.SRGBColorSpace;return t;}
 label(text,x,y,z,w,h,color){const mesh=new this.T.Mesh(new this.T.PlaneGeometry(w,h),new this.T.MeshBasicMaterial({map:this.textTexture(text,color),transparent:true,depthWrite:false}));mesh.position.set(x,y,z);this.scene.add(mesh);return mesh;}
 makeBallMaterial(){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='#eef3e7';x.fillRect(0,0,512,256);for(let row=-1;row<4;row++)for(let col=-1;col<7;col++){const cx=col*86+(row%2)*43,cy=row*85+35;x.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;x.lineTo(cx+Math.cos(a)*24,cy+Math.sin(a)*24);}x.closePath();x.fillStyle='#162d35';x.fill();x.strokeStyle='#77918e';x.lineWidth=1;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;x.beginPath();x.moveTo(cx+Math.cos(a)*24,cy+Math.sin(a)*24);x.lineTo(cx+Math.cos(a)*44,cy+Math.sin(a)*44);x.stroke();}}const texture=new this.T.CanvasTexture(c);texture.colorSpace=this.T.SRGBColorSpace;return new this.T.MeshStandardMaterial({map:texture,roughness:.32,metalness:.08});}
 buildStadium(){const T=this.T;
  // Instanced crowd bodies/heads reduce a full stand to two draw calls.
  const count=240,bodies=new T.InstancedMesh(new T.BoxGeometry(3.5,3,5),this.mat('#ffffff'),count),heads=new T.InstancedMesh(new T.SphereGeometry(1.5,6,4),this.mat('#d4ad8b'),count),dummy=new T.Object3D(),colors=['#b7dbda','#dc6684','#e9e7ce','#439bb1'];
  for(let i=0;i<count;i++){const row=Math.floor(i/60),col=i%60,x=-206+col*7,y=420+row*9,z=12+row*7;dummy.position.set(x,y,z);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);bodies.setColorAt(i,new T.Color(colors[(i*7+row)%4]));dummy.position.z+=4;dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);}this.scene.add(bodies,heads);
  for(let row=0;row<4;row++)this.box(0,420+row*9,7+row*7,430,10,5,this.dark);
  const lightMat=new T.MeshStandardMaterial({color:'#f2ffff',emissive:'#b6efff',emissiveIntensity:2});
  for(const x of [-242,242]){this.tube(x,366,0,x,366,94,3,this.metal);this.box(x,366,94,46,8,14,this.dark);for(let i=0;i<5;i++)this.box(x-18+i*9,360,95,6,2,8,lightMat);}
 }
 draw(game,effects){this.bumpers.forEach((o,i)=>{const u=Math.max(0,((game.cooldowns['b'+i]||0)-game.time)/.16);o.ring.material.emissiveIntensity=u>0?2.8:.55;o.ball.position.z=25-Math.sin(u*Math.PI)*5;o.ring.position.z=17-Math.sin(u*Math.PI)*3;o.ring.material.emissive.set(game.powerPlay>0?'#ffb02c':'#42bcae');});this.goalMat.emissiveIntensity=game.goalArmed?1.2:game.powerPlay>0?.5:0;this.goalSign.material.map=this.goalTextures[game.goalArmed?'open':game.powerPlay>0?'power':'locked'];this.targets.forEach((m,i)=>{m.material.emissiveIntensity=game.lit&(1<<i)?1.4:0;});
  this.flippers.forEach((g,i)=>{const f=game.flippers[i];g.position.set(f.x-300,480-f.y,0);g.rotation.z=-f.a;});
  this.ball.visible=game.phase!=='over';this.ball.position.set(game.ball.x-300,480-game.ball.y,this.P.R+1);this.ball.rotation.set(game.ball.y/18,game.ball.x/18,0);
  this.popups.forEach((p,i)=>{const e=effects[i];p.visible=!!e;if(e){p.material.map=this.pointTextures[e.points];p.material.opacity=Math.max(0,e.life);p.position.set(e.x-300,480-e.y,35+(1-e.life)*45);p.scale.set(e.points===1000?112:56,28,1);}});
  this.renderer.render(this.scene,this.camera);
 }
}
root.StadiumPinball3DRenderer=StadiumPinball3DRenderer;
})(globalThis);
