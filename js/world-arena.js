/* V0.5.30 — night-match stadium spectacle.
   GPU-lightweight procedural panorama + instanced celebratory lights.
   This module never changes the ball, player, input, or scoring physics. */
(function(root){
'use strict';
root.PRIME_WORLD_ARENA=function(host){
 const T=host.T, g=host.ground, group=new T.Group();host.scene.add(group);
 const basic=(color)=>new T.MeshBasicMaterial({color,side:T.DoubleSide});
 const addBox=(x,y,z,w,h,d,color)=>{
  const m=new T.Mesh(new T.BoxGeometry(w,h,d),basic(color));m.position.set(x,y,z);group.add(m);return m;
 };
 // The camera is orthographic. A high-resolution stadium panorama gives the
 // full curved grandstand silhouette without thousands of CPU-heavy objects.
 const panorama=host.texture(2048,1024,(ctx,w,h)=>{
  const grad=ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,'#071326');grad.addColorStop(.46,'#10233c');
  grad.addColorStop(.78,'#22223b');grad.addColorStop(1,'#061a23');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  // Subtle magenta/cyan atmospheric glow.
  for(const [x,color] of [[290,'rgba(248,42,169,.35)'],[1720,'rgba(51,224,255,.32)']]){
   const halo=ctx.createRadialGradient(x,280,20,x,280,620);
   halo.addColorStop(0,color);halo.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
  }
  // Sweeping tiers: rows curve upward at the edges, as if inside a full bowl.
  const bowl=(x)=>Math.pow(Math.abs((x-w/2)/(w/2)),1.9);
  for(let tier=0;tier<3;tier++){
   const base=465+tier*140;
   ctx.beginPath();
   for(let x=0;x<=w;x+=8){const y=base-125*bowl(x);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
   for(let x=w;x>=0;x-=8)ctx.lineTo(x,base+83-125*bowl(x));
   ctx.closePath();ctx.fillStyle=['#101a32','#151a36','#111b36','#131b2f'][tier];ctx.fill();
   ctx.strokeStyle=tier%2?'#dd6bb5':'#8fe8ff';ctx.lineWidth=5;ctx.beginPath();
   for(let x=0;x<=w;x+=8){const y=base-125*bowl(x);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
   ctx.stroke();
   // Crowd is drawn into one texture: thousands of tiny colored spectators
   // cost no additional draw calls.
   for(let row=0;row<13;row++)for(let col=0;col<300;col++){
    const x=col*7+((row%2)*3),y=base+10+row*9-125*bowl(x);
    const seed=(col*43+row*71+tier*97)%37;
    ctx.fillStyle=seed<5?'#f8e8f6':seed<12?'#78c5e2':seed<18?'#fa86bd':seed<24?'#596c9d':'#364563';
    ctx.globalAlpha=.45+(seed%6)*.08;ctx.fillRect(x,y,3.5,4.2);
   }
   ctx.globalAlpha=1;
  }
  // VIP boxes and bright ribbon LEDs across the stadium.
  for(let tier=0;tier<3;tier++){
   const y=572+tier*140;ctx.strokeStyle='#ff4bd4';
   ctx.lineWidth=8;ctx.beginPath();for(let x=0;x<=w;x+=8){
    const yy=y-125*bowl(x);if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);
   }ctx.stroke();
  }
  // Curved roof silhouette and a continuous lighting ribbon.
  ctx.beginPath();for(let x=0;x<=w;x+=8){
   const y=385-175*bowl(x);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }for(let x=w;x>=0;x-=8)ctx.lineTo(x,275-155*bowl(x));
  ctx.closePath();ctx.fillStyle='#090d1e';ctx.fill();
  ctx.strokeStyle='#a5c9f2';ctx.lineWidth=7;ctx.beginPath();
  for(let x=0;x<=w;x+=8){const y=385-175*bowl(x);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
  ctx.stroke();
  // Roof trusses and floodlight arrays: permanent match-day architecture.
  ctx.strokeStyle='rgba(114,155,193,.48)';ctx.lineWidth=5;
  for(let i=0;i<=12;i++){
   const x=i*w/12;ctx.beginPath();ctx.moveTo(w/2,18);ctx.lineTo(x,270-125*bowl(x));ctx.stroke();
  }
  for(let bank=0;bank<8;bank++){
   const cx=(bank+.5)*w/8,cy=360-175*bowl(cx);
   for(let lamp=0;lamp<7;lamp++){
    const x=cx+(lamp-3)*11;
    const glow=ctx.createRadialGradient(x,cy,1,x,cy,19);
    glow.addColorStop(0,'rgba(255,255,255,.95)');
    glow.addColorStop(.3,'rgba(181,224,255,.65)');
    glow.addColorStop(1,'rgba(181,224,255,0)');
    ctx.fillStyle=glow;ctx.fillRect(x-20,cy-20,40,40);
    ctx.fillStyle='#ffffff';ctx.fillRect(x-2.5,cy-2.5,5,5);
   }
  }

 });
 const wall=new T.Mesh(new T.PlaneGeometry(3100,1000),new T.MeshBasicMaterial({map:panorama,depthWrite:false}));
 wall.position.set(0,g+345,-1080);group.add(wall);
 // Real 3D fascia in front of the panorama adds parallax while preserving
 // the single-texture crowd budget. Stadium ribbons are emissive, not lights.
 const ribbonMat=new T.MeshBasicMaterial({color:0xf64dcb});
 for(let tier=0;tier<2;tier++){
  const y=g+185+tier*124,z=-840-tier*105;
  addBox(0,y-10,z,1880,25,13,0x071323);
  const led=new T.Mesh(new T.BoxGeometry(1880,5,17),ribbonMat);
  led.position.set(0,y,z+9);group.add(led);
  for(const side of [-1,1]){
   const corner=new T.Mesh(new T.BoxGeometry(380,5,17),ribbonMat);
   corner.position.set(side*1060,y-14,z+70);
   corner.rotation.y=side*.38;group.add(corner);
  }
 }
 // Three bands of subtle aisle illumination help sell the tier depth.
 const aisleMat=new T.MeshBasicMaterial({color:0xdcefff});
 for(let tier=0;tier<3;tier++)for(let aisle=-4;aisle<=4;aisle++){
  const x=aisle*207;
  for(let step=0;step<7;step++){
   const marker=new T.Mesh(new T.BoxGeometry(8,3,5),aisleMat);
   marker.position.set(x,g+150+tier*125+step*11,-900-tier*90);
   group.add(marker);
  }
 }
 // Compact overhead floodlight banks; no shadow-casting lights or postprocess.
 const lampMat=new T.MeshBasicMaterial({color:0xffffff});
 for(let bank=-3;bank<=3;bank++){
  const x=bank*300;
  addBox(x,g+575,-1000,145,9,13,0x273b54);
  for(let j=0;j<6;j++){
   const bulb=new T.Mesh(new T.BoxGeometry(11,7,7),lampMat);
   bulb.position.set(x+(j-2.5)*21,g+571,-991);group.add(bulb);
  }
 }
 // Stadium side wings provide real depth and wrap toward the player.
 const wingMat=new T.MeshBasicMaterial({color:0x17263e,side:T.DoubleSide});
 for(const side of [-1,1]){
  for(let tier=0;tier<4;tier++){
   const wing=new T.Mesh(new T.BoxGeometry(350,34,650),wingMat);
   wing.position.set(side*(1240+tier*28),g+90+tier*93,-680);
   wing.rotation.y=side*.33;group.add(wing);
  }
  // Powerful match-day floodlights, visible in front of the distant crowd.
  const pole=addBox(side*1030,g+265,-680,8,530,8,0x65778b);
  const beam=addBox(side*1030,g+524,-675,155,16,18,0xc8eafa);
  for(let i=0;i<7;i++)addBox(side*1030-65+i*21,g+525,-660,13,11,4,0xffffff);
 }
 // Sideline advertising, avoiding the player's hitbox and front-field area.
 addBox(0,g+34,-550,2100,68,8,0x071e2b);
 const banner=host.texture(1024,96,(ctx,w,h)=>{
  ctx.fillStyle='#061723';ctx.fillRect(0,0,w,h);
  ctx.textAlign='center';ctx.font='bold 49px Arial';ctx.fillStyle='#e6f8ff';
  ctx.fillText('PRIME  /  LIFTING LAB',w/2,65);
 });
 const bannerMesh=new T.Mesh(new T.PlaneGeometry(920,86),new T.MeshBasicMaterial({map:banner}));
 bannerMesh.position.set(0,g+55,-540);group.add(bannerMesh);
 // Match-day pitch: independently visible from the practice-ground scene.
 // Use a shared textured plane and a handful of low-cost markings; the player,
 // ball and existing physical ground height remain completely unchanged.
 let grassSeed=20261015;
 const grassRand=()=>{grassSeed=(1664525*grassSeed+1013904223)>>>0;return grassSeed/4294967296;};
 const turf=host.texture(512,512,(ctx,w,h)=>{
  ctx.fillStyle='#377f40';ctx.fillRect(0,0,w,h);
  for(let stripe=0;stripe<16;stripe++){
   ctx.fillStyle=stripe%2?'rgba(6,41,21,.13)':'rgba(165,224,112,.13)';
   ctx.fillRect(0,stripe*h/16,w,h/16);
  }
  for(let i=0;i<23000;i++){
   const x=grassRand()*w,y=grassRand()*h;
   ctx.strokeStyle=grassRand()>.52?'rgba(185,231,129,.25)':'rgba(8,56,24,.27)';
   ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y);
   ctx.lineTo(x+(grassRand()-.5)*2,y-2-grassRand()*3);ctx.stroke();
  }
 });
 turf.wrapS=turf.wrapT=T.RepeatWrapping;turf.repeat.set(5,8);
 turf.anisotropy=Math.min(8,host.renderer.capabilities.getMaxAnisotropy());
 const pitch=new T.Mesh(new T.PlaneGeometry(2800,1850),
  new T.MeshStandardMaterial({map:turf,roughness:1,metalness:0,side:T.DoubleSide}));
 pitch.rotation.x=-Math.PI/2;pitch.position.set(0,g-.45,385);
 pitch.receiveShadow=true;group.add(pitch);
 // Mowing bands at field scale, intentionally subtle under night floodlights.
 const mowLight=new T.MeshBasicMaterial({color:0x85b966,transparent:true,opacity:.07,depthWrite:false,side:T.DoubleSide});
 for(let i=0;i<7;i++){
  const stripe=new T.Mesh(new T.PlaneGeometry(2800,170),mowLight);
  stripe.rotation.x=-Math.PI/2;stripe.position.set(0,g-.35,-420+i*265);
  group.add(stripe);
 }
 const paint=new T.MeshBasicMaterial({color:0xf0f5e9,side:T.DoubleSide,depthWrite:false});
 const line=(x,z,w,d)=>{
  const m=new T.Mesh(new T.PlaneGeometry(w,d),paint);
  m.rotation.x=-Math.PI/2;m.position.set(x,g-.22,z);group.add(m);return m;
 };
 // Visible center circle and field lines, located behind and around the player.
 const ring=new T.Mesh(new T.RingGeometry(216,219,128),paint);
 ring.rotation.x=-Math.PI/2;ring.position.set(0,g-.2,-10);group.add(ring);
 const centerDot=new T.Mesh(new T.CircleGeometry(5,24),paint);
 centerDot.rotation.x=-Math.PI/2;centerDot.position.set(0,g-.19,-10);group.add(centerDot);
 line(0,-405,2450,3);
 for(const x of [-1020,1020])line(x,-300,3,1850);
 // Keep the pitch playable and visually grounded: no solid obstacles.
 // Match-day touchline: ten low-poly staff and substitutes behind the
 // advertising board. Reuse a small set of geometries and materials.
 const skin=new T.MeshStandardMaterial({color:0xc58e70,roughness:.9});
 const hair=new T.MeshStandardMaterial({color:0x22242b,roughness:1});
 const navy=new T.MeshStandardMaterial({color:0x142539,roughness:1});
 const shirt=new T.MeshStandardMaterial({color:0x2a79c4,roughness:1});
 const vest=new T.MeshStandardMaterial({color:0x8ce2ae,roughness:1});
 const trousers=new T.MeshStandardMaterial({color:0x1a2433,roughness:1});
 const shoes=new T.MeshStandardMaterial({color:0x10151e,roughness:1});
 const white=new T.MeshStandardMaterial({color:0xe9e6df,roughness:1});
 const headGeo=new T.SphereGeometry(10,9,7),bodyGeo=new T.CylinderGeometry(13,12,44,8),limbGeo=new T.CylinderGeometry(4.5,5.5,40,7);
 const createPerson=(i)=>{
  const person=new T.Group();
  const role=i===1||i===7?'manager':i===4||i===9?'coach':'sub';
  const top=role==='manager'?navy:role==='coach'?vest:shirt;
  const torso=new T.Mesh(bodyGeo,top);torso.position.y=81;person.add(torso);
  const head=new T.Mesh(headGeo,skin);head.position.y=117;person.add(head);
  const cap=new T.Mesh(new T.SphereGeometry(10.5,9,5,0,Math.PI*2,0,Math.PI*.43),hair);
  cap.position.y=121;person.add(cap);
  if(role==='manager'){
   const tie=new T.Mesh(new T.BoxGeometry(3,25,2),white);tie.position.set(0,80,13);person.add(tie);
  }
  for(const side of [-1,1]){
   const leg=new T.Mesh(limbGeo,trousers);leg.position.set(side*7,31,0);leg.rotation.z=side*(i%3===0?.09:.02);person.add(leg);
   const boot=new T.Mesh(new T.BoxGeometry(11,7,18),shoes);boot.position.set(side*7,8,6);person.add(boot);
   const arm=new T.Mesh(new T.CylinderGeometry(4.5,4,38,7),top);
   arm.position.set(side*17,82,0);
   arm.rotation.z=side*(role==='manager'?-.12:i%3===0?-.55:.25);person.add(arm);
   const hand=new T.Mesh(new T.SphereGeometry(4.3,7,6),skin);
   hand.position.set(side*(role==='manager'?20:i%3===0?27:14),63,0);person.add(hand);
  }
  const x=-630+i*140;
  person.position.set(x,g+68,-560);
  person.scale.setScalar(.73+(i%4)*.035);
  person.rotation.y=i%3===0?-.17:i%3===1?.1:0;
  group.add(person);
 };
 for(let i=0;i<10;i++)createPerson(i);
 // Night-time illumination is independent of the training ground's sunlight.
 const ambient=new T.HemisphereLight(0xc4e9ff,0x273729,2.2);group.add(ambient);
 const key=new T.DirectionalLight(0xf9efff,2.5);key.position.set(-350,700,460);group.add(key);
 const fill=new T.DirectionalLight(0x8acfff,1.2);fill.position.set(420,400,270);group.add(fill);
 const sky=new T.Color('#071326'),fog=new T.Fog('#15152b',2400,5500);
 return {group,show(visible){
  group.visible=visible;host.trainingGroup.visible=!visible;
  host.scene.background=visible?sky:host.trainingBackground;
  host.scene.fog=visible?fog:host.trainingFog;
  if(host.trainingLights)for(const light of host.trainingLights)light.visible=!visible;
 }};
};
})(globalThis);
