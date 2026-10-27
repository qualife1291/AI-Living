import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';

type Colors = {shirt:string;trousers:string;skin:string};
const clipAliases:Record<string,string[]> = {
 idle:['Idle','idle','Idle_A'],walk:['Walk','walk','Walking_A'],sprint:['Run','Running_A','walk'],
 talk:['Talk','Speech','Idle'],listen:['Listen','Nod','Idle'],drive:['Sit','Idle'],
 'holding-both':['Think','Idle'], 'holding-right':['Idle'], 'emote-yes':['Nod','Idle'], 'emote-no':['Shake','Idle'],
 'pick-up':['PickUp','Interact','Idle'],sit:['Sit','Idle'],wave:['Wave','Idle'],
};
const scratch=new THREE.Vector3();

/** Skin-aware actor. Clips keep their original bone names; controllers use aliases. */
export class RiggedAvatar {
 readonly group=new THREE.Group();
 readonly model:THREE.Object3D;
 private offset=new THREE.Group();
 private mixer:THREE.AnimationMixer;
 private actions=new Map<string,THREE.AnimationAction>();
 private joints=new Map<string,THREE.Object3D>();
 private current='';private requested='';private previous='';private changedAt=0;private lastTime=NaN;
 private feet:THREE.Object3D[]=[];private footOffset=0;private tintKey='';
 private colors={shirt:new THREE.Color('white'),trousers:new THREE.Color('white')};
 private wardrobeEnabled={value:0};
 constructor(source:GLTF,height=17.5,radius=4.4) {
  this.model=clone(source.scene);this.offset.add(this.model);this.group.add(this.offset);
  const bones:THREE.Bone[]=[];
  this.model.traverse(object=>{if((object as THREE.Bone).isBone)bones.push(object as THREE.Bone);});
  const roots=new Set(bones.filter(b=>!(b.parent as THREE.Bone)?.isBone).map(b=>b.name));
  this.mixer=new THREE.AnimationMixer(this.model);
  for(const original of source.animations) {
   const clip=original.clone();
   for(const track of clip.tracks) if(track.name.endsWith('.position')&&roots.has(track.name.slice(0,-9))) {
    for(let n=0;n<track.values.length;n+=3){track.values[n]=track.values[0];track.values[n+2]=track.values[2];}
   }
   this.actions.set(clip.name,this.mixer.clipAction(clip));
  }
  const idle=this.findClip('idle');if(idle){const action=this.actions.get(idle)!;action.play();action.setEffectiveWeight(1);this.mixer.update(0);}
  this.model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(this.model,true),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  if(![...size].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid rigged model bounds');
  const yScale=height/size.y,horizontal=Math.min(yScale,radius/Math.max(.001,Math.hypot(size.x/2,size.z/2)));
  this.group.scale.set(horizontal,yScale,horizontal);this.offset.position.set(-center.x,-box.min.y,-center.z);
  this.findJoints(bones);
  this.feet=['foot-left','foot-right'].map(key=>this.joints.get(key)).filter((b):b is THREE.Object3D=>!!b);
  this.group.updateMatrixWorld(true);
  this.footOffset=this.feet.length?Math.min(...this.feet.map(b=>b.getWorldPosition(new THREE.Vector3()).y)):0;
  this.model.traverse(object=>{
   const mesh=object as THREE.SkinnedMesh;if(!mesh.isMesh)return;
   // Per-instance attributes/materials; source textures and animation tracks stay immutable.
   mesh.geometry=mesh.geometry.clone();
   const original=(Array.isArray(mesh.material)?mesh.material[0]:mesh.material) as THREE.MeshStandardMaterial;
   const material=new THREE.MeshPhongMaterial({map:original.map,color:original.color,side:original.side,shininess:12,alphaTest:original.alphaTest});
   mesh.material=material;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
   const count=mesh.geometry.attributes.position.count,mask=new THREE.BufferAttribute(new Float32Array(count),1),inverse=this.group.matrixWorld.clone().invert();
   for(let i=0;i<count;i++){mesh.getVertexPosition(i,scratch).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);const y=scratch.y/size.y,x=Math.abs(scratch.x)/size.y;mask.setX(i,y>.08&&y<.43?2:y>=.43&&y<.66&&x<.24?1:0);}
   mesh.geometry.setAttribute('wardrobe',mask);
   material.onBeforeCompile=shader=>{
    shader.uniforms.shirtTone={value:this.colors.shirt};shader.uniforms.trousersTone={value:this.colors.trousers};shader.uniforms.wardrobeEnabled=this.wardrobeEnabled;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float wardrobe; varying float vWardrobe;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWardrobe=wardrobe;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float wardrobeEnabled; uniform vec3 shirtTone; uniform vec3 trousersTone; varying float vWardrobe;').replace('#include <map_fragment>','#include <map_fragment>\nfloat clothLight=.7+.3*dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));\nif(wardrobeEnabled>.5){if(vWardrobe>1.5)diffuseColor.rgb=trousersTone*clothLight;else if(vWardrobe>.5)diffuseColor.rgb=shirtTone*clothLight;}');
   };
   material.customProgramCacheKey=()=> 'living-wardrobe-v1';
  });
 }
 private findJoints(bones:THREE.Bone[]) {
  const points=bones.map(b=>({b,p:b.getWorldPosition(new THREE.Vector3())}));
  if(!points.length)return;
  const center=points.reduce((s,v)=>s+v.p.x,0)/points.length,maxX=Math.max(...points.map(v=>Math.abs(v.p.x-center)),.001);
  const middle=points.filter(v=>Math.abs(v.p.x-center)<maxX*.22);
  const head=[...middle].sort((a,b)=>b.p.y-a.p.y)[0];if(head)this.joints.set('head',head.b);
  const branches=middle.filter(v=>v.b.children.filter(o=>(o as THREE.Bone).isBone).length>=3).sort((a,b)=>b.p.y-a.p.y);
  const torso=branches[0],hips=branches.at(-1);if(torso)this.joints.set('torso',torso.b);
  for(const side of ['left','right']) {
   const sign=side==='left'?1:-1;
   const explicit=(pattern:RegExp)=>points.find(v=>pattern.test(v.b.name.replace(/[._ -]/g,'')));
   const arm=explicit(side==='left'?/^(upperarml|leftarm|lefthand)$/i:/^(upperarmr|rightarm|righthand)$/i)
    ??points.filter(v=>(v.p.x-center)*sign>maxX*.12&&v.b.parent===torso?.b).sort((a,b)=>Math.abs(a.p.x-center)-Math.abs(b.p.x-center))[0];
   const leg=explicit(side==='left'?/^(upperlegl|leftupleg|leftlegb)$/i:/^(upperlegr|rightupleg|rightlegb)$/i)
    ??points.filter(v=>(v.p.x-center)*sign>0&&v.b.parent===hips?.b&&v.b!==torso?.b)[0];
   if(arm){this.joints.set(`arm-${side}`,arm.b);let end=arm.b;while(end.children.some(o=>(o as THREE.Bone).isBone))end=end.children.find(o=>(o as THREE.Bone).isBone) as THREE.Bone;this.joints.set(`hand-${side}`,end);}
   if(leg){this.joints.set(`leg-${side}`,leg.b);let end=leg.b;while(end.children.some(o=>(o as THREE.Bone).isBone))end=end.children.find(o=>(o as THREE.Bone).isBone) as THREE.Bone;this.joints.set(`foot-${side}`,end);}
  }
 }
 joint(name:string){return this.joints.get(name)??this.model.getObjectByName(name);}
 private findClip(requested:string){return [requested,...(clipAliases[requested]??[]),...clipAliases.idle].map(name=>[...this.actions.keys()].find(key=>key.toLowerCase()===name.toLowerCase())).find(Boolean);}
 pose(clip:string,animationTime:number,presentationTime:number,position:readonly number[],yaw:number,floor:number) {
  if(this.current&&presentationTime===this.lastTime)return false;
  const resolved=this.findClip(clip)??'',first=!this.current,seek=!Number.isFinite(this.lastTime)||Math.abs(presentationTime-this.lastTime)>1;
  if(resolved!==this.current||seek){this.previous=first||seek?'':this.current;this.current=resolved;this.changedAt=first||seek?presentationTime-.45:presentationTime;this.actions.get(resolved)?.reset().play();}
  const blend=Math.min(1,Math.max(0,(presentationTime-this.changedAt)/.45));
  for(const [name,action] of this.actions){action.enabled=name===resolved||name===this.previous&&blend<1;action.setEffectiveWeight(name===resolved?blend:name===this.previous?1-blend:0);if(name===resolved){const duration=Math.max(.001,action.getClip().duration);action.time=((animationTime%duration)+duration)%duration;}}
  this.mixer.update(0);this.lastTime=presentationTime;this.requested=clip;
  this.group.position.set(position[0],0,position.length>2?position[2]:position[1]);this.group.rotation.set(0,yaw,0);this.group.updateMatrixWorld(true);
  const bottom=this.feet.length?Math.min(...this.feet.map(b=>b.getWorldPosition(scratch).y))-this.footOffset:0;
  this.group.position.y=floor-bottom;this.group.updateMatrixWorld(true);return true;
 }
 tint(colors:Colors) {
  const key=colors.shirt+'/'+colors.trousers;if(key===this.tintKey)return;this.tintKey=key;
  this.wardrobeEnabled.value=1;
  this.colors.shirt.set(colors.shirt);this.colors.trousers.set(colors.trousers);
 }
 assignId(id:string){this.model.traverse(o=>{if((o as THREE.Mesh).isMesh)o.userData.actorId=id;});}
 hand(side='right'){return this.joint(`hand-${side}`)?.getWorldPosition(new THREE.Vector3())??this.group.position.clone().add(new THREE.Vector3(0,10,0));}
 aimHands(targets:{right?:readonly number[];left?:readonly number[]}) {
  for(const side of ['left','right'] as const){const goal=targets[side],arm=this.joint(`arm-${side}`),hand=this.joint(`hand-${side}`);if(!goal||!arm?.parent||!hand)continue;
   const origin=arm.getWorldPosition(new THREE.Vector3()),direction=hand.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(),target=new THREE.Vector3(...goal).sub(origin).normalize();
   const turn=new THREE.Quaternion().setFromUnitVectors(direction,target),parent=arm.parent.getWorldQuaternion(new THREE.Quaternion());arm.quaternion.premultiply(parent.clone().invert().multiply(turn).multiply(parent));arm.updateMatrixWorld(true);
  }
 }
 snapshot(){return{clip:this.requested,resolvedClip:this.current,leg:this.joint('leg-left')?.quaternion.toArray(),position:this.group.position.toArray(),skinned:true};}
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);this.model.traverse(o=>{const mesh=o as THREE.SkinnedMesh;if(!mesh.isMesh)return;mesh.geometry.dispose();for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();if(mesh.isSkinnedMesh)mesh.skeleton.dispose();});this.group.removeFromParent();}
}
