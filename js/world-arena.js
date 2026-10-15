/* WORLD ARENA visual environment; gameplay and collision physics remain unchanged. */
(function(root){
'use strict';
root.PRIME_WORLD_ARENA=function(renderer){
 const T=renderer.T,scene=renderer.scene,g=renderer.ground;
 const group=new T.Group();scene.add(group);
 const mat=(color,roughness=.82,emissive=0x000000,intensity=0)=>new T.MeshStandardMaterial({color,roughness,emissive,emissiveIntensity:intensity});
 const concrete=mat(0x24313b),seat=mat(0x172b3e),accent=mat(0x86e5fa),steel=mat(0x778795,.5),dark=mat(0x08121c),lamp=mat(0xeef9ff,.3,0xb2dcff,1.3);
 const box=(parent,m,x,y,z,w,h,d)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
 // Stadium bowl: three broad terraced grandstands behind the playable corridor.
 for(let tier=0;tier<4;tier++){
  const z=-820-tier*200,y=g+80+tier*108;
  box(group,concrete,0,y-46,z,2900,90,180);
  box(group,seat,0,y+2,z,2800,12,172);
  for(let row=0;row<3;row++){
   const yy=y+12+row*16,zz=z-62+row*54;
   box(group,mat(row===1?0x15374b:0x193249),0,yy,zz,2750,12,41);
  }
 }
 // Instanced spectators: one draw call per color, stable GPU cost.
 const colors=[0x7ed3e5,0xeaf2f2,0xf4bb62,0x84a7b6,0x49788f];
 const geo=new T.IcosahedronGeometry(1,0);
 const dummy=new T.Object3D();
 for(let color=0;color<colors.length;color++){
  const mesh=new T.InstancedMesh(geo,new T.MeshStandardMaterial({color:colors[color],roughness:1}),1000);
  let index=0;
  for(let tier=0;tier<4;tier++)for(let row=0;row<5;row++)for(let col=0;col<250;col++){
   if((col+row*3+tier*7)%5!==color)continue;
   const x=-1320+col*10.6,z=-880-tier*200+row*29;
   dummy.position.set(x,g+91+tier*108+row*9,z);
   dummy.scale.set(4.3,7.2,4.2);dummy.updateMatrix();mesh.setMatrixAt(index++,dummy.matrix);
  }
  mesh.count=index;mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;group.add(mesh);
 }
 // Upper roof and banners.
 box(group,dark,0,g+630,-1540,3100,26,340);
 for(const x of [-1350,-675,0,675,1350])box(group,steel,x,g+360,-1450,12,610,12);
 box(group,accent,0,g+450,-1460,2700,7,9);
 const screenTex=renderer.texture(1024,320,(ctx,w,h)=>{
  ctx.fillStyle='#061522';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#85edff';ctx.font='bold 112px Arial';ctx.textAlign='center';ctx.fillText('WORLD ARENA',w/2,146);
  ctx.fillStyle='#e8faff';ctx.font='bold 37px Arial';ctx.fillText('PRIME  /  LIFTING LAB',w/2,235);
 });
 const screen=new T.Mesh(new T.PlaneGeometry(720,225),new T.MeshBasicMaterial({map:screenTex}));
 screen.position.set(0,g+430,-760);group.add(screen);
 box(group,steel,0,g+430,-770,744,250,14);
 for(const x of [-1000,1000]){
  box(group,steel,x,g+320,-680,12,640,12);
  box(group,steel,x,g+638,-680,140,12,20);
  for(let i=0;i<5;i++)box(group,lamp,x-54+i*27,g+635,-660,21,16,8);
 }
 const sky=new T.Color('#09182c'),fog=new T.Fog('#0c2034',1900,4200);
 const ambient=new T.HemisphereLight(0xb6dcff,0x20311d,1.0);group.add(ambient);
 const spots=[];
 for(const x of [-880,880]){
  const light=new T.PointLight(0xd9f3ff,45,2100,2);light.position.set(x,g+560,-550);group.add(light);spots.push(light);
 }
 return {
  show(visible){
   group.visible=visible;
   renderer.trainingGroup.visible=!visible;
   renderer.scene.background=visible?sky:renderer.trainingBackground;
   renderer.scene.fog=visible?fog:renderer.trainingFog;
   if(renderer.trainingLights)for(const light of renderer.trainingLights)light.visible=!visible;
  },
  group
 };
};
})(globalThis);
