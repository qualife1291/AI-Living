import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {loadLocalGLTF} from './load-local-gltf.mjs';
import {RiggedAvatar} from '../components/city/three/rigged-avatar.ts';
const catalog=JSON.parse(readFileSync('public/models/resources/catalog.json','utf8'));
let models=0,skins=0,animations=0,triangles=0;
for(const asset of catalog.assets){
 const gltf=await loadLocalGLTF(asset.url);assert.equal(gltf.animations.length,asset.clips.length);let meshes=0;
 gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(!o.isMesh)return;meshes++;assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.matrixWorld.elements.every(Number.isFinite));});assert(meshes>0);
 const box=new THREE.Box3().setFromObject(gltf.scene,true);assert([...box.min,...box.max].every(Number.isFinite));
 if(asset.skins){
  const a=clone(gltf.scene),b=clone(gltf.scene),bonesA=[],bonesB=[];a.traverse(o=>{if(o.isBone)bonesA.push(o)});b.traverse(o=>{if(o.isBone)bonesB.push(o)});assert.equal(bonesA.length,bonesB.length);assert(bonesA.every((bone,i)=>bone!==bonesB[i]));const before=bonesB[0].quaternion.clone();bonesA[0].rotation.x+=.2;assert(bonesB[0].quaternion.equals(before));skins++;
 }
 for(const clip of gltf.animations){assert(Number.isFinite(clip.duration)&&clip.duration>=0);for(const track of clip.tracks){assert(track.times.every(Number.isFinite));assert(track.values.every(Number.isFinite));}}
 models++;animations+=gltf.animations.length;triangles+=asset.triangles;
}
const source=await loadLocalGLTF(catalog.assets.find(a=>a.id==='gobkit-human002/it-engineer').url),avatar=new RiggedAvatar(source);
const before=JSON.stringify(source.scene.toJSON());
for(let n=0;n<180;n++){avatar.pose(n<60?'walk':n<120?'talk':'listen',n/60,n/60,[n/10,0,0],.4,0);assert(avatar.snapshot().position.every(Number.isFinite));assert(!/attack|death|dead/i.test(avatar.snapshot().resolvedClip));}
const paused=avatar.snapshot();avatar.pose('walk',100,179/60,[999,0,999],4,8);assert.deepEqual(avatar.snapshot(),paused);assert.equal(JSON.stringify(source.scene.toJSON()),before,'Avatar must not change the cached source rig');
avatar.pose('drive',0,10,[0,0,0],0,0);assert.equal(avatar.snapshot().resolvedClip,'Sit');avatar.dispose();
console.log(JSON.stringify({suite:'resource-packs',models,skins,animations,triangles,allBuffersFinite:true,skeletonClones:'independent',source:'immutable',pause:'frozen',dailyClips:'safe'}));
