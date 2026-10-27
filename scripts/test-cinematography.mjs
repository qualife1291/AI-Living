import assert from 'node:assert/strict';
import {characterShot} from '../lib/city/cinematography.ts';
import {segmentHits} from '../lib/city/footprints.ts';
import { PerspectiveCamera, Vector3 } from 'three';
const actor={id:'an',position:[0,0]},peer={id:'binh',position:[14,0]};
for(let i=0;i<360;i++){
 const shot=characterShot(actor,peer,i*Math.PI/180,[]);
 assert.ok([...shot.target,...shot.position].every(Number.isFinite));
 assert.ok(Math.hypot(shot.target[0],shot.target[2])<5);
 assert.ok(shot.position[1]>=40&&shot.position[1]<=100);
}
const obstacle={x:40,z:40,width:35,depth:35};
const shot=characterShot(actor,undefined,.2,[obstacle]);
assert.ok(!segmentHits(obstacle,actor.position,[shot.position[0],shot.position[2]],2));
assert.deepEqual(shot,characterShot(actor,undefined,.2,[obstacle]));
for (const aspect of [.4,390/844,1,1.6,2]) for (let angle=0;angle<360;angle+=10) {
 const listener={...peer,position:[30,0]};
 const framing=characterShot(actor,listener,angle*Math.PI/180,[],aspect);
 const camera=new PerspectiveCamera(38,aspect,.1,10000);
 camera.position.set(...framing.position);camera.lookAt(...framing.target);camera.updateMatrixWorld();
 for (const person of [actor,listener]) for (const height of [0,20,25]) {
  const projected=new Vector3(person.position[0],height,person.position[1]).project(camera);
  assert.ok(Math.abs(projected.x)<.85&&Math.abs(projected.y)<.85,`Both cast members must fit portrait/landscape: ${aspect}/${angle}/${projected.toArray()}`);
 }
}
console.log('PASS cinematic framing keeps main character central, listener space, finite deterministic shot and clear sightline');
for(const aspect of [.4,390/844,1,1.6,2])for(let heading=0;heading<Math.PI*2;heading+=.2){
 const rider={...actor,bicycle:{radius:9.2,distance:1,yaw:heading}};
 const frame=characterShot(rider,undefined,heading,[],aspect),camera=new PerspectiveCamera(38,aspect,.1,10000);
 camera.position.set(...frame.position);camera.lookAt(...frame.target);camera.updateMatrixWorld();
 for(const x of [-9.2,9.2])for(const z of [-9.2,9.2])for(const y of [0,25]){
  const p=new Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<.85&&Math.abs(p.y)<.85,'Full bicycle and rider must fit the tracking shot');
 }
}
console.log('PASS full-bicycle portrait/landscape camera envelope');
