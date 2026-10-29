import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
/** Quadrupeds/birds retain their rig; no human joint guesses or fake fly clips. */
export class AnimalRig{
 readonly group:THREE.Object3D;private mixer:THREE.AnimationMixer;private current='';private actions=new Map<string,THREE.AnimationAction>();
 constructor(source:GLTF,height:number,radius=4.4){
  this.group=clone(source.scene);this.mixer=new THREE.AnimationMixer(this.group);
  for(const clip of source.animations.filter(c=>/^(idle|walk)$/i.test(c.name)))this.actions.set(clip.name.toLowerCase(),this.mixer.clipAction(clip.clone()));
  this.actions.get('idle')?.play();this.mixer.update(0);this.group.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(this.group,true).getSize(new THREE.Vector3());
  const scale=Math.min(height/size.y,radius/Math.max(.001,Math.hypot(size.x/2,size.z/2)));if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid animal bounds');this.group.scale.multiplyScalar(scale);
  // A single material must remain single: an array with no geometry groups
  // produces no render items in Three.js, even though bounds/poses look valid.
  this.group.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>m.clone()):mesh.material.clone();mesh.castShadow=true;mesh.receiveShadow=true;});
 }
 pose(moving:boolean,time:number,position:readonly number[],yaw:number,floor:number){
  const name=moving&&this.actions.has('walk')?'walk':'idle';if(name!==this.current){for(const action of this.actions.values())action.stop();this.actions.get(name)?.reset().play();this.current=name;}
  const action=this.actions.get(name);if(action)action.time=time%Math.max(.001,action.getClip().duration);this.mixer.update(0);
  this.group.position.set(position[0],0,position[1]);this.group.rotation.set(0,yaw,0);this.group.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(this.group,true),center=box.getCenter(new THREE.Vector3());this.group.position.x+=position[0]-center.x;this.group.position.z+=position[1]-center.z;this.group.position.y=floor-box.min.y;this.group.updateMatrixWorld(true);
 }
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.group);this.group.traverse(o=>{const mesh=o as THREE.SkinnedMesh;if(!mesh.isMesh)return;for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();if(mesh.isSkinnedMesh)mesh.skeleton.dispose();});this.group.removeFromParent();}
}
