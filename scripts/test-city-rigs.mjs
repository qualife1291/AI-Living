import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { loadLocalGLTF } from './load-local-gltf.mjs';
import { AssetLibrary } from '../components/city/three/assets.ts';
import { createModelActors } from '../components/city/three/model-actors.ts';
import { CORE_MODELS, residentModel } from '../lib/city/character-models.ts';
import { groundElevation } from '../lib/city/ground.ts';
import { BICYCLE_RADIUS } from '../lib/city/bicycle.ts';
import { initializeLiving } from '../lib/living/engine.ts';
import { seed } from '../lib/world.ts';
const catalog=JSON.parse(readFileSync('public/models/resources/catalog.json','utf8'));
const library=new AssetLibrary();
for(const id of new Set([...Object.values(CORE_MODELS), residentModel('doctor'),residentModel('vendor')])) {
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
  if(kind==='cycle')assert.equal(snapshots.an.resolvedClip,'Sit');
  for(const id of Object.keys(CORE_MODELS)) {
    const actualPos=actors.find(a=>a.id===id).position;
    const root=scene.children.find(o=>{let match=false;o.traverse(c=>{if(c.userData.actorId===id)match=true;});return match;});
    const bounds=new THREE.Box3().setFromObject(root,true),head=models.head(id);
    assert.equal(root.scale.x,root.scale.y,'Preserve authored proportions instead of stretching narrow heads');
    assert.equal(root.scale.z,root.scale.y);
    assert([...bounds.min,...bounds.max,...head].every(Number.isFinite));
    assert(head.y<=bounds.max.y+.01&&head.y>=bounds.max.y-.6,'Label anchor follows the visible head');
    if(kind==='walk')maxGroundError=Math.max(maxGroundError,Math.abs(bounds.min.y-floor));
    root.traverse(mesh=>{if(!mesh.isMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i++) {
      const vertex=mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
      maxRadius=Math.max(maxRadius,Math.hypot(vertex.x-actualPos[0],vertex.z-actualPos[1]));
      assert(Math.hypot(vertex.x-actualPos[0],vertex.z-actualPos[1])<=(kind==='cycle'?BICYCLE_RADIUS:4.8)+.001,'Visible body must fit the navigation disc');
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
models.dispose();assert.equal(scene.children.length,0,'All actors/props/bikes are removed on unmount');library.dispose();
console.log(JSON.stringify({suite:'city-rigs',coreModels:3,frames:180,maxRadius,maxGroundError,actualTalkListen:true,focusedNpcBudget:1,headSurface:true,pause:true,sourceImmutable:true,worldWrites:false,disposed:true}));
