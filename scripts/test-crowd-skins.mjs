import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CrowdBatch} from '../components/city/three/crowd-batch.ts';
import {loadCivilianLibrary} from './load-civilian-library.mjs';
import {groundElevation} from '../lib/city/ground.ts';
const library=await loadCivilianLibrary(),before=JSON.stringify([...library.loaded].map(([id,g])=>[id,g.scene.toJSON()]));
let poses=0,radiusMax=0;
for(const [id,source] of library.loaded){
 for(const kind of ['idle','walk','sprint','read','cup','bread','work','garden','bag','cook','exercise','soccer','swim','cycle','read|talk','cup|listen']){
  const batch=new CrowdBatch(source,id,kind,2),mesh=batch.mesh,colors={shirt:'#cc7755',trousers:'#445566',skin:'#d9ba90'};
  for(let f=0;f<32;f++){
   const points=batch.sample(f/4),radius=kind==='cycle'?9.2:4.8;
   for(let n=0;n<points.length;n+=3){assert(Number.isFinite(points[n]+points[n+1]+points[n+2]));const r=Math.hypot(points[n],points[n+2]);radiusMax=Math.max(radiusMax,r);assert(r<=radius+.001,`${id}/${kind} radius ${r}`);}
   if(['idle','walk','sprint'].includes(kind)){let min=Infinity;for(let n=1;n<points.length;n+=3)min=Math.min(min,points[n]);assert(min<.35,'Interpolated soles stay on the ground');}
   poses++;
  }
  batch.add('fixture',[0,0],0,.31,colors);mesh.updateMatrixWorld(true);
  const pos=batch.sample(.31/batch.period*8),bounds=new THREE.Box3();for(let i=0;i<pos.length;i+=3)bounds.expandByPoint(new THREE.Vector3(pos[i],pos[i+1]+groundElevation(0,0),pos[i+2]));
  const ray=new THREE.Raycaster(new THREE.Vector3(0,bounds.min.y+(bounds.max.y-bounds.min.y)*.55,50),new THREE.Vector3(0,0,-1)),hits=[];mesh.raycast(ray,hits);
  assert(hits.length,`${id}/${kind} actual animated body must be clickable`);assert(hits.every(h=>h.instanceId===0&&h.object===mesh));
  const old=mesh.geometry.getAttribute('shirtTone').getX(0);batch.reset();batch.add('fixture',[0,0],0,.31,{...colors,shirt:'#44ff66'});assert.notEqual(mesh.geometry.getAttribute('shirtTone').getX(0),old,'Same shader tint path while paused');
  batch.reset();const empty=[];mesh.raycast(ray,empty);assert.equal(empty.length,0,'Previous LOD instances cannot intercept a click');batch.dispose();
 }
}
assert.equal(JSON.stringify([...library.loaded].map(([id,g])=>[id,g.scene.toJSON()])),before);library.dispose();
console.log(JSON.stringify({suite:'crowd-skins',models:5,actions:16,interpolatedPoses:poses,radiusMax,nativeTopology:true,actualPosePicking:true,pausedTint:true,sourceImmutable:true}));
