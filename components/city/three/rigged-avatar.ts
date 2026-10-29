import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {dailyHumanGeometry} from './daily-rig-geometry.ts';

type Colors = {shirt:string;trousers:string;skin:string};
const clipAliases:Record<string,string[]> = {
 idle:['Idle','idle','Idle_A'],walk:['Walk','walk','Walking_A'],sprint:['Run','Running_A','walk'],
 talk:['Talk','Speech','Idle'],listen:['Listen','Nod','Idle'],drive:['Ride','Sit','Idle'],
 'holding-both':['Think','Idle'], 'holding-right':['Idle'], 'emote-yes':['Nod','Idle'], 'emote-no':['Shake','Idle'],
 'pick-up':['PickUp','Interact','Idle'],sit:['Sit','Idle'],wave:['Wave','Idle'],
};
const scratch=new THREE.Vector3();

/** Skin-aware actor. Clips keep their original bone names; controllers use aliases. */
export class RiggedAvatar {
 readonly group=new THREE.Group();
 readonly height:number;
 readonly model:THREE.Object3D;
 private offset=new THREE.Group();
 private mixer:THREE.AnimationMixer;
 private actions=new Map<string,THREE.AnimationAction>();
 private joints=new Map<string,THREE.Object3D>();
 private current='';private requested='';private previous='';private changedAt=0;private lastTime=NaN;
 private feet:THREE.Object3D[]=[];private footOffset=0;private tintKey='';
 private attachments=new Map<string,{mesh:THREE.SkinnedMesh;indices:number[]}[]>();
 private rest:{bone:THREE.Bone;position:THREE.Vector3;quaternion:THREE.Quaternion;scale:THREE.Vector3}[]=[];
 private colors={shirt:new THREE.Color('white'),trousers:new THREE.Color('white'),skin:new THREE.Color('white')};
 private wardrobeEnabled={value:0};
 constructor(source:GLTF,height=17.5,radius=4.4,dailyHuman=false) {
  this.model=clone(source.scene);this.offset.add(this.model);this.group.add(this.offset);
  this.model.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.isMesh)mesh.geometry=dailyHuman&&!['xom-citizen-v1','xom-supplied-v1'].includes(source.scene.userData.profile)?dailyHumanGeometry(mesh.geometry):mesh.geometry.clone();});
  const bones:THREE.Bone[]=[];
  this.model.traverse(object=>{if((object as THREE.Bone).isBone)bones.push(object as THREE.Bone);});
  this.rest=bones.map(bone=>({bone,position:bone.position.clone(),quaternion:bone.quaternion.clone(),scale:bone.scale.clone()}));
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
  let clearance=size;
  if(dailyHuman&&source.scene.userData.profile==='xom-supplied-v1'){
   // Studio replaces the arms with reach controllers; a wide source hand pose
   // must not shrink the torso and turn an adult into a child-sized actor.
   const arms=new Set<THREE.Object3D>();for(const name of ['LeftArm','RightArm'])this.model.getObjectByName(name)?.traverse(o=>arms.add(o));
   const bodyBox=new THREE.Box3();this.model.traverse(o=>{const mesh=o as THREE.SkinnedMesh;if(!mesh.isSkinnedMesh)return;const skin=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');for(let i=0;i<skin.count;i++){let arm=0;for(let n=0;n<4;n++)if(arms.has(mesh.skeleton.bones[skin.getComponent(i,n)]))arm+=weights.getComponent(i,n);if(arm<.5)bodyBox.expandByPoint(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));}});
   if(!bodyBox.isEmpty())clearance=bodyBox.getSize(new THREE.Vector3());
  }
  const yScale=height/size.y,horizontal=Math.min(yScale,radius/Math.max(.001,Math.hypot(clearance.x/2,clearance.z/2)));
  // Preserve authored proportions; shrink uniformly when clearance is tighter.
  this.group.scale.setScalar(horizontal);this.height=size.y*horizontal;this.offset.position.set(-center.x,-box.min.y,-center.z);
  this.findJoints(bones);
  const aliases=this.model.userData.jointAliases as Record<string,string>|undefined;
  if(aliases)for(const [key,name] of Object.entries(aliases)){const bone=bones.find(b=>b.name===name);if(bone)this.joints.set(key,bone);}
  this.feet=['foot-left','foot-right'].map(key=>this.joints.get(key)).filter((b):b is THREE.Object3D=>!!b);
  this.group.updateMatrixWorld(true);
  this.footOffset=this.feet.length?Math.min(...this.feet.map(b=>b.getWorldPosition(new THREE.Vector3()).y)):0;
  this.model.traverse(object=>{
   const mesh=object as THREE.SkinnedMesh;if(!mesh.isMesh)return;
   // Per-instance attributes/materials; source textures and animation tracks stay immutable.
   const original=(Array.isArray(mesh.material)?mesh.material[0]:mesh.material) as THREE.MeshStandardMaterial;
   const material=new THREE.MeshPhongMaterial({map:original.map,color:original.color,side:original.side,vertexColors:original.vertexColors,shininess:12,alphaTest:original.alphaTest});
   mesh.material=material;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
   const authoredMask=mesh.geometry.getAttribute('_wardrobe');
   const count=mesh.geometry.attributes.position.count,mask=new THREE.BufferAttribute(new Float32Array(count),1),inverse=this.group.matrixWorld.clone().invert();
   for(let i=0;i<count;i++){mesh.getVertexPosition(i,scratch).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);const y=scratch.y/size.y,x=Math.abs(scratch.x)/size.y;mask.setX(i,authoredMask?authoredMask.getX(i):y>.08&&y<.43?2:y>=.43&&y<.66&&x<.24?1:0);}
   mesh.geometry.setAttribute('wardrobe',mask);
   material.onBeforeCompile=shader=>{
    shader.uniforms.shirtTone={value:this.colors.shirt};shader.uniforms.trousersTone={value:this.colors.trousers};shader.uniforms.wardrobeEnabled=this.wardrobeEnabled;shader.uniforms.skinTone={value:this.colors.skin};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float wardrobe; varying float vWardrobe;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWardrobe=wardrobe;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float wardrobeEnabled; uniform vec3 shirtTone; uniform vec3 trousersTone; uniform vec3 skinTone; varying float vWardrobe;').replace('#include <map_fragment>','#include <map_fragment>\nfloat clothLight=.7+.3*dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));\nif(wardrobeEnabled>.5){if(vWardrobe>2.5)diffuseColor.rgb=skinTone*clothLight;else if(vWardrobe>1.5)diffuseColor.rgb=trousersTone*clothLight;else if(vWardrobe>.5)diffuseColor.rgb=shirtTone*clothLight;}');
   };
   material.customProgramCacheKey=()=> 'living-wardrobe-v2';
  });
  this.findAttachments();
 }
 /** Surface samples follow the deformed skin, including exporter bind offsets.
  * Bone origins alone are not necessarily inside the visible hand or head. */
 private findAttachments() {
  for(const key of ['head','hips','hand-left','hand-right','foot-left','foot-right']) {
   const bone=this.joints.get(key);if(!bone)continue;
   const samples:{mesh:THREE.SkinnedMesh;indices:number[]}[]=[];
   this.model.traverse(object=>{
    const mesh=object as THREE.SkinnedMesh;if(!mesh.isSkinnedMesh)return;
    const related=new Set<THREE.Object3D>([bone]);if(key.startsWith('foot'))bone.traverse(b=>related.add(b));
    const boneIndices=new Set(mesh.skeleton.bones.map((b,i)=>related.has(b)?i:-1).filter(i=>i>=0));if(!boneIndices.size)return;
    const skin=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
    const candidates:{i:number;p:THREE.Vector3}[]=[];
    for(let i=0;i<skin.count;i++) {
     let weight=0;for(let j=0;j<4;j++)if(boneIndices.has(skin.getComponent(i,j)))weight+=weights.getComponent(i,j);
     if(weight>=.5)candidates.push({i,p:mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld)});
    }
    if(!candidates.length)return;
    let chosen=candidates;
    if(key==='head'||key.startsWith('foot')) {
     const ys=candidates.map(v=>v.p.y),min=Math.min(...ys),max=Math.max(...ys),range=Math.max(.001,max-min);
     chosen=candidates.filter(v=>key==='head'?v.p.y>=max-range*.12:v.p.y<=min+range*.08);
    }
    // Bounded work per frame even on a detailed skinned mesh.
    samples.push({mesh,indices:chosen.filter((_,i)=>i%Math.max(1,Math.ceil(chosen.length/24))===0).map(v=>v.i)});
   });
   if(samples.length)this.attachments.set(key,samples);
  }
 }
 private surface(key:string,extreme?:'min'|'max') {
  const samples=this.attachments.get(key);if(!samples)return;
  const result=new THREE.Vector3();let count=0,best=extreme==='min'?Infinity:-Infinity;
  for(const {mesh,indices} of samples)for(const i of indices){mesh.getVertexPosition(i,scratch).applyMatrix4(mesh.matrixWorld);if(extreme){if(extreme==='min'?scratch.y<best:scratch.y>best){result.copy(scratch);best=scratch.y;}}else result.add(scratch);count++;}
  return count?extreme?result:result.multiplyScalar(1/count):undefined;
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
  // PropertyMixer skips unchanged constant tracks. Procedural contacts must not
  // become the next frame's base when such a track is cached.
  const previousTime=this.actions.get(this.previous)?.time??0;
  this.mixer.stopAllAction();for(const rest of this.rest){rest.bone.position.copy(rest.position);rest.bone.quaternion.copy(rest.quaternion);rest.bone.scale.copy(rest.scale);}
  for(const [name,action] of this.actions){action.enabled=name===resolved||name===this.previous&&blend<1;action.setEffectiveWeight(name===resolved?blend:name===this.previous?1-blend:0);if(action.enabled){action.play();const duration=Math.max(.001,action.getClip().duration),time=name===resolved?animationTime:previousTime;action.time=((time%duration)+duration)%duration;}}
  this.mixer.update(0);this.lastTime=presentationTime;this.requested=clip;
  this.group.position.set(position[0],0,position.length>2?position[2]:position[1]);this.group.rotation.set(0,yaw,0);this.group.updateMatrixWorld(true);
  const contacts=['foot-left','foot-right'].map(key=>this.surface(key,'min')?.y).filter((y):y is number=>y!==undefined);
  const bottom=contacts.length?Math.min(...contacts):this.feet.length?Math.min(...this.feet.map(b=>b.getWorldPosition(scratch).y))-this.footOffset:0;
  this.group.position.y=floor-bottom;this.group.updateMatrixWorld(true);return true;
 }
 /** Absolute, seekable mixing for the editorial Studio. No accumulated pose/clock. */
 poseTimeline(layers:{clip:string;time:number;weight:number}[],position:readonly number[],yaw:number,bend=0,lean=0) {
  this.mixer.stopAllAction();
  for(const rest of this.rest){rest.bone.position.copy(rest.position);rest.bone.quaternion.copy(rest.quaternion);rest.bone.scale.copy(rest.scale);}
  const weights=new Map<string,{weight:number;time:number}>();
  for(const layer of layers){const name=this.findClip(layer.clip);if(!name||layer.weight<=0)continue;const v=weights.get(name)??{weight:0,time:layer.time};v.weight+=layer.weight;weights.set(name,v);}
  const total=[...weights.values()].reduce((s,v)=>s+v.weight,0)||1;
  for(const [name,action] of this.actions){const v=weights.get(name);action.enabled=!!v;action.setEffectiveWeight((v?.weight??0)/total);if(v){action.play();const duration=Math.max(.001,action.getClip().duration);action.time=((v.time%duration)+duration)%duration;}}
  this.mixer.update(0);
  this.group.position.set(position[0],0,position[2]);this.group.rotation.set(0,yaw,0);
  // A squat precedes low reaches; keep both feet grounded after bending knees.
  for(const side of ['left','right']){const leg=this.joint(`leg-${side}`);if(!leg)continue;leg.rotateX(-1.35*bend);const knee=leg.children.find(o=>(o as THREE.Bone).isBone);knee?.rotateX(2.7*bend);this.joint(`foot-${side}`)?.rotateX(-1.35*bend);}
  (this.joint('Spine')??this.joint('torso'))?.rotateX(.65*bend+lean);
  this.group.updateMatrixWorld(true);
  const feet=['foot-left','foot-right'].map(k=>this.surface(k,'min')?.y).filter((y):y is number=>y!==undefined);
  this.group.position.y=position[1]-(feet.length?Math.min(...feet):0);this.group.updateMatrixWorld(true);
 }
 tint(colors:Colors) {
  const key=colors.shirt+'/'+colors.trousers+'/'+colors.skin;if(key===this.tintKey)return;this.tintKey=key;
  this.wardrobeEnabled.value=1;
  this.colors.shirt.set(colors.shirt);this.colors.trousers.set(colors.trousers);this.colors.skin.set(colors.skin);
 }
 assignId(id:string){this.group.traverse(o=>{if((o as THREE.Mesh).isMesh)o.userData.actorId=id;});}
 foot(side='right'){return this.surface(`foot-${side}`)??this.joint(`foot-${side}`)?.getWorldPosition(new THREE.Vector3())??this.group.position.clone();}
 seat(){return this.surface('hips','min')??this.joint('hips')?.getWorldPosition(new THREE.Vector3())??this.group.position.clone();}
 duration(clip:string){return this.actions.get(this.findClip(clip)??'')?.getClip().duration??1;}
 hand(side='right'){return this.surface(`hand-${side}`)??this.joint(`hand-${side}`)?.getWorldPosition(new THREE.Vector3())??this.group.position.clone().add(new THREE.Vector3(0,10,0));}
 head(){return this.surface('head','max')??this.group.position.clone().add(new THREE.Vector3(0,17.5,0));}
 snapshot(){return{clip:this.requested,resolvedClip:this.current,leg:this.joint('leg-left')?.quaternion.toArray(),position:this.group.position.toArray(),skinned:true,height:this.height,profile:this.model.userData.profile??'imported'};}
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);this.model.traverse(o=>{const mesh=o as THREE.SkinnedMesh;if(!mesh.isMesh)return;mesh.geometry.dispose();for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();if(mesh.isSkinnedMesh)mesh.skeleton.dispose();});this.group.removeFromParent();}
}
