import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { loadLocalGLTF } from './load-local-gltf.mjs';
import { AssetLibrary } from '../components/city/three/assets.ts';
import { createModelActors } from '../components/city/three/model-actors.ts';
import {CORE_MODELS,CITIZEN_MODELS,CITIZEN_FALLBACK,residentModel} from '../lib/city/character-models.ts';
import {RiggedAvatar} from '../components/city/three/rigged-avatar.ts';
import { groundElevation } from '../lib/city/ground.ts';
import { BICYCLE_RADIUS } from '../lib/city/bicycle.ts';
import { initializeLiving } from '../lib/living/engine.ts';
import { seed } from '../lib/world.ts';
const catalog=JSON.parse(readFileSync('public/models/supplied/catalog.json','utf8'));
const library=new AssetLibrary();
for(const id of new Set([...Object.values(CORE_MODELS), residentModel('doctor'),residentModel('vendor','neighbor-4')])) {
  const asset=catalog.assets.find(a=>a.id===id); assert(asset,`Approved model ${id}`);
  library.loaded.set(id,await loadLocalGLTF(asset.url));
}
const sourceBefore=JSON.stringify([...library.loaded].map(([id,g])=>[id,g.scene.toJSON()]));
const scene=new THREE.Scene(), models=createModelActors(scene,library);
const world={...structuredClone(seed),living:initializeLiving(Date.parse('2026-10-27T05:00:00Z'))};
const saved=JSON.stringify(world),pos=[-300,-700],floor=groundElevation(...pos);
let previousLeg,moved=false,maxRadius=0,maxGroundError=0;
const actor=(id,kind)=>({id,name:id,kind,activity:'',from:'Công viên',location:'Công viên',position:pos,path:[pos],walking:kind==='walk',progress:1,source:'plan'});
for(let n=0;n<180;n++) {
  const kind=n<60?'walk':n<120?'social':'cycle';
  const actors=Object.keys(CORE_MODELS).map(id=>({...actor(id,kind),position:[pos[0]+n*.1,pos[1]],bicycle:kind==='cycle'?{distance:n-120,radius:BICYCLE_RADIUS,yaw:0}:undefined}));
  const social=kind==='social'?new Map([['an',{speaking:true}],['binh',{speaking:false}]]):new Map();
  models.draw(world,actors,social,new Map(),n/10);
  const snapshots=models.snapshots();
  assert(Object.values(snapshots).every(s=>s.skinned&&s.position.every(Number.isFinite)));
  if(n<60){if(previousLeg&&JSON.stringify(previousLeg)!==JSON.stringify(snapshots.an.leg))moved=true;previousLeg=snapshots.an.leg;}
  if(n===119){assert.equal(snapshots.an.resolvedClip,'Talk');assert.equal(snapshots.binh.resolvedClip,'Listen');}
  if(kind==='cycle')assert.equal(snapshots.an.resolvedClip,'Ride');
  for(const id of Object.keys(CORE_MODELS)) {
    const actualPos=actors.find(a=>a.id===id).position;
    const root=scene.children.find(o=>{let match=false;o.traverse(c=>{if(c.userData.actorId===id)match=true;});return match;});
    const bounds=new THREE.Box3().setFromObject(root,true),head=models.head(id);
    assert(models.height(id)>16&&models.height(id)<=17.5,`Civilian height stays at human scale: ${models.height(id)}`);
    assert.equal(root.scale.x,root.scale.y,'Preserve authored proportions instead of stretching narrow heads');
    assert.equal(root.scale.z,root.scale.y);
    assert([...bounds.min,...bounds.max,...head].every(Number.isFinite));
    assert(head.y<=bounds.max.y+.01&&head.y>=bounds.max.y-.6,`Label anchor follows visible head: ${JSON.stringify({id,n,kind,head:head.toArray(),min:bounds.min.toArray(),max:bounds.max.toArray()})}`);
    if(kind==='walk')maxGroundError=Math.max(maxGroundError,Math.abs(bounds.min.y-floor));
    root.traverse(mesh=>{if(!mesh.isMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i++) {
      const vertex=mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
      maxRadius=Math.max(maxRadius,Math.hypot(vertex.x-actualPos[0],vertex.z-actualPos[1]));
      assert(Math.hypot(vertex.x-actualPos[0],vertex.z-actualPos[1])<=(kind==='cycle'?BICYCLE_RADIUS:4.8)+.001,`Visible body must fit navigation disc: ${id}/${kind}/${n}: ${Math.hypot(vertex.x-actualPos[0],vertex.z-actualPos[1])}`);
    }});
  }
}
assert(moved,'Actual bones must move while walking');
assert(maxGroundError<.35,`Feet must stay on ground: ${maxGroundError}`);
const frozen=models.snapshots();models.draw({...world,paused:true},[actor('an','jump')],new Map(),new Map(),90);assert.deepEqual(models.snapshots(),frozen);
const doctor=world.living.residents.find(r=>r.roleId==='doctor'),vendor=world.living.residents.find(r=>r.roleId==='vendor');
models.prepare(world,doctor.id);assert(models.ids.has(doctor.id));assert.equal(models.ids.size,4);
models.prepare(world,vendor.id);assert(models.ids.has(vendor.id));assert(!models.ids.has(doctor.id));assert.equal(models.ids.size,4);
models.prepare(world,'an');assert.equal(models.ids.size,3);
assert.equal(JSON.stringify(world),saved,'Rendering preserves every snapshot field');
assert.equal(JSON.stringify([...library.loaded].map(([id,g])=>[id,g.scene.toJSON()])),sourceBefore,'Instances never edit cached source rigs');
// The near cast has diverse models and a hard ceiling, independent of population.
for(const id of CITIZEN_MODELS)if(!library.get(id))library.loaded.set(id,await loadLocalGLTF(catalog.assets.find(a=>a.id===id).url));
const neighbors=world.living.residents.slice(0,20).map(r=>({...actor(r.id,'walk'),position:[0,0]}));
models.prepare(world,neighbors[0].id,neighbors,[neighbors[1].id]);assert.equal(models.ids.size,8);
assert(new Set(Object.values(models.snapshots()).map(a=>a.modelId)).size>=4,'Near residents need actual mesh diversity');
assert(new Set(world.living.residents.map(r=>residentModel(r.roleId,r.id))).size>=4,'Existing population uses diverse residents');
assert.equal(new Set(Array.from({length:1000},(_,i)=>residentModel('vendor','fixture-'+i))).size,5,'All five resident styles are reachable');
models.prepare(world,'an');assert.equal(models.ids.size,3);
models.dispose();assert.equal(scene.children.length,0,'All actors/props/bikes are removed on unmount');
// Timed-out primary loads replace a temporary modern rig once ready, without remount.
const cache=new Map([[CITIZEN_FALLBACK,library.get(CITIZEN_FALLBACK)]]),requests=[];
const delayed={get:id=>cache.get(id),failures:new Set(),load:async id=>{requests.push(id);throw Error('synthetic delayed load');}};
const late=createModelActors(scene,delayed);assert.equal(late.snapshots().an.modelId,CITIZEN_FALLBACK);
cache.set(CORE_MODELS.an,library.get(CORE_MODELS.an));late.prepare(world,'an');assert.equal(late.snapshots().an.modelId,CORE_MODELS.an);
assert(Object.values(late.snapshots()).every(a=>a.profile==='xom-supplied-v1'));assert(requests.every(id=>id.startsWith('supplied/')));late.dispose();
// Every style stays in the unchanged walking clearance at actual gait poses.
let gaitRadius=0;
for(const asset of catalog.assets.filter(a=>a.kind==='human')){const source=await loadLocalGLTF(asset.url),rig=new RiggedAvatar(source);for(const [ci,clip] of ['Idle','Walk','Run','Talk','Listen','Think','Nod','PickUp','Sit'].entries())for(let n=0;n<60;n++){
 const duration=source.animations.find(c=>c.name===clip).duration;rig.pose(clip,n/60*duration,n/60+10*ci,[0,0],0,0);
 rig.model.traverse(m=>{if(!m.isMesh)return;for(let i=0;i<m.geometry.attributes.position.count;i++){const p=m.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(m.matrixWorld),radius=Math.hypot(p.x,p.z);gaitRadius=Math.max(gaitRadius,radius);assert(radius<=4.8+.001,`${asset.id}/${clip} outside navigation radius: ${radius}`);}});
}rig.dispose();}library.dispose();
console.log(JSON.stringify({suite:'city-rigs',coreModels:3,frames:180,maxRadius,maxGroundError,actualTalkListen:true,focusedNpcBudget:5,lateLoadUpgrade:true,styles:5,gaitRadius,headSurface:true,pause:true,sourceImmutable:true,worldWrites:false,disposed:true}));
