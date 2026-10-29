import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {seed} from '../lib/world.ts';
import {animalsAt,animalRoster} from '../lib/life.ts';
import {initializeLiving,planLivingTurn,population} from '../lib/living/engine.ts';
import {bootstrapShared,replayShared} from '../lib/living/shared-ground.ts';
import {randomUUID} from 'node:crypto';
import {updateAnimalLearning,settleAnimalLearning} from '../lib/living/animal-learning.ts';
import {neighborhoodProps} from '../lib/city/neighborhood-props.ts';
import {visibleHumans} from '../lib/city/actor-budget.ts';
import {AssetLibrary,setAssetTransform} from '../components/city/three/assets.ts';
import {AnimalRig} from '../components/city/three/animal-rig.ts';
import {createFauna} from '../components/city/three/fauna-models.ts';
import {createSharedPrimitives} from '../components/city/three/humans.ts';
import {loadLocalGLTF} from './load-local-gltf.mjs';
const now=Date.parse('2026-10-29T02:00:00Z'),context={date:'2026-10-29',hour:9,weekday:4,timezone:'Asia/Ho_Chi_Minh',fetchedAt:new Date(now).toISOString(),weather:{status:'unavailable',source:'fixture',observedAt:null,temperature:null,humidity:null,precipitation:null,code:null,windKph:null},calendar:{weekend:false,holidays:[],source:'fixture',status:'unavailable',coverage:'fixture'},traffic:{status:'unavailable',label:'fixture'},festivals:{status:'unavailable',label:'fixture'}};
const original={...structuredClone(seed),born:new Date(now).toISOString(),living:initializeLiving(now),clock:{scale:1,pausedAt:null,pausedMs:0,anchors:[{realMs:now,simMs:0,scale:1}]}};
const initial=JSON.stringify(original);assert.equal(original.living.residents.length,24);assert.equal(animalsAt(original,now).length,3,'Frozen initialization/studies keep their old roster');
let world=planLivingTurn(original,context,now).world;
assert.equal(JSON.stringify(original),initial);assert.equal(world.born,original.born);assert.equal(world.living.residents.length,48);assert.equal(animalRoster(world).length,9);assert.deepEqual(world.living.petOwners,original.living.petOwners);
for(const old of original.living.residents){const next=world.living.residents.find(r=>r.id===old.id);for(const key of ['id','name','identity','home','memories','arrivedOn'])assert.deepEqual(next[key],old[key]);}
const custom=structuredClone(original);custom.living.catalog.maxPopulation=30;custom.living.catalog.initialPopulation=25;assert.equal(planLivingTurn(custom,context,now).world.living.residents.length,25,'Explicit owner population settings survive');
const state=structuredClone(world.living);state.petOwners={};const local={...world,living:state};const pending=Object.fromEntries(Object.entries(state.animalLearning).map(([id,p])=>[id,JSON.stringify(p.pending)]));
updateAnimalLearning(local,state,context,now+10000);
for(const [id,p] of Object.entries(state.animalLearning)){assert.equal(JSON.stringify(p.pending),pending[id],'A short pulse cannot replace an unfinished animal plan');assert.equal(p.samples,0);}
assert.equal(settleAnimalLearning(local,state,now+179999),0);assert.equal(settleAnimalLearning(local,state,now+180000),9);assert.equal(settleAnimalLearning(local,state,now+180001),0,'Completed plans settle exactly once');
const interrupted=structuredClone(world.living);interrupted.petOwners={};interrupted.animalLearning.cun.plan.steps[0].activity='Different intent';const before=interrupted.animalLearning.cun.samples;
settleAnimalLearning({...world,living:interrupted},interrupted,now+180000);assert.equal(interrupted.animalLearning.cun.samples,before);assert(interrupted.animalLearning.cun.pending.cancelled);
const rainy=structuredClone(world.living);rainy.petOwners={};updateAnimalLearning({...world,living:rainy},rainy,{...context,weather:{...context.weather,status:'fresh',precipitation:2}},now+10000);assert(Object.values(rainy.animalLearning).every(p=>p.pending.action==='shelter'&&p.samples===0));
const paused=structuredClone(world);paused.paused=true;paused.clock.pausedAt=now;assert.equal(settleAnimalLearning(paused,paused.living,now+3600000),0);
for(let i=1;i<=16;i++){const at=now+i*900000;world=planLivingTurn(world,{...context,hour:9+i*.25,fetchedAt:new Date(at).toISOString()},at).world;}
const humans=Object.values(world.living.learning),trainedAnimals=Object.values(world.living.animalLearning);
assert.equal(humans.length,51);assert(humans.every(p=>p.samples>0),'All expanded humans must earn completed simulation samples');assert.equal(trainedAnimals.length,9);assert(trainedAnimals.every(p=>p.samples>0));
const dense=structuredClone(world);dense.living.residents=population(dense.living,'2030-01-01');
const source={seq:1,revision:0,capturedAt:now+14400000,raw:JSON.stringify(dense)},shared=await bootstrapShared(source,randomUUID());
assert.equal(shared.frames[0].poses.length,252);assert.equal((await replayShared(shared,source,[],source.capturedAt+100)).state.frames.at(-1).poses.length,252,'Full population includes every new animal without crossing the ground schema cap');
const many=Array.from({length:243},(_,i)=>({id:i<3?['an','binh','chi'][i]:'neighbor-'+(i-2)}));
const shown=visibleHumans(many,72,['an','binh','chi','neighbor-240','neighbor-239']);assert.equal(shown.length,72);assert(shown.some(a=>a.id==='neighbor-240')&&shown.some(a=>a.id==='neighbor-239'));
const catalog=JSON.parse(readFileSync('public/models/supplied/props/catalog.json')),library=new AssetLibrary();
for(const item of catalog.assets)library.loaded.set(item.id,await loadLocalGLTF(item.url));
library.loaded.set('suburban/tree-large',await loadLocalGLTF('/models/kenney/suburban/tree-large.glb'));
const placements=neighborhoodProps(new Set(library.loaded.keys()));assert(placements.plantCount>100&&placements.placements.length>150);assert(placements.tables&&placements.planters&&placements.trees);assert(neighborhoodProps(new Set()).placements.length===0);
const dummy=new THREE.Object3D();for(const p of placements.placements){const model=library.compile(p.id);assert(model);setAssetTransform(dummy,model.size,p);const box=model.geometry.boundingBox.clone().applyMatrix4(dummy.matrix),size=box.getSize(new THREE.Vector3());assert(size.x<=p.width+.001&&size.z<=p.depth+.001&&size.y<=p.height+.001);assert(Math.abs(box.min.y-p.y)<.001);}
const lodScene=new THREE.Scene(),tree=placements.placements.find(p=>p.id==='suburban/tree-large'),update=library.addWorldLOD(lodScene,[tree]),camera=new THREE.PerspectiveCamera();camera.position.set(tree.x,tree.y+50,tree.z);update(camera);assert.equal(lodScene.children[0].count,1);camera.position.y=2000;update(camera);assert.equal(lodScene.children[0].count,0);assert.equal(lodScene.children.at(-1).count,1,'Vertical zoom keeps the distant canopy');camera.position.y=tree.y+50;update(camera);assert.equal(lodScene.children[0].count,1,'Native detail returns on zoom in');
const animalModels=['gobkit-animal/corgi','gobkit-animal007/quail','gobkit-animal007/chick'];let maxRadius=0;
for(const id of animalModels){const resource=JSON.parse(readFileSync('public/models/resources/catalog.json')).assets.find(a=>a.id===id),source=await loadLocalGLTF(resource.url);library.loaded.set(id,source);const rig=new AnimalRig(source,id.includes('corgi')?5.2:3.3);
 for(let i=0;i<24;i++){rig.pose(i>11,i/12,[0,0],i/24,.7);const box=new THREE.Box3().setFromObject(rig.group,true),size=box.getSize(new THREE.Vector3());maxRadius=Math.max(maxRadius,Math.hypot(size.x/2,size.z/2));assert(Math.abs(box.min.y-.7)<.001);assert(Math.hypot(size.x/2,size.z/2)<=4.8,'Real animated model fits the accepted navigation radius');}rig.dispose();}
const scene=new THREE.Scene(),fauna=createFauna(scene,createSharedPrimitives(),library),animals=animalsAt(world,now+14400000);fauna.draw(animals,1,.016,false);assert.equal(Object.keys(fauna.snapshots()).length,8);const frozen=JSON.stringify(fauna.snapshots());fauna.draw(animals.map(a=>({...a,position:[a.position[0]+10,a.position[1]]})),1,.016,true);assert.equal(JSON.stringify(fauna.snapshots()),frozen);fauna.dispose();assert.equal(Object.keys(fauna.snapshots()).length,0);library.dispose();
console.log(JSON.stringify({suite:'neighborhood',legacyInitializationStable:true,residents:48,humanModels:humans.length,trainedHumans:humans.filter(p=>p.samples>0).length,animalPolicies:9,trainedAnimals:trainedAnimals.filter(p=>p.samples>0).length,oldIdentityHomeMemoryPetOwnersPreserved:true,slowClockPendingRetained:true,fullDurationAndExactlyOnce:true,cancelledPlanNoReward:true,rainShelter:true,pauseNoReward:true,selectedDenseTailRetained:true,placements:placements.placements.length,newPlants:placements.plantCount,reviewedProps:catalog.assets.length,actualAnimatedAnimalMaxRadius:maxRadius,pausedModelsFreeze:true,physicalFootprintsUnchanged:true,modelPromotion:false,productionAccess:false}));
