/* Shared visual-only player. Consumes renderer helpers, never game state. */
(function(root){'use strict';
root.PRIME_PLAYER_MODEL=function(){const T=this.T,g=new T.Group();const skin=this.mat('#c99372',.62),skinLight=this.mat('#d4a17d',.6),hair=this.mat('#292b2d',.85),dark=this.mat('#132a37'),sock=this.mat('#f0ead5'),boot=this.mat('#243b47',.4),sole=this.mat('#d5d4b6'),kit=this.mat('#e5b642',.75),teal=this.mat('#287980');
  const torso=new T.Group();g.add(torso);
  const cloth=this.texture(256,512,(x,w,h)=>{x.fillStyle='#d6a82e';x.fillRect(0,0,w,h);for(let y=0;y<h;y+=3){x.fillStyle=y%6?'#d3a52c':'#d9ad35';x.fillRect(0,y,w,1);}x.fillStyle='#22707a';x.fillRect(0,140,w,105);x.fillStyle='#ece7d0';x.fillRect(0,133,w,12);x.fillStyle='#ba8f24';for(let i=0;i<6;i++)x.fillRect(i*43,0,1,h);});
  const bodyMat=new T.MeshStandardMaterial({map:cloth,roughness:.92});
  const profile=[[76,17.8],[78,19],[81,18.5],[86,19.3],[90,18.8],[96,20],[102,22],[109,24],[115,24.5],[119,22],[123,14],[126,8]];
  const bodyGeo=new T.LatheGeometry(profile.map(([y,r])=>new T.Vector2(r,y)),40);
  const garment=bodyGeo.attributes.position;
  for(let i=0;i<garment.count;i++){const x=garment.getX(i),y=garment.getY(i),z=garment.getZ(i),a=Math.atan2(z,x),fold=Math.sin(a*9+y*.16)*.38*Math.max(0,1-Math.abs(y-88)/30);garment.setXYZ(i,x+Math.cos(a)*fold,y,z+Math.sin(a)*fold);}
  bodyGeo.computeVertexNormals();this.mesh(bodyGeo,bodyMat,torso,0,0,0,1,1,.56);

  // Curved chest band, cloth seams, collar, badge and number.
  
  const neck=this.sphere(torso,skin,0,129,0,6.5,9,6.5);const collar=new T.Mesh(new T.TorusGeometry(8,2,10,32),dark);collar.rotation.x=Math.PI/2;collar.position.set(0,124,0);torso.add(collar);
  const badgeTex=this.texture(256,256,(x)=>{x.fillStyle='#efe8cf';x.textAlign='center';x.font='bold 105px Arial';x.fillText('10',128,190);x.font='bold 21px Arial';x.fillText('PRIME',128,58);x.strokeStyle='#eee7c9';x.lineWidth=3;x.strokeRect(178,45,24,30);});
  const number=new T.Mesh(new T.PlaneGeometry(31,31),new T.MeshStandardMaterial({map:badgeTex,transparent:true,roughness:.85}));number.position.set(0,93,13.4);torso.add(number);const backNumber=number.clone();backNumber.rotation.y=Math.PI;backNumber.position.set(0,101,-13.3);torso.add(backNumber);
  for(const s of [-1,1]){const seam=this.box(torso,teal,s*20,89,7,1,24,1);seam.rotation.z=-s*.06;}
  this.sphere(g,dark,0,76,0,20,9,11);const shorts=[];for(const s of [-1,1]){const cuff=new T.Group();cuff.position.set(s*11,77,0);g.add(cuff);this.mesh(new T.CylinderGeometry(10.5,9.3,20,24),dark,cuff,0,-8,0,1,1,1.05);this.box(cuff,teal,s*9.1,-8,1,1,17,9);shorts.push({s,cuff});}
  const head=new T.Group();head.position.set(0,143,1);g.add(head);const faceGeo=new T.SphereGeometry(1,32,24);const pos=faceGeo.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i);if(y<-.15)pos.setX(i,pos.getX(i)*(1+(y+.15)*.22));}faceGeo.computeVertexNormals();this.mesh(faceGeo,skinLight,head,0,0,0,12.7,17.5,11.7);
  for(const s of [-1,1]){this.sphere(head,skin,s*12.7,-1,0,2.2,4.2,2.6);this.sphere(head,sock,s*5.1,2.5,10.5,2.7,.9,.65);this.sphere(head,dark,s*5.1,2.5,11,.75,.85,.4);const brow=this.box(head,hair,s*5.3,5.3,10.7,5.5,.8,.6);brow.rotation.z=-s*.1;}
  for(const side of [-1,1]){this.sphere(head,skinLight,side*6,-3,9.7,4,3.6,2);this.sphere(head,skin,side*12.7,-1,1,1.2,2.6,1.3);}
  this.sphere(head,skinLight,0,-.7,12,2,4.7,2.4);this.sphere(head,this.mat('#825e4f'),0,-8,10.5,4.2,.7,.7);
  // Sculpted hair cap with a short, swept front.
  const hairCap=new T.Mesh(new T.SphereGeometry(13.2,24,12,0,Math.PI*2,0,Math.PI*.48),hair);hairCap.scale.set(1,1.2,.88);hairCap.position.y=3;head.add(hairCap);
  for(let i=0;i<8;i++){const lock=this.sphere(head,hair,-9+i*2.55,13.8+(i%3)*.4,5.5,2.8,3,5.3);lock.rotation.z=-.4;}for(const s of [-1,1])this.box(head,hair,s*12.1,4,-1,1.5,12,8);
  const limbGeo=new T.LatheGeometry([[-.5,.78],[-.44,.94],[-.22,1.08],[0,1.04],[.27,.95],[.45,.83],[.5,.77]].map(([y,r])=>new T.Vector2(r,y)),16);
  const limb=(parent,mat)=>this.mesh(limbGeo,mat,parent,0,0,0);
  const arms=[];for(const s of [-1,1]){const upper=limb(g,kit),fore=limb(g,skin),elbow=this.sphere(g,skin,0,0,0,5.3,5.3,5.3),hand=this.sphere(g,skinLight,0,0,0,4.3,6.4,3.3);const sleeveTrim=new T.Mesh(new T.TorusGeometry(.91,.09,6,20),teal);sleeveTrim.rotation.x=Math.PI/2;sleeveTrim.position.y=-.43;upper.add(sleeveTrim);
   const shoulder=this.sphere(g,kit,s*21,117,0,7.8,8,7.5);
   this.sphere(hand,skinLight,s*.65,-.1,.35,.4,.55,.55);
   arms.push({s,upper,fore,elbow,hand,shoulder});}
  const legs=[];for(const s of [-1,1]){const thigh=limb(g,skin),calf=limb(g,sock),knee=this.sphere(g,skinLight,0,0,0,6.8,7,6.5),ankle=this.sphere(g,sock,0,0,0,5.3,6.5,5.2),shoe=new T.Group();this.sphere(shoe,boot,0,0,2,7,5,13);this.sphere(shoe,sole,0,-3.6,2,7.1,1.3,13);for(let i=0;i<4;i++)this.box(shoe,sock,0,4-i*.5,3+i*2,7,.5,1);this.box(shoe,teal,s*6.3,0,4,1,3,10);for(const dx of [-4,4])for(const dz of [-5,7])this.sphere(shoe,boot,dx,-4.9,dz,1.5,1.3,1.5);g.add(shoe);legs.push({s,thigh,calf,knee,ankle,shoe});}
  return {group:g,torso,head,arms,legs,shorts,kitMaterials:{bodyMat,kit,dark,teal}};

};
})(globalThis);
