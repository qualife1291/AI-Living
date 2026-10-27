import assert from 'node:assert/strict';
import { Scene, PerspectiveCamera, Matrix4, Vector3 } from 'three';
import { HumanMotion } from '../components/city/three/humans.ts';
import { createPeople } from '../components/city/three/people.ts';
import { streetModel } from '../components/city/three/streetscape.ts';
import { streetProps } from '../lib/city/scenery.ts';
import { seed } from '../lib/world.ts';
import { initializeLiving } from '../lib/living/engine.ts';
import { defaultAppearance } from '../lib/city/appearance.ts';

const actor={id:'an',name:'An',position:[0,0],path:[[0,0],[100,0]],from:'Sân chung',location:'Sân chung',activity:'Đi dạo',kind:'social',walking:true,transport:'walk',progress:0,source:'routine'};
const motion=new HumanMotion(), poses=new Map();let old;
for(let frame=0;frame<600;frame++) {
 const walking=frame<300, position=[Math.min(frame,299)*16/60,0];
 const state=motion.frame([{...actor,position,walking}],poses,frame/60,1/60,false).get('an');
 assert.ok(Object.values(state.pose).every(Number.isFinite));
 if(old)for(const key of ['leftArm','rightArm','leftLeg','rightLeg','leftKnee','rightKnee'])assert.ok(Math.abs(state.pose[key]-old.pose[key])<.15,`${key} jerked`);
 old=state;
}
assert.ok(Math.abs(old.pose.leftLeg)<1e-8&&Math.abs(old.pose.rightLeg)<1e-8,'Settles after actual travel stops');
const frozen=motion.frame([actor],poses,10,1/60,true).get('an');
for(let n=0;n<10;n++)assert.deepEqual(motion.frame([actor],poses,10+n,1/60,true).get('an'),frozen,'Pause freezes all joints and heading');
const reordered=new HumanMotion(), other={...actor,id:'binh'};
const a=reordered.frame([actor,other],poses,0,0,false);
const b=reordered.frame([other,actor],poses,0,0,false);assert.deepEqual(a.get('an'),b.get('an'),'Identity is independent of array order');

const scene=new Scene(), people=createPeople(scene,72), world=structuredClone(seed);world.living=initializeLiving(Date.now());
const cast=Array.from({length:72},(_,i)=>({...actor,id:`person-${i}`,position:[i*20,0],walking:false,kind:i%4===0?'read':i%4===1?'eat':i%4===2?'garden':'work'}));
world.living.appearances=Object.fromEntries(cast.map(p=>[p.id,{...defaultAppearance(p.id),theme:'chef',face:'glasses'}]));
const camera=new PerspectiveCamera();camera.position.set(600,50,100);
const snapshot=JSON.stringify(world);
for(let frame=0;frame<120;frame++)people.draw(world,cast,poses,frame/60,1/60,camera,'person-0');
assert.equal(people.stats().batches,6,'All bodies, faces and held props use six shared geometry batches');
assert.equal(JSON.stringify(world),snapshot,'Visual details cannot write learning/history');
const matrix=new Matrix4();let instanceCount=0;
for(const mesh of scene.children) {
 assert.equal(mesh.userData.ids.length,mesh.count,'Every visible part remains selectable');
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));assert.ok(cast.some(a=>a.id===mesh.userData.ids[i]));instanceCount++;}
}
const limbs=scene.children.find(mesh=>mesh.geometry===people.geometry.limb);
assert.equal(limbs.count,cast.length*9);
for(let person=0;person<cast.length;person++)for(const [upper,lower]of [[1,2],[3,4],[5,6],[7,8]]) {
 const top=new Vector3(0,-.5,0),bottom=new Vector3(0,.5,0);
 limbs.getMatrixAt(person*9+upper,matrix);top.applyMatrix4(matrix);
 limbs.getMatrixAt(person*9+lower,matrix);bottom.applyMatrix4(matrix);
 assert.ok(top.distanceTo(bottom)<.3,'Shoulder/elbow/knee segments stay connected');
}
assert.equal(streetProps.length,66);assert.equal(new Set(streetProps.map(p=>p.kind)).size,7);
let detailParts=0;
for(const prop of streetProps)for(const part of streetModel(prop)) {
 assert.ok([part.x,part.y,part.z,part.w,part.h,part.d].every(Number.isFinite));
 assert.ok(part.w>0&&part.h>0&&part.d>0);
 const transform=new Matrix4().makeRotationY(part.angle??0).multiply(new Matrix4().makeRotationZ(part.tilt??0));
 for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]) {
  const corner=new Vector3(x*part.w,y*part.h,z*part.d).applyMatrix4(transform);
  assert.ok(Math.abs(part.x+corner.x-prop.x)<=prop.width/2+1e-6,`${prop.id}/${part.shape} exits x reservation`);
  assert.ok(Math.abs(part.z+corner.z-prop.z)<=prop.depth/2+1e-6,`${prop.id}/${part.shape} exits z reservation`);
 }
 detailParts++;
}
for(const mesh of scene.children)mesh.material.dispose();for(const geometry of Object.values(people.geometry))geometry.dispose();
console.log(JSON.stringify({suite:'visual-upgrade',humanBatches:6,stressActors:72,instances:instanceCount,motionFrames:600,props:66,propTypes:7,detailParts,pause:'frozen',joints:'connected',provenance:'preserved'}));
