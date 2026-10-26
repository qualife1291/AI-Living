import assert from 'node:assert/strict';
import {characterShot} from '../lib/city/cinematography.ts';
import {segmentHits} from '../lib/city/footprints.ts';
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
console.log('PASS cinematic framing keeps main character central, listener space, finite deterministic shot and clear sightline');
