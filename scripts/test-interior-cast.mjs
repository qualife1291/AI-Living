import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {AssetLibrary,setAssetTransform} from '../components/city/three/assets.ts';
import {createInteriorCast,INTERIOR_CAST_LIMIT,interiorSlot} from '../components/city/three/interior-cast.ts';
import {batchInteriorRoom,createInteriorFurniture} from '../components/city/three/interior-furniture.ts';
import {CORE_MODELS,residentModel,CITIZEN_MODELS} from '../lib/city/character-models.ts';
import {INTERIOR_ACTIONS} from '../lib/city/interior-actions.ts';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {loadLocalGLTF} from './load-local-gltf.mjs';
const world=structuredClone(seed);world.living=initializeLiving(Date.now());
const raw=JSON.stringify(world),scene=new THREE.Scene(),library=new AssetLibrary();
const modelCatalog=JSON.parse(readFileSync('public/models/supplied/catalog.json')).assets;
const props=JSON.parse(readFileSync('public/models/supplied/props/catalog.json')).assets;
const sources=new Map();for(const id of CITIZEN_MODELS)sources.set(id,await loadLocalGLTF(modelCatalog.find(a=>a.id===id).url));
library.load=async id=>{const source=library.get(id);if(!source)throw Error('Intentional delayed fixture');return source;};
const actors=['an','binh','chi',...world.living.residents.map(r=>r.id)].map(id=>({id,kind:'read',activity:'Đọc sách',walking:false,location:'Thư viện'}));
const cast=createInteriorCast(scene,library);
cast.draw(world,actors,1,0);assert.equal(cast.snapshots().length,0,'Loading cannot silently restore old block characters');
for(const [id,source] of sources)library.loaded.set(id,source);
cast.draw(world,actors,1,0,'neighbor-24');let snapshots=cast.snapshots();
assert.equal(snapshots.length,INTERIOR_CAST_LIMIT);assert(snapshots.some(a=>a.id==='neighbor-24'),'Selected tail is preserved');
for(const a of snapshots){assert.equal(a.modelId,CORE_MODELS[a.id]??residentModel(world.living.residents.find(r=>r.id===a.id).roleId,a.id));assert(a.height>2.5&&a.height<=2.601);assert(a.draws===0,'Loaded is not rendered');}
const frozen=JSON.stringify(cast.snapshots());cast.draw({...world,paused:true},actors,1,0,'neighbor-24');assert.equal(JSON.stringify(cast.snapshots()),frozen);
const book=props.find(p=>p.id==='supplied/props/book');library.loaded.set(book.id,await loadLocalGLTF(book.url));
cast.draw({...world,paused:true},actors,1,0,'neighbor-24');assert(cast.snapshots().every(a=>a.prop==='read/native'),'Late native book is adopted even while paused');
// All five actual meshes, action hand contact and replay determinism. Unknown
// activities use explicit kinds, not authority or fabricated completed effects.
const activity={sleep:'Ngủ trưa',cook:'Nấu ăn',serve:'Phục vụ',wash:'Rửa bát',clean:'Quét sân',tidy:'Gấp quần áo',write:'Viết ghi chú',type:'Gõ máy tính',repair:'Sửa chữa',pack:'Đóng gói hàng',browse:'Xem hàng',care:'Chăm sóc'};
let maxPropGap=0;
for(const action of INTERIOR_ACTIONS){
 const varied=actors.map(a=>({...a,kind:action,activity:activity[action]??''}));
 for(const time of [1,1.4,2,3]){
  cast.draw(world,varied,time,0,'neighbor-24');
  for(const a of cast.snapshots()){
   assert([...a.position,...a.head,...a.hands.left,...a.hands.right].every(Number.isFinite));
   assert(a.head[1]>1.8&&a.head[1]<3.1,action+': distorted height');
   if(a.prop==='read/native'){
    const group=scene.children.find(o=>o.userData.assetId==='supplied/props/book');
    assert(group);const box=new THREE.Box3().setFromObject(group,true);
    const owner=cast.snapshots().find(s=>s.prop==='read/native');
    const gap=box.distanceToPoint(new THREE.Vector3(...owner.hands.right));maxPropGap=Math.max(maxPropGap,gap);assert(gap<.22,'Native book must remain at actual hand surface');
   }
  }
 }
 const at=JSON.stringify(cast.snapshots());cast.draw(world,varied,10,0,'neighbor-24');cast.draw(world,varied,3,0,'neighbor-24');assert.equal(JSON.stringify(cast.snapshots()),at,'Absolute room animation is seekable');
}
cast.draw(world,actors,3,1);assert.equal(cast.snapshots().length,0,'Upper floors cannot fabricate occupants');assert.equal(scene.children.length,0,'Leaving a venue releases actor and held-prop meshes');
cast.draw(world,[],4,0);assert.equal(scene.children.length,0);
for(let i=0;i<8;i++)for(const home of [false,true]){const [x,,z]=interiorSlot(i,home);assert(x> -7.2&&x<7.2&&z> -5&&z<5.5);}
// Immutable room geometry retains exact transforms in a palette batch; lift
// children remain independently animated, never merged into the static floor.
const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial(),roomScene=new THREE.Scene(),cabin=new THREE.Group();roomScene.add(cabin);
for(let i=0;i<12;i++){const m=new THREE.Mesh(geometry,material);m.position.set(i,1,2);roomScene.add(m);}
const door=new THREE.Mesh(geometry,material);cabin.add(door);const room=batchInteriorRoom(roomScene,geometry);assert.equal(room.batches.length,1);assert.equal(room.batches[0].count,12);assert.equal(cabin.children[0],door);
const matrix=new THREE.Matrix4();room.batches[0].getMatrixAt(7,matrix);assert.deepEqual(new THREE.Vector3().setFromMatrixPosition(matrix).toArray(),[7,1,2]);room.dispose();assert.equal(roomScene.children.length,1);
const furniture=createInteriorFurniture(scene,library),fallback=new THREE.Group(),placement={id:'supplied/props/plant',x:-6,y:0,z:4.5,width:1.2,height:2.8,depth:1.2};
furniture.add(placement,fallback);furniture.update();assert.equal(furniture.snapshots()[0].loaded,false);assert.equal(fallback.parent,scene);
library.loaded.set(placement.id,await loadLocalGLTF(props.find(p=>p.id===placement.id).url));furniture.update();assert.equal(furniture.snapshots()[0].loaded,true);assert.equal(fallback.parent,null);
const compiled=library.compile(placement.id),dummy=new THREE.Object3D();setAssetTransform(dummy,compiled.size,placement);const box=compiled.geometry.boundingBox.clone().applyMatrix4(dummy.matrix);assert(Math.abs(box.min.y)<1e-5);assert(box.getSize(new THREE.Vector3()).x<=1.201);
furniture.dispose();furniture.dispose();cast.dispose();cast.dispose();assert.equal(scene.children.length,0);
assert.equal(JSON.stringify(world),raw,'Presentation never changes IDs, plans, memory, policy or wallet');
geometry.dispose();material.dispose();library.dispose();
console.log(JSON.stringify({suite:'interior-cast',pass:true,nativeModels:CITIZEN_MODELS.length,maxControllers:8,actions:INTERIOR_ACTIONS.length,maxPropGap,
 delayedLoadAdopted:true,pauseAndSeekStable:true,noUpperFloorOccupants:true,staticBatching:true,disposeIdempotent:true,worldWrites:false}));
