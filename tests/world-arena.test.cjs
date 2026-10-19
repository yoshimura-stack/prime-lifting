const assert=require('node:assert/strict'),{test}=require('node:test');
const T=require('../vendor/three.min.js');
require('../js/player-model.js');require('../js/renderer3d.js');require('../js/world-arena.js');
function fixture(){
 const host=Object.create(PrimeRenderer.prototype);Object.assign(host,{T,ground:98,scene:new T.Scene(),trainingGroup:new T.Group(),trainingBackground:new T.Color('#adc6d2'),trainingFog:new T.Fog('#bacbd0',1800,3800),trainingLights:[new T.HemisphereLight(),new T.DirectionalLight(),new T.DirectionalLight()],sphereGeo:new T.SphereGeometry(1,24,16),cylinderGeo:new T.CylinderGeometry(1,1,1,16),boxGeo:new T.BoxGeometry(1,1,1),texture:()=>new T.Texture()});
 host.scene.add(host.trainingGroup,...host.trainingLights);return {host,arena:PRIME_WORLD_ARENA(host)};
}
test('arena crew stand at ground level, use training models and include all three roles',()=>{
 const {host,arena}=fixture(),crew=arena.group.userData.crew;
 assert.equal(crew.length,10);assert.deepEqual(new Set(crew.map(p=>p.role)),new Set(['substitute','manager','staff']));
 for(const p of crew){assert.equal(p.y,host.ground);assert.ok(p.z<-405&&p.z>-650);assert.ok(p.scale>=.7&&p.scale<=1);}
 const people=arena.group.children.filter(m=>m.name==='technical-area-people');assert.ok(people.length<=3);
 const box=new T.Box3(),matrix=new T.Matrix4();let lowest=Infinity;
 for(const mesh of people){mesh.geometry.computeBoundingBox();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);box.copy(mesh.geometry.boundingBox).applyMatrix4(matrix);lowest=Math.min(lowest,box.min.y);}}
 assert.ok(Math.abs(lowest-host.ground)<.01,'actual shoes must touch the floor');
});
test('grass is a horizontal floor, with real tier elevations behind the crew',()=>{
 const {host,arena}=fixture(),pitch=arena.group.getObjectByName('pitch');pitch.updateMatrixWorld();
 const normal=new T.Vector3(0,0,1).transformDirection(pitch.matrixWorld);assert.ok(normal.y>.999);assert.equal(pitch.position.y,host.ground);
 const treads=arena.group.getObjectByName('stadium-treads').geometry.attributes.position;
 const heights=new Set();for(let i=0;i<treads.count;i++){heights.add(Math.round(treads.getY(i)));assert.ok(treads.getZ(i)<0);}
 assert.equal(heights.size,24);assert.equal(arena.group.userData.crowdCount,7104);
 assert.equal(arena.group.children.filter(m=>m.name.startsWith('crowd-')).length,2);
 assert.equal(arena.group.children.filter(m=>m.isLight&&m.castShadow).length,0);
 assert.ok(!arena.group.getObjectByName('panorama'));
});
test('stage switches restore all training lights and atmosphere without allocations',()=>{
 const {host,arena}=fixture(),children=arena.group.children.slice();
 for(let i=0;i<20;i++){
  arena.show(true);assert.ok(arena.group.visible);assert.ok(!host.trainingGroup.visible);assert.ok(host.trainingLights.every(l=>!l.visible));
  arena.show(false);assert.ok(!arena.group.visible);assert.ok(host.trainingGroup.visible);assert.ok(host.trainingLights.every(l=>l.visible));assert.equal(host.scene.background,host.trainingBackground);assert.equal(host.scene.fog,host.trainingFog);
 }
 assert.deepEqual(arena.group.children,children);
});
