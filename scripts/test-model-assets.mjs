import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AssetLibrary, AssetAvatar, setAssetTransform } from '../components/city/three/assets.ts';
const loader = new GLTFLoader();
// Geometry/clip assertions do not need a browser image decoder.
loader.register(() => ({name:'qa-material',loadMaterial:()=>Promise.resolve(new THREE.MeshBasicMaterial())}));
async function parse(id) { const raw=readFileSync(`public/models/kenney/${id}.glb`); return loader.parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),''); }
const source=await parse('characters/character-a');
const avatar=new AssetAvatar(source), second=new AssetAvatar(source);
const rest=new THREE.Box3().setFromObject(avatar.group), size=rest.getSize(new THREE.Vector3());
assert.ok(Math.abs(size.y-17.5)<.001);assert.ok(size.x/size.y>.4,'Body cannot become a thin strip after fitting extended-arm clips');
let first, changed=false;
for(let n=0;n<60;n++) { avatar.pose('walk',n/60,n/60,[n/10,0,0],0,.7); const now=avatar.snapshot();if(first&&JSON.stringify(now.leg)!==JSON.stringify(first.leg))changed=true;first=now;const box=new THREE.Box3().setFromObject(avatar.model);assert.ok(Math.abs(box.min.y-.7)<1e-5);assert.ok([...box.min,...box.max].every(Number.isFinite)); }
assert.ok(changed,'Walk clip animates actual model legs');
const paused=avatar.snapshot();avatar.pose('pick-up',.2,59/60,[999,0,999],2,9);assert.deepEqual(avatar.snapshot(),paused,'Presentation pause freezes transforms and clip');
assert.notDeepEqual(second.snapshot().leg,paused.leg,'Clones do not share animated transforms');
avatar.pose('pick-up',.15,80,[10,0,5],.5,.7);assert.equal(avatar.snapshot().clip,'pick-up');assert.ok(avatar.hand().toArray().every(Number.isFinite));assert.ok(Math.abs(avatar.group.rotation.y-.5)<1e-8,'Authored +Z face follows the social heading');avatar.aimHands({right:[12,9,7]});assert.ok(avatar.hand().toArray().every(Number.isFinite));
avatar.pose('idle',0,0,[0,0,0],0,.7);assert.equal(avatar.snapshot().clip,'idle','Backward seek resets blend');
const library=new AssetLibrary();library.loaded.set('suburban/building-type-a',await parse('suburban/building-type-a'));
const model=library.compile('suburban/building-type-a');assert.ok(model&&model.geometry.getAttribute('uv'));assert.ok(Math.abs(model.geometry.boundingBox.min.y)<1e-6);
const placement={id:'suburban/building-type-a',x:0,y:.7,z:0,width:70,depth:50,height:55};
const dummy=new THREE.Object3D();setAssetTransform(dummy,model.size,placement);
const box=model.geometry.boundingBox.clone().applyMatrix4(dummy.matrix);assert.ok(box.getSize(new THREE.Vector3()).x<=70.0001);assert.ok(box.getSize(new THREE.Vector3()).z<=50.0001);assert.ok(Math.abs(box.min.y-.7)<1e-5);
const scene=new THREE.Scene(),update=library.addWorldLOD(scene,[placement]),camera=new THREE.PerspectiveCamera();camera.position.set(0,50,100);update(camera);assert.equal(scene.children[0].count,1);assert.equal(scene.children[1].count,0);camera.position.z=1000;update(camera);assert.equal(scene.children[0].count,0);assert.equal(scene.children[1].count,1,'Far building keeps a cheap silhouette');camera.position.z=100;update(camera);assert.equal(scene.children[0].count,1,'Detail returns when camera approaches');assert.equal(scene.children[0].castShadow,false,'Balanced static scenery keeps contact shadows without another full geometry pass');update(camera,true);assert.equal(scene.children[0].castShadow,true,'Sharp restores detailed scenery shadows even when the camera does not move');
library.dispose();console.log(JSON.stringify({suite:'model-assets',actualGLBClips:true,bodyHeight:17.5,pause:'frozen',seek:'reset',clones:'independent',ground:'aligned',footprints:'bounded',LOD:'returns'}));
