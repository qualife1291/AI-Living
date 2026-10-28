import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {RiggedAvatar} from '../city/three/rigged-avatar.ts';
/** Modern head/body skin plus articulated daily-life arms. Human002 has no elbow
 * bones: stretching its one-piece arm made handoffs look like rigid poles. */
export class StudioAvatar extends RiggedAvatar {
 private arms=new Map<string,{upper:THREE.Mesh;lower:THREE.Mesh;hand:THREE.Group;elbow:THREE.Mesh}>();
 constructor(source:GLTF,height:number,radius:number,shirt:string){
  super(source,height,radius,true);
  const armBones=new Set(['arm-left','arm-right','hand-left','hand-right'].map(k=>this.joint(k)));
  this.model.traverse(o=>{const mesh=o as THREE.SkinnedMesh;if(!mesh.isSkinnedMesh)return;const skin=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight'),indices=mesh.geometry.index?Array.from(mesh.geometry.index.array):Array.from({length:skin.count},(_,i)=>i),kept:number[]=[];
   const isArm=(v:number)=>{let w=0;for(let n=0;n<4;n++)if(armBones.has(mesh.skeleton.bones[skin.getComponent(v,n)]))w+=weights.getComponent(v,n);return w>.45;};
   for(let i=0;i<indices.length;i+=3)if(!indices.slice(i,i+3).some(isArm))kept.push(...indices.slice(i,i+3));mesh.geometry.setIndex(kept);
  });
  for(const side of ['left','right']){
   const cloth=new THREE.MeshPhongMaterial({color:shirt,shininess:12}),skin=new THREE.MeshPhongMaterial({color:'#e7c19c',shininess:15});
   const upper=new THREE.Mesh(new THREE.CapsuleGeometry(.29,1,4,8),cloth),lower=new THREE.Mesh(new THREE.CapsuleGeometry(.23,1,4,8),skin),elbow=new THREE.Mesh(new THREE.SphereGeometry(.27,8,6),cloth),hand=new THREE.Group();
   const palm=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),skin);palm.scale.set(.29,.15,.34);hand.add(palm);
   for(let i=0;i<4;i++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.22,2,5),skin);finger.position.set((i-1.5)*.13,0,.31);finger.rotation.x=Math.PI/2;hand.add(finger);}
   const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.18,2,5),skin);thumb.rotation.z=-.6;thumb.position.set(.3,0,.04);hand.add(thumb);
   hand.updateMatrixWorld(true);const pieces=hand.children.map(o=>{const mesh=o as THREE.Mesh;return mesh.geometry.clone().applyMatrix4(mesh.matrix);});const merged=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());for(const child of [...hand.children]){(child as THREE.Mesh).geometry.dispose();child.removeFromParent();}if(merged)hand.add(new THREE.Mesh(merged,skin));
   for(const m of [upper,lower,elbow,...hand.children])(m as THREE.Mesh).castShadow=true;this.group.add(upper,lower,elbow);
   // Arm geometry is in stage units and follows the root via world/local transforms.
   this.group.add(hand);this.arms.set(side,{upper,lower,hand,elbow});
  }
 }
 private placeArm(side:string,target:THREE.Vector3,strength:number){
  const arm=this.arms.get(side)!,origin=this.joint(`arm-${side}`)!.getWorldPosition(new THREE.Vector3()),rest=super.hand(side),goal=rest.lerp(target,strength),delta=goal.clone().sub(origin),distance=delta.length(),length=1.72*this.height/5.4;
  const reach=Math.min(distance,length*2-.02),direction=delta.normalize();goal.copy(origin).addScaledVector(direction,reach);
  const pole=new THREE.Vector3(side==='left'?1:-1,-.75,-.5).applyAxisAngle(new THREE.Vector3(0,1,0),this.group.rotation.y);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
  const elbow=origin.clone().addScaledVector(direction,reach/2).addScaledVector(pole,Math.sqrt(Math.max(0,length*length-reach*reach/4)));
  const segment=(mesh:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3,radius:number)=>{const start=this.group.worldToLocal(a.clone()),end=this.group.worldToLocal(b.clone()),v=end.clone().sub(start);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());const scale=this.group.scale.x;mesh.scale.set(1/scale,Math.max(.01,a.distanceTo(b)/(1+radius*2)/scale),1/scale);};
  segment(arm.upper,origin,elbow,.29);segment(arm.lower,elbow,goal,.23);arm.elbow.position.copy(this.group.worldToLocal(elbow.clone()));arm.elbow.scale.setScalar(1/this.group.scale.x);arm.hand.position.copy(this.group.worldToLocal(goal));arm.hand.scale.setScalar(1/this.group.scale.x);arm.hand.rotation.set(0,0,0);this.group.updateMatrixWorld(true);
 }
 override poseTimeline(layers:{clip:string;time:number;weight:number}[],position:readonly number[],yaw:number,bend=0){super.poseTimeline(layers,position,yaw,bend);for(const side of ['left','right'])this.placeArm(side,super.hand(side),1);}
 reachTimeline(targets:{right?:readonly number[];left?:readonly number[]},strength=1){for(const side of ['left','right'] as const)if(targets[side])this.placeArm(side,new THREE.Vector3(...targets[side]!),strength);}
 override hand(side='right'){return this.arms.get(side)?.hand.getWorldPosition(new THREE.Vector3())??super.hand(side);}
 override dispose(){for(const arm of this.arms.values())for(const object of [arm.upper,arm.lower,arm.elbow,arm.hand])object.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.geometry.dispose();for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();}});super.dispose();}
}
