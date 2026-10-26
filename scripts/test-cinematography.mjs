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
