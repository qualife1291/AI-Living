import assert from 'node:assert/strict';
import * as THREE from 'three';
import {pickVisible,TapGesture} from '../components/city/three/picking.ts';
const ray=new THREE.Raycaster(new THREE.Vector3(0,0,20),new THREE.Vector3(0,0,-1));
const box=()=>new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial());
const scene=new THREE.Scene(),body=box();body.userData.actorId='visible';scene.add(body);
const hidden=box();hidden.position.z=8;hidden.visible=false;scene.add(hidden);
const hiddenGroup=new THREE.Group();hiddenGroup.visible=false;const child=box();child.position.z=10;hiddenGroup.add(child);scene.add(hiddenGroup);scene.updateMatrixWorld(true);
assert.equal(ray.intersectObjects(scene.children,true)[0].object,child,'Three raycasting includes hidden parents unless explicitly filtered');
assert.equal(pickVisible(ray,scene).object,body);
const wall=box();wall.position.z=5;scene.add(wall);assert.equal(pickVisible(ray,scene).object,wall,'Opaque scenery still blocks selecting through a building');
wall.userData.pickThrough=true;assert.equal(pickVisible(ray,scene).object,body);
wall.userData.pickThrough=false;assert.equal(pickVisible(ray,scene,new Set([wall])).object,body);
wall.material.transparent=true;wall.material.opacity=0;assert.equal(pickVisible(ray,scene).object,body);
// Instances move after their first bounds computation, including LOD count changes.
const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial(),2),m=new THREE.Matrix4();batch.count=1;batch.setMatrixAt(0,m);batch.computeBoundingSphere();batch.setMatrixAt(0,m.makeTranslation(40,0,0));batch.instanceMatrix.needsUpdate=true;scene.add(batch);
ray.ray.origin.x=40;assert.equal(pickVisible(ray,scene).object,batch);assert.equal(pickVisible(ray,scene).instanceId,0);batch.count=0;assert.equal(pickVisible(ray,scene),undefined);
// A real deforming skin can move entirely outside the cached bind-pose sphere.
const g=new THREE.BoxGeometry(2,2,2),count=g.getAttribute('position').count,weights=new Float32Array(count*4);
for(let i=0;i<count;i++)weights[i*4]=1;
g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(count*4),4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
const skin=new THREE.SkinnedMesh(g,new THREE.MeshBasicMaterial()),bone=new THREE.Bone();skin.add(bone);skin.bind(new THREE.Skeleton([bone]));scene.add(skin);scene.updateMatrixWorld(true);skin.computeBoundingSphere();skin.computeBoundingBox();bone.position.x=70;scene.updateMatrixWorld(true);ray.ray.origin.x=70;assert.equal(pickVisible(ray,scene).object,skin);
const e=(id,x=0,y=0,button=0)=>({pointerId:id,clientX:x,clientY:y,button}),tap=new TapGesture();
tap.down(e(1));assert(tap.up(e(1,2,2)));
tap.down(e(1));tap.move(e(1,20));tap.move(e(1));assert(!tap.up(e(1)),'A completed orbit cannot become a click after returning to the start');
tap.down(e(1));tap.down(e(2));assert(!tap.up(e(1)));assert(!tap.up(e(2)),'Pinch release never selects');
tap.down(e(1));tap.cancel(e(1));assert(!tap.up(e(1)));tap.down(e(1));assert(tap.up(e(1)),'New tap recovers after cancellation');
tap.down(e(1));tap.invalidate();assert(!tap.up(e(1)));tap.down(e(1,0,0,2));assert(!tap.up(e(1,0,0,2)));
console.log(JSON.stringify({suite:'scene-interactions',hiddenAncestors:true,animatedSkinBounds:true,movingInstanceBounds:true,opaqueOcclusion:true,tapDragPinchCancel:true,worldWrites:false}));
