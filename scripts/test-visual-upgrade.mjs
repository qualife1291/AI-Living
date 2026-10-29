import assert from 'node:assert/strict';
import { Scene, PerspectiveCamera, Matrix4, Vector3 } from 'three';
import { HumanMotion } from '../components/city/three/humans.ts';
import { createPeople } from '../components/city/three/people.ts';
import { createAmbience } from '../components/city/three/ambience.ts';
// Native rigs/felines are covered by test-neighborhood; keep failure silhouettes bounded too.
import { createFauna } from '../components/city/three/fauna-fallback.ts';
import { streetModel } from '../components/city/three/streetscape.ts';
import { streetProps } from '../lib/city/scenery.ts';
import { seed } from '../lib/world.ts';
import { initializeLiving } from '../lib/living/engine.ts';
import { defaultAppearance } from '../lib/city/appearance.ts';
import { WalkDirector, walkable, PERSONAL_SPACE } from '../lib/city/walkability.ts';

const actor={id:'an',name:'An',position:[0,0],path:[[0,0],[100,0]],from:'Sân chung',location:'Sân chung',activity:'Đi dạo',kind:'social',walking:true,transport:'walk',progress:0,source:'routine'};
const motion=new HumanMotion(), poses=new Map();let old;
for(let frame=0;frame<600;frame++) {
 const walking=frame<300, position=[Math.min(frame,299)*16/60,0];
 const state=motion.frame([{...actor,position,walking}],poses,frame/60,1/60,false).get('an');
 assert.ok(Object.values(state).every(Number.isFinite));
 if(old)assert(Math.abs(Math.atan2(Math.sin(state.yaw-old.yaw),Math.cos(state.yaw-old.yaw)))<.15,'Heading must turn smoothly');
 old=state;
}
assert.ok(old.weight<1e-8,'Settles after actual travel stops');
const frozen=motion.frame([actor],poses,10,1/60,true).get('an');
for(let n=0;n<10;n++)assert.deepEqual(motion.frame([actor],poses,10+n,1/60,true).get('an'),frozen,'Pause freezes all joints and heading');
const reordered=new HumanMotion(), other={...actor,id:'binh'};
const a=reordered.frame([actor,other],poses,0,0,false);
const b=reordered.frame([other,actor],poses,0,0,false);assert.deepEqual(a.get('an'),b.get('an'),'Identity is independent of array order');

const {loadCivilianLibrary}=await import('./load-civilian-library.mjs');
const library=await loadCivilianLibrary();
const scene=new Scene(), people=createPeople(scene,72,library), world=structuredClone(seed);world.living=initializeLiving(Date.now());
const cast=Array.from({length:72},(_,i)=>({...actor,id:`person-${i}`,position:[i%9*20,Math.floor(i/9)*20],walking:false,kind:i%4===0?'read':i%4===1?'eat':i%4===2?'garden':'work'}));
world.living.appearances=Object.fromEntries(cast.map(p=>[p.id,{...defaultAppearance(p.id),theme:'chef',face:'glasses'}]));
const camera=new PerspectiveCamera();camera.position.set(80,50,170);
const snapshot=JSON.stringify(world);
people.draw(world,cast,poses,0,0,camera,'person-0');assert.equal(people.stats().instances,72,'No actor disappears while the shared action atlas warms');
for(let frame=0;frame<120;frame++)people.draw(world,cast,poses,frame/60,1/60,camera,'person-0');
assert(people.stats().batches<=20,'72 actors share style/action batches instead of skeletal controllers');
assert.equal(people.stats().instances,72);assert.equal(people.stats().modelIds.length,5);
assert.equal(JSON.stringify(world),snapshot,'Visual details cannot write learning/history');
const matrix=new Matrix4();let instanceCount=0;
for(const mesh of scene.children.filter(o=>o.isInstancedMesh)) {
 assert.equal(mesh.userData.ids.length,mesh.count,'Every visible body remains selectable');
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));assert.ok(cast.some(a=>a.id===mesh.userData.ids[i]));instanceCount++;}
 assert(mesh.userData.modelId.startsWith('supplied/'),'No old procedural human body at any distance');
 assert(mesh.geometry.getAttribute('skinIndex'),'Crowd preserves the reviewed civilian topology');
}
assert.equal(instanceCount,72);
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
const effectsScene=new Scene(), effects=createAmbience(effectsScene);
effects.update(12.3);
const drops=effectsScene.children[0].geometry.attributes.position;
const clouds=effectsScene.children[1].instanceMatrix;
const still={drops:[...drops.array],clouds:[...clouds.array],version:drops.version};
effects.update(12.3);
assert.deepEqual([...drops.array],still.drops);assert.deepEqual([...clouds.array],still.clouds);assert.equal(drops.version,still.version,'Paused effects do not upload buffers');
effects.update(12.4);assert.notDeepEqual([...drops.array],still.drops);assert.ok([...drops.array,...clouds.array].every(Number.isFinite));
assert.ok(effects.stats.droplets<=512,'Bounded particle pool');
for(const mesh of effectsScene.children){mesh.geometry.dispose();mesh.material.dispose();}
const animalScene=new Scene(), fauna=createFauna(animalScene,people.geometry);
const animals=['cat','dog','bird'].map((species,i)=>({...actor,id:`pet-${i}`,species,position:[2650,1660],path:[[2650,1660],[2700,1700]]}));
const walker=new WalkDirector(), humans=[{...actor,position:[2650,1660],path:[[2650,1660],[2700,1700]]}];
let safe;
for(let frame=0;frame<=1800;frame++) {
 safe=walker.frame(world,humans,frame/30,[],animals);
 for(const a of safe)assert.ok(walkable(a.position));
 for(let i=0;i<safe.length;i++)for(let j=i+1;j<safe.length;j++)assert.ok(Math.hypot(safe[i].position[0]-safe[j].position[0],safe[i].position[1]-safe[j].position[1])>=PERSONAL_SPACE-1e-6,'Pets and people cannot share a ground position');
}
assert.ok(safe.every(a=>a.stationaryFor>2&&Math.hypot(a.position[0]-2700,a.position[1]-1700)<45),'Mixed people/animals reach separate resting goals');
const pets=animals.map(a=>({...a,...safe.find(s=>s.id===a.id)}));
const flyingPets=pets.map(p=>p.species==='bird'?{...p,walking:true,position:[p.position[0]+1,p.position[1]]}:p);
fauna.draw(pets,60,1/30,false);fauna.draw(flyingPets,60.1,.1,false);
for(const mesh of animalScene.children) {
 mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox;
 for(let i=0;i<mesh.count;i++) {
  mesh.getMatrixAt(i,matrix);const pet=flyingPets.find(a=>a.id===mesh.userData.animalIds[i]);
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]) {
   const point=new Vector3(x,y,z).applyMatrix4(matrix);assert.ok(Math.hypot(point.x-pet.position[0],point.z-pet.position[1])<=4.8,`${pet.species} model exits the reserved pedestrian disc`);
  }
 }
}
const bodies=scene.children.filter(m=>m.isInstancedMesh),fineTriangles=bodies.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3*m.count,0);
assert(fineTriangles<=72*2600,'Full reviewed crowd topology remains bounded');
const identities=bodies.map(m=>[...m.userData.ids]);people.setQuality('balanced');
assert.deepEqual(bodies.map(m=>m.userData.ids),identities,'Quality never changes body identity/topology');
const stillAnimals=animalScene.children.map(mesh=>[...mesh.instanceMatrix.array]);
fauna.draw(flyingPets,60.1,.1,true);assert.deepEqual(animalScene.children.map(mesh=>[...mesh.instanceMatrix.array]),stillAnimals,'Animal body/tail/wings freeze with simulation pause');
assert.ok(animalScene.children.every(mesh=>mesh.instanceMatrix.array.every(Number.isFinite)));
assert.equal(fauna.stats.policies,3,'A visible flock must not invent additional learned agents');
const animalMaterials=new Set(animalScene.children.map(mesh=>mesh.material));for(const mat of animalMaterials)mat.dispose();
const sharedGeometry=new Set(Object.values(people.geometry));for(const mesh of animalScene.children)if(!sharedGeometry.has(mesh.geometry))mesh.geometry.dispose();
const humanBatches=people.stats().batches;people.dispose();library.dispose();for(const geometry of Object.values(people.geometry))geometry.dispose();
console.log(JSON.stringify({suite:'visual-upgrade',humanBatches,stressActors:72,instances:instanceCount,motionFrames:600,mixedAnimalHumanFrames:1800,animalPolicies:3,props:66,propTypes:7,detailParts,pause:'frozen',joints:'connected',provenance:'preserved'}));
