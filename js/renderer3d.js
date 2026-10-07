/* Original procedural models and scenery. No external textures or model files. */
(function(root){
'use strict';
class PrimeRenderer{
 constructor(canvas,c){
  const T=THREE;this.T=T;this.c=c;this.tilt=0.14;this.cos=Math.cos(this.tilt);this.ground=(c.WORLD_HEIGHT-c.GROUND_Y-310)/this.cos+310;
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));this.renderer.setSize(1000,620,false);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.96;
  this.scene=new T.Scene();this.scene.background=new T.Color('#adc6d2');this.scene.fog=new T.Fog('#bacbd0',1800,3800);
  this.camera=new T.OrthographicCamera(-500,500,310,-310,1,5500);this.camera.position.set(0,310+Math.sin(this.tilt)*1250,Math.cos(this.tilt)*1250);this.camera.lookAt(0,310,0);
  this.scene.add(new T.HemisphereLight(0xe3f5ff,0x344432,1.6));const sun=new T.DirectionalLight(0xffecc8,2.5);sun.position.set(-350,800,420);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-850,right:850,top:650,bottom:-650,near:1,far:2100});sun.shadow.normalBias=0.6;sun.shadow.bias=-0.0003;sun.shadow.radius=3;sun.target.position.set(0,100,-180);this.scene.add(sun,sun.target);
  const fill=new T.DirectionalLight(0x9ed6ed,0.6);fill.position.set(300,280,-300);this.scene.add(fill);
  this.sphereGeo=new T.SphereGeometry(1,24,16);this.cylinderGeo=new T.CylinderGeometry(1,1,1,16);this.boxGeo=new T.BoxGeometry(1,1,1);
  this.buildGround();this.buildEnvironment();this.player=this.makePlayer();this.scene.add(this.player.group);this.player.group.scale.y=1/this.cos;
  const ballTex=this.texture(512,256,(x,w,h)=>{x.fillStyle='#eeeede';x.fillRect(0,0,w,h);x.strokeStyle='#8d998c';x.lineWidth=1.5;for(let j=0;j<4;j++)for(let i=0;i<9;i++){const px=i*64+(j%2)*32,py=j*70; x.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;x.lineTo(px+31*Math.cos(a),py+31*Math.sin(a));}x.closePath();x.stroke();if((i+j)%3===0){x.fillStyle='#162b33';x.beginPath();for(let k=0;k<5;k++){const a=k*Math.PI*2/5;x.lineTo(px+19*Math.cos(a),py+19*Math.sin(a));}x.closePath();x.fill();}}});
  this.ball=new T.Mesh(new T.SphereGeometry(c.BALL_RADIUS,32,24),new T.MeshStandardMaterial({map:ballTex,roughness:0.48,metalness:0.05}));this.ball.castShadow=true;this.scene.add(this.ball);
  this.ballShadow=this.shadow(25,0.23);this.scene.add(this.ballShadow);this.playerShadow=this.shadow(58,0.28);this.scene.add(this.playerShadow);
 }
 mat(color,roughness=.78){return new this.T.MeshStandardMaterial({color,roughness});}
 texture(w,h,paint){const cv=document.createElement('canvas');cv.width=w;cv.height=h;paint(cv.getContext('2d'),w,h);const tex=new this.T.CanvasTexture(cv);tex.colorSpace=this.T.SRGBColorSpace;tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return tex;}
 mesh(geo,material,parent,x,y,z,sx=1,sy=1,sz=1){const m=new this.T.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 sphere(parent,mat,x,y,z,sx,sy,sz){return this.mesh(this.sphereGeo,mat,parent,x,y,z,sx,sy,sz);}
 box(parent,mat,x,y,z,sx,sy,sz){return this.mesh(this.boxGeo,mat,parent,x,y,z,sx,sy,sz);}
 bone(parent,mat,width){return this.mesh(this.cylinderGeo,mat,parent,0,0,0,width,1,width);}
 connect(mesh,a,b,width){const va=new this.T.Vector3(...a),vb=new this.T.Vector3(...b),delta=vb.clone().sub(va);mesh.position.copy(va.add(vb).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new this.T.Vector3(0,1,0),delta.clone().normalize());mesh.scale.set(width,delta.length(),width);}
 shadow(size,opacity){const tex=this.texture(128,128,(x,w,h)=>{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(8,24,17,0.8)');g.addColorStop(.45,'rgba(8,24,17,0.35)');g.addColorStop(1,'rgba(8,24,17,0)');x.fillStyle=g;x.fillRect(0,0,w,h);});const m=new this.T.Mesh(new this.T.PlaneGeometry(size*2,size*2),new this.T.MeshBasicMaterial({map:tex,transparent:true,opacity,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=this.ground+.3;return m;}
 buildGround(){const T=this.T;let seed=9241;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const grass=this.texture(512,512,(x,w,h)=>{x.fillStyle='#548341';x.fillRect(0,0,w,h);for(let i=0;i<40000;i++){const px=rand()*w,py=rand()*h;x.strokeStyle=rand()>.5?'rgba(172,189,88,0.20)':'rgba(23,60,30,0.25)';x.beginPath();x.moveTo(px,py);x.lineTo(px+rand()*2-1,py-2-rand()*4);x.stroke();}});grass.wrapS=grass.wrapT=T.RepeatWrapping;grass.repeat.set(12,16);
  const field=new T.Mesh(new T.PlaneGeometry(2800,3300),new T.MeshStandardMaterial({map:grass,roughness:1}));field.rotation.x=-Math.PI/2;field.position.set(0,this.ground,-300);field.receiveShadow=true;this.scene.add(field);
  const stripe=new T.MeshStandardMaterial({color:0xd7eab4,transparent:true,opacity:.065,depthWrite:false});for(let i=0;i<12;i++){const m=new T.Mesh(new T.PlaneGeometry(2300,130),stripe);m.rotation.x=-Math.PI/2;m.position.set(0,this.ground+.12,-1700+i*260);this.scene.add(m);}
  const chalk=this.mat('#e5e5c5');const boundary=this.box(this.scene,chalk,0,this.ground+.35,-405,2500,.6,3);boundary.castShadow=false;
  const ring=new T.Mesh(new T.RingGeometry(221,224,120),chalk);ring.rotation.x=-Math.PI/2;ring.position.set(0,this.ground+.4,-10);ring.receiveShadow=true;this.scene.add(ring);
  const sideline=this.box(this.scene,chalk,-448,this.ground+.3,80,3,.5,1850);sideline.castShadow=false;
  const path=this.box(this.scene,this.mat('#b0aaa0'),0,this.ground-2,-750,2600,3,220);path.receiveShadow=true;
 }
 buildEnvironment(){const T=this.T,steel=this.mat('#687a7e',.4),dark=this.mat('#253b42'),white=this.mat('#e2e2d8');
  // The practice-ground fence is behind the spectators' field-side view.
  const meshTex=this.texture(128,128,(x)=>{x.clearRect(0,0,128,128);x.strokeStyle='rgba(65,81,79,.55)';x.lineWidth=.85;for(let n=-128;n<=256;n+=32){x.beginPath();x.moveTo(n,0);x.lineTo(n+128,128);x.stroke();x.beginPath();x.moveTo(n,0);x.lineTo(n-128,128);x.stroke();}});meshTex.wrapS=meshTex.wrapT=T.RepeatWrapping;meshTex.repeat.set(27,5);
  const fence=new T.Mesh(new T.PlaneGeometry(2500,220),new T.MeshStandardMaterial({map:meshTex,transparent:true,side:T.DoubleSide,depthWrite:false,roughness:.8}));fence.position.set(0,this.ground+110,-570);this.scene.add(fence);
  for(let x=-1200;x<=1200;x+=160){this.box(this.scene,steel,x,this.ground+111,-570,4,230,5);this.box(this.scene,white,x,this.ground+226,-570,7,3,8);}for(const h of [6,80,220])this.box(this.scene,steel,0,this.ground+h,-570,2500,3,4);
  // Clubhouse and distant apartment silhouettes, kept away from the ball corridor.
  const wall=this.mat('#d8d5c6'),glass=this.mat('#486a77',.28);this.box(this.scene,wall,-640,this.ground+105,-1100,320,210,180);this.box(this.scene,dark,-640,this.ground+214,-1080,340,12,215);
  for(let i=0;i<5;i++){this.box(this.scene,glass,-760+i*55,this.ground+138,-1007,35,55,2);this.box(this.scene,white,-760+i*55,this.ground+109,-1003,42,3,5);}this.box(this.scene,glass,-640,this.ground+43,-1007,55,84,3);
  for(let i=0;i<8;i++){const x=340+i*88;this.box(this.scene,this.mat(i%2?'#a9b6b2':'#b7bfba'),x,this.ground+90+(i%3)*14,-1600,77,180+(i%3)*28,100);for(let j=0;j<3;j++)this.box(this.scene,glass,x,this.ground+55+j*42,-1547,55,12,2);}
  // Thousands of small foliage clusters form broken, natural silhouettes.
  const bark=this.mat('#655e49'),leafGeo=new T.IcosahedronGeometry(1,1),foliage=new T.InstancedMesh(leafGeo,this.mat('#b4c4a4'),21*240),dummy=new T.Object3D();let leafIndex=0;
  for(let i=0;i<21;i++){const x=-1200+i*122,z=-1030-(i%3)*80,h=127+(i%4)*17;this.box(this.scene,bark,x,this.ground+h*.43,z,7,h*.86,7);for(let k=0;k<240;k++){const a=k*2.399963,b=Math.acos(1-2*(k+.5)/240),r=35+18*Math.sin(k*8.7+i);dummy.position.set(x+Math.cos(a)*Math.sin(b)*r*1.15,this.ground+h+Math.cos(b)*r,z+Math.sin(a)*Math.sin(b)*r);dummy.scale.set(6+(k%5),5+(k%4),6+(k%6));dummy.rotation.set(k*.7,k*.3,0);dummy.updateMatrix();foliage.setMatrixAt(leafIndex,dummy.matrix);foliage.setColorAt(leafIndex,new T.Color(['#3e5d3b','#4e6c40','#5d7950','#71865a'][(i+k)%4]));leafIndex++;}}
  foliage.instanceMatrix.needsUpdate=true;foliage.receiveShadow=true;this.scene.add(foliage);
  // Small groups watch from the public path behind the fence.
  this.spectators=[];const positions=[-451,-412,-373,-273,-235,-192,190,229,273,354,391,434,476];
  positions.forEach((x,i)=>{const human=this.makeSpectator(i);human.position.set(x,this.ground,-655-(i%3)*9);human.scale.setScalar(.82+(i%3)*.065);this.scene.add(human);this.spectators.push(human);});
  const benchMat=this.mat('#a08355');for(const x of [-345,335]){this.box(this.scene,benchMat,x,this.ground+34,-723,128,6,26);this.box(this.scene,benchMat,x,this.ground+55,-734,128,22,4);for(const dx of [-48,48])this.box(this.scene,steel,x+dx,this.ground+17,-723,5,34,20);}
  // Training equipment, goal and floodlight masts.
  const goal=new T.Group();goal.position.set(650,this.ground,-460);for(const x of [-83,83])this.box(goal,white,x,75,0,5,150,5);this.box(goal,white,0,150,0,171,5,5);const net=new T.Mesh(new T.PlaneGeometry(166,150),new T.MeshStandardMaterial({map:meshTex,transparent:true,opacity:.65,side:T.DoubleSide}));net.position.set(0,75,-12);goal.add(net);this.scene.add(goal);
  const orange=this.mat('#e88b30');for(const x of [-340,340]){this.mesh(new T.ConeGeometry(8,23,20),orange,this.scene,x,this.ground+11,95);this.box(this.scene,orange,x,this.ground+1,95,21,2,21);}
  for(const x of [-880,875]){this.box(this.scene,steel,x,this.ground+270,-940,7,540,7);this.box(this.scene,dark,x,this.ground+540,-940,70,24,18);for(const dx of [-24,0,24])this.box(this.scene,this.mat('#fff5d2'),x+dx,this.ground+540,-928,17,16,3);}
  const banner=this.texture(1024,128,(x,w,h)=>{x.fillStyle='#123d42';x.fillRect(0,0,w,h);x.fillStyle='#e8dfab';x.font='bold 42px Arial';x.textAlign='center';x.fillText('P R I M E   /   TRAINING CLUB',w/2,62);x.font='17px Arial';x.fillStyle='#b6d2ca';x.fillText('EST. 1993     •     THE GAME NEVER LEFT YOU',w/2,99);});const board=new T.Mesh(new T.PlaneGeometry(365,46),new T.MeshStandardMaterial({map:banner,roughness:.9}));board.position.set(0,this.ground+27,-561);this.scene.add(board);
 }
 makeSpectator(i){const T=this.T,g=new T.Group(),skin=this.mat(['#c08b65','#e6b18b','#91694c'][i%3]),shirt=this.mat(['#c9c4ae','#314e68','#a55b45','#5b7260','#d1ad64'][i%5]),pants=this.mat('#303b42'),hair=this.mat(i%4===0?'#b3aaa0':'#393127');
  this.mesh(new T.CylinderGeometry(16,13,46,16),shirt,g,0,76,0,1,1,.65);this.sphere(g,skin,0,112,1,11,14,10);this.sphere(g,hair,0,122,-1,11,6,10);for(const eye of [-1,1])this.sphere(g,hair,eye*4,113,10,1,1,.6);this.sphere(g,skin,0,110,10,1.5,2,1.5);
  for(const s of [-1,1]){const leg=this.bone(g,pants,6);this.connect(leg,[s*8,53,0],[s*10,5,0],6);this.sphere(g,pants,s*10,4,4,7,4,11);const arm=this.bone(g,shirt,5);this.connect(arm,[s*14,88,0],[s*23,66,5],5);const fore=this.bone(g,skin,4);this.connect(fore,[s*23,66,5],[s*13,i%3===0?88:57,11],4);this.sphere(g,skin,s*13,i%3===0?88:57,11,4,5,4);}g.userData.phase=i;return g;
 }
 makePlayer(){const T=this.T,g=new T.Group();const skin=this.mat('#c99372',.62),skinLight=this.mat('#d4a17d',.6),hair=this.mat('#292b2d',.85),dark=this.mat('#132a37'),sock=this.mat('#f0ead5'),boot=this.mat('#243b47',.4),sole=this.mat('#d5d4b6'),kit=this.mat('#e5b642',.75),teal=this.mat('#287980');
  const torso=new T.Group();g.add(torso);
  const cloth=this.texture(256,512,(x,w,h)=>{x.fillStyle='#d6a82e';x.fillRect(0,0,w,h);for(let y=0;y<h;y+=3){x.fillStyle=y%6?'#d3a52c':'#d9ad35';x.fillRect(0,y,w,1);}x.fillStyle='#22707a';x.fillRect(0,140,w,105);x.fillStyle='#ece7d0';x.fillRect(0,133,w,12);x.fillStyle='#ba8f24';for(let i=0;i<6;i++)x.fillRect(i*43,0,1,h);});
  const bodyMat=new T.MeshStandardMaterial({map:cloth,roughness:.92});
  const profile=[[77,18],[85,19],[94,20],[103,22],[111,24],[118,23],[122,15],[126,8]];
  const bodyGeo=new T.LatheGeometry(profile.map(([y,r])=>new T.Vector2(r,y)),40);
  const body=this.mesh(bodyGeo,bodyMat,torso,0,0,0,1,1,.52);

  // Curved chest band, cloth seams, collar, badge and number.
  
  const neck=this.sphere(torso,skin,0,129,0,6.5,9,6.5);const collar=new T.Mesh(new T.TorusGeometry(8,2,10,32),dark);collar.rotation.x=Math.PI/2;collar.position.set(0,124,0);torso.add(collar);
  const badgeTex=this.texture(256,256,(x)=>{x.fillStyle='#efe8cf';x.textAlign='center';x.font='bold 105px Arial';x.fillText('10',128,190);x.font='bold 21px Arial';x.fillText('PRIME',128,58);x.strokeStyle='#eee7c9';x.lineWidth=3;x.strokeRect(178,45,24,30);});
  const number=new T.Mesh(new T.PlaneGeometry(31,31),new T.MeshStandardMaterial({map:badgeTex,transparent:true,roughness:.85}));number.position.set(0,93,12.4);torso.add(number);const backNumber=number.clone();backNumber.rotation.y=Math.PI;backNumber.position.set(0,101,-12.3);torso.add(backNumber);
  for(const s of [-1,1]){const seam=this.box(torso,teal,s*20,89,7,1,24,1);seam.rotation.z=-s*.06;}
  this.sphere(g,dark,0,76,0,20,9,11);const shorts=[];for(const s of [-1,1]){const cuff=new T.Group();cuff.position.set(s*11,77,0);g.add(cuff);this.mesh(new T.CylinderGeometry(10.5,9.3,20,24),dark,cuff,0,-8,0,1,1,1.05);this.box(cuff,teal,s*9.1,-8,1,1,17,9);shorts.push({s,cuff});}
  const head=new T.Group();head.position.set(0,143,1);g.add(head);const faceGeo=new T.SphereGeometry(1,32,24);const pos=faceGeo.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i);if(y<-.15)pos.setX(i,pos.getX(i)*(1+(y+.15)*.22));}faceGeo.computeVertexNormals();this.mesh(faceGeo,skinLight,head,0,0,0,12.7,17.5,11.7);
  for(const s of [-1,1]){this.sphere(head,skin,s*12.7,-1,0,2.2,4.2,2.6);this.sphere(head,sock,s*5.1,2.5,10.5,2.7,.9,.65);this.sphere(head,dark,s*5.1,2.5,11,.75,.85,.4);const brow=this.box(head,hair,s*5.3,5.3,10.7,5.5,.8,.6);brow.rotation.z=-s*.1;}
  this.sphere(head,skinLight,0,-.7,12,2,4.7,2.4);this.sphere(head,this.mat('#825e4f'),0,-8,10.5,4.2,.7,.7);
  // Sculpted hair cap with a short, swept front.
  const hairCap=new T.Mesh(new T.SphereGeometry(13.2,24,12,0,Math.PI*2,0,Math.PI*.48),hair);hairCap.scale.set(1,1.2,.88);hairCap.position.y=3;head.add(hairCap);
  for(let i=0;i<8;i++){const lock=this.sphere(head,hair,-9+i*2.55,13.8+(i%3)*.4,5.5,2.8,3,5.3);lock.rotation.z=-.4;}for(const s of [-1,1])this.box(head,hair,s*12.1,4,-1,1.5,12,8);
  const arms=[];for(const s of [-1,1]){const upper=this.bone(g,kit,7.7),fore=this.bone(g,skin,5.1),elbow=this.sphere(g,skin,0,0,0,5.3,5.3,5.3),hand=this.sphere(g,skinLight,0,0,0,4.3,6.4,3.3);arms.push({s,upper,fore,elbow,hand});}
  const legs=[];for(const s of [-1,1]){const thigh=this.bone(g,skin,7.5),calf=this.bone(g,sock,5.6),knee=this.sphere(g,skinLight,0,0,0,6.8,7,6.5),ankle=this.sphere(g,sock,0,0,0,5.3,6.5,5.2),shoe=new T.Group();this.sphere(shoe,boot,0,0,2,7,5,13);this.sphere(shoe,sole,0,-3.6,2,7.1,1.3,13);for(let i=0;i<4;i++)this.box(shoe,sock,0,4-i*.5,3+i*2,7,.5,1);this.box(shoe,teal,s*6.3,0,4,1,3,10);g.add(shoe);legs.push({s,thigh,calf,knee,ankle,shoe});}
  return {group:g,torso,head,arms,legs,shorts};
 }
 render(g){const c=this.c,p=g.player,a=g.action,active=g.actionTime>0,model=this.player;const t=g.elapsed,spinning=p.spin>0;const angle=spinning?(1-p.spin/c.SPIN_DURATION)*Math.PI*2:0;model.group.position.set(p.x-500,(c.WORLD_HEIGHT-p.y-310)/this.cos+310,0);model.group.rotation.y=angle;
  // A hit is posed at contact immediately, then returns to rest; no delayed kick.
  const pose=active?Math.sin(Math.min(1,g.actionTime/c.ACTION_DURATION)*Math.PI/2):0;const stride=Math.sin(t*15)*Math.min(1,Math.abs(p.vx)/c.PLAYER_SPEED);const inAir=p.y<c.GROUND_Y-.5;const hitSign=g.actionSide==='RIGHT'?-1:1;
  const ka=c.KNEE_ANIMATION,kneeActive=active&&a==='KNEE';
  const kneePhase=kneeActive?1-Math.min(1,g.actionTime/ka.duration):1;
  const recover=Math.max(0,(kneePhase-ka.holdFraction)/(1-ka.holdFraction));
  const kneePose=kneeActive?1-recover*recover*(3-2*recover):0;
  for(const short of model.shorts){short.cuff.rotation.x=short.s===hitSign?kneePose*-0.82:0;}
  for(const leg of model.legs){const s=leg.s;let knee=[s*13,42,0],ankle=[s*16+stride*s*4,9,stride*s*8];
   if(inAir){knee=[s*16,47,3];ankle=[s*23,17,-5];}
   if(active&&s===hitSign&&(a==='FOOT'||a==='MISS')){knee=[s*18,43+pose*5,pose*6];ankle=[s*c.ACTIONS.FOOT.offsetX,9+(c.ACTIONS.FOOT.height-9)*pose,pose*7];}
   if(kneeActive&&s===hitSign){
    // The thigh lifts forward; the shin hangs down and back, never extends into a kick.
    // Depth compensation keeps the knee aligned with the unchanged screen-space hit region.
    const z=ka.forward*kneePose,raisedY=c.ACTIONS.KNEE.height-ka.contactOffset+ka.forward*Math.sin(this.tilt);
    knee=[s*(13+(c.ACTIONS.KNEE.offsetX-13)*kneePose),42+(raisedY-42)*kneePose,z];
    ankle=[s*(16+(c.ACTIONS.KNEE.offsetX-16)*kneePose),9+(raisedY-ka.shinDrop-9)*kneePose,(ka.forward-ka.shinBack)*kneePose];
   }
   this.connect(leg.thigh,[s*12,68,0],knee,7.2);leg.knee.position.set(...knee);this.connect(leg.calf,knee,ankle,5.6);leg.ankle.position.set(...ankle);leg.shoe.position.set(ankle[0],ankle[1]-4,ankle[2]+3);leg.shoe.rotation.x=kneeActive&&s===hitSign?ka.toeAngle*kneePose:active&&s===hitSign&&a==='FOOT'?-.23*pose:0;
  }
  for(const arm of model.arms){const s=arm.s,raise=spinning?12:inAir?10:active&&a==='CHEST'?9:kneeActive?5*kneePose:0;const elbow=[s*(31+raise*.15),100+raise,active&&a==='CHEST'?-5:0],hand=[s*(35+raise*.4),82+raise*1.9,7];this.connect(arm.upper,[s*21,117,0],elbow,7);this.connect(arm.fore,elbow,hand,4.8);arm.elbow.position.set(...elbow);arm.hand.position.set(...hand);}
  model.torso.rotation.z=kneeActive?hitSign*.035*kneePose:0;
  model.torso.rotation.x=active&&a==='CHEST'?-.13*pose:0;model.head.rotation.x=active&&(a==='HEADER'||a==='JUMP_HEADER')?.15*pose:-.06;model.head.rotation.y=spinning?0:Math.max(-.2,Math.min(.2,(g.ball.x-p.x)*.004));
  const ballDepth=19+26*kneePose;this.ball.visible=g.ball.active;this.ball.position.set(g.ball.x-500,(c.WORLD_HEIGHT-g.ball.y-310+ballDepth*Math.sin(this.tilt))/this.cos+310,ballDepth);this.ball.rotation.set(t*.3,g.ball.rotation,g.ball.rotation*.6);
  const height=c.GROUND_Y-g.ball.y;this.ballShadow.visible=g.ball.active;this.ballShadow.position.x=g.ball.x-500;this.ballShadow.scale.setScalar(.45+height*.0014);this.ballShadow.material.opacity=Math.max(.07,.3-height*.0005);this.playerShadow.position.x=p.x-500;this.playerShadow.scale.setScalar(.65+(c.GROUND_Y-p.y)*.003);this.playerShadow.material.opacity=inAir?.15:.3;
  for(const person of this.spectators){person.rotation.z=Math.sin(t*.65+person.userData.phase)*.008;}
  this.renderer.render(this.scene,this.camera);
 }
}
root.PrimeRenderer=PrimeRenderer;
})(globalThis);
