import assert from 'node:assert/strict';
import {characterShot,cameraRayBlocked} from '../lib/city/cinematography.ts';
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

const crown={x:0,z:35,width:34,depth:24,minY:26,maxY:57};
assert(cameraRayBlocked(crown,[0,4,0],[0,45,80]),'Crown obstructs a raised camera');
assert(!cameraRayBlocked(crown,[0,4,0],[0,20,80]),'A low sightline passes under the crown');
assert(!cameraRayBlocked(crown,[30,4,0],[30,45,80]),'Parallel ray outside crown stays clear');
assert(cameraRayBlocked(crown,[0,30,35],[0,30,80]),'Camera inside a crown is obstructed');
for(const aspect of [.4,390/844,1.6]){
 const dog={id:'cun',position:[22,7]},before=JSON.stringify([actor,dog,crown]);
 const shot=characterShot(actor,dog,0,[],aspect,17.5,{boxes:[crown],peerHeight:5});
 for(const [subject,height] of [[actor,17.5],[dog,5]])assert(!cameraRayBlocked(crown,[subject.position[0],height*.8,subject.position[1]],shot.position),'Both subjects have a clear crown sightline');
 assert.equal(JSON.stringify([actor,dog,crown]),before,'Framing never alters actors or scenery');
}
// A wall can block only the listener; both subjects must be checked.
const listenerWall={x:14,z:22,width:10,depth:8};
const pairShot=characterShot(actor,peer,0,[listenerWall]);
for(const subject of [actor,peer])assert(!segmentHits(listenerWall,subject.position,[pairShot.position[0],pairShot.position[2]],2));
console.log('PASS three-dimensional foliage clearance for both tracked subjects, low camera option and no world mutation');

const raised=characterShot(actor,{id:'cun',position:[22,7]},0,[],.5,17.5,{boxes:[{...crown,minY:28,maxY:59}],peerHeight:5,elevation:()=>2});
assert(!cameraRayBlocked({...crown,minY:28,maxY:59},[22,6,7],raised.position),'Raised terrain uses the same pet sight height as the renderer');
