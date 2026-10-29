import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import type {Actor} from '../../../lib/life.ts';
import {groundElevation} from '../../../lib/city/ground.ts';
import {RiggedAvatar} from './rigged-avatar.ts';
import {ActorActions} from './actor-actions.ts';

const FRAMES=8,WIDTH=1024;
/** Shared samples of the actual civilian skin; no substitute body geometry.
 * The GPU interpolates two samples. CPU picking reads those identical samples. */
export class CrowdBatch {
 readonly mesh:THREE.InstancedMesh;
 readonly period:number;
 readonly modelId:string;
 readonly kind:string;
 private positions:Float32Array[]=[];
 private heads:THREE.Vector3[]=[];
 private hands:{left:THREE.Vector3;right:THREE.Vector3}[]=[];
 readonly height:number;
 private atlas:THREE.DataTexture;
 private proxy:THREE.Mesh;
 private phase:THREE.InstancedBufferAttribute;
 private tones:THREE.InstancedBufferAttribute[];
 constructor(source:GLTF,modelId:string,kind:string,capacity:number){
  this.modelId=modelId;this.kind=kind;
  const rig=new RiggedAvatar(source),actions=new ActorActions(),floor=groundElevation(0,0);
  this.height=rig.height;
  let skin:THREE.SkinnedMesh|undefined;rig.model.traverse(o=>{if((o as THREE.SkinnedMesh).isSkinnedMesh)skin=o as THREE.SkinnedMesh;});
  if(!skin)throw Error('Crowd requires an approved civilian skin');
  const body=skin as THREE.SkinnedMesh,geometry=body.geometry.clone(),count=geometry.getAttribute('position').count;
  const clip=['walk','sprint','sit','talk','listen'].includes(kind)?kind:kind==='cycle'?'drive':'idle';
  this.period=['walk','sprint','idle','sit','talk','listen'].includes(kind)?rig.duration(clip):kind==='cycle'?Math.PI*2:['cup','bread'].includes(kind)?Math.PI*2/1.5:Math.PI;
  const data=new Float32Array(WIDTH*Math.ceil(count*FRAMES*2/WIDTH)*4),p=new THREE.Vector3();
  for(let f=0;f<FRAMES;f++){
   const time=f/FRAMES*this.period,actor={id:'bake',kind,walking:['walk','sprint'].includes(kind),position:[0,0],...(kind==='cycle'?{bicycle:{distance:time*3}}:{})} as Actor;
   rig.pose(clip,kind==='cycle'?0:time,10+f*2,[0,0],0,floor+(kind==='cycle'?4:0));
   actions.apply(rig,actor,kind,time);
   this.heads.push(rig.head().sub(new THREE.Vector3(0,floor,0)));
   this.hands.push({left:rig.hand('left').sub(new THREE.Vector3(0,floor,0)),right:rig.hand('right').sub(new THREE.Vector3(0,floor,0))});
   const positions=new Float32Array(count*3);
   for(let i=0;i<count;i++){body.getVertexPosition(i,p).applyMatrix4(body.matrixWorld);p.y-=floor;p.toArray(positions,i*3);}
   this.positions.push(positions);geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.computeVertexNormals();
   const normals=geometry.getAttribute('normal');
   for(let i=0;i<count;i++)for(let n=0;n<3;n++){data[((f*2)*count+i)*4+n]=positions[i*3+n];data[((f*2+1)*count+i)*4+n]=normals.getComponent(i,n);}
  }
  geometry.setAttribute('position',new THREE.BufferAttribute(this.positions[0].slice(),3));
  geometry.setAttribute('poseVertex',new THREE.BufferAttribute(Float32Array.from({length:count},(_,i)=>i),1));
  this.phase=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);geometry.setAttribute('posePhase',this.phase);
  this.tones=['shirtTone','trousersTone','skinTone'].map(name=>{const a=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);geometry.setAttribute(name,a);return a;});
  this.atlas=new THREE.DataTexture(data,WIDTH,data.length/(WIDTH*4),THREE.RGBAFormat,THREE.FloatType);this.atlas.needsUpdate=true;
  const original=body.material as THREE.MeshPhongMaterial,material=new THREE.MeshPhongMaterial({map:original.map,color:original.color,side:original.side,shininess:12,alphaTest:original.alphaTest});
  material.onBeforeCompile=shader=>{
   shader.uniforms.poseAtlas={value:this.atlas};
   const sample=`vec3 samplePose(float frame,float normalPart){float i=(frame*2.0+normalPart)*${count}.0+poseVertex;return texture2D(poseAtlas,(vec2(mod(i,${WIDTH}.0),floor(i/${WIDTH}.0))+.5)/vec2(${WIDTH}.0,${data.length/(WIDTH*4)}.0)).xyz;}`;
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nuniform sampler2D poseAtlas; attribute float poseVertex; attribute float posePhase; attribute float wardrobe; attribute vec3 shirtTone; attribute vec3 trousersTone; attribute vec3 skinTone; varying float vWardrobe; varying vec3 vShirt; varying vec3 vTrousers; varying vec3 vSkin;\n${sample}`)
    .replace('#include <beginnormal_vertex>',`float pf=mod(posePhase,${FRAMES}.0);float pa=floor(pf);float pb=mod(pa+1.0,${FRAMES}.0);float pm=fract(pf);vec3 objectNormal=normalize(mix(samplePose(pa,1.0),samplePose(pb,1.0),pm));`)
    .replace('#include <begin_vertex>','vec3 transformed=mix(samplePose(pa,0.0),samplePose(pb,0.0),pm);vWardrobe=wardrobe;vShirt=shirtTone;vTrousers=trousersTone;vSkin=skinTone;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vWardrobe; varying vec3 vShirt; varying vec3 vTrousers; varying vec3 vSkin;')
    .replace('#include <map_fragment>','#include <map_fragment>\nfloat clothLight=.7+.3*dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));if(vWardrobe>2.5)diffuseColor.rgb=vSkin*clothLight;else if(vWardrobe>1.5)diffuseColor.rgb=vTrousers*clothLight;else if(vWardrobe>.5)diffuseColor.rgb=vShirt*clothLight;');
  };
  material.customProgramCacheKey=()=>`civilian-pose-atlas-v1-${count}-${data.length}`;
  this.mesh=new THREE.InstancedMesh(geometry,material,capacity);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.receiveShadow=true;this.mesh.userData.ids=[];this.mesh.userData.modelId=modelId;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const pickGeometry=geometry.clone();pickGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));this.proxy=new THREE.Mesh(pickGeometry,material);this.proxy.matrixAutoUpdate=false;
  this.mesh.raycast=(ray,hits)=>{
   const transform=new THREE.Matrix4(),sphere=new THREE.Sphere(),center=new THREE.Vector3();
   for(let i=0;i<this.mesh.count;i++){
    this.mesh.getMatrixAt(i,transform);transform.premultiply(this.mesh.matrixWorld);center.set(0,9,0).applyMatrix4(transform);sphere.set(center,15);
    if(!ray.ray.intersectsSphere(sphere))continue;
    const positions=this.sample(this.phase.getX(i));(pickGeometry.getAttribute('position') as THREE.BufferAttribute).array.set(positions);pickGeometry.boundingSphere=null;pickGeometry.boundingBox=null;this.proxy.matrixWorld.copy(transform);
    const found:THREE.Intersection[]=[];this.proxy.raycast(ray,found);for(const hit of found)hits.push({...hit,object:this.mesh,instanceId:i});
   }
  };
  rig.dispose();
 }
 /** Same linear interpolation as the vertex shader, also used for acceptance. */
 sample(phase:number){const p=((phase%FRAMES)+FRAMES)%FRAMES,a=Math.floor(p),b=(a+1)%FRAMES,t=p-a,output=new Float32Array(this.positions[0].length);for(let i=0;i<output.length;i++)output[i]=this.positions[a][i]*(1-t)+this.positions[b][i]*t;return output;}
 head(seconds:number,position:readonly number[],yaw:number){const f=((seconds/this.period)%1+1)%1*FRAMES,a=Math.floor(f),b=(a+1)%FRAMES;return this.heads[a].clone().lerp(this.heads[b],f-a).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(new THREE.Vector3(position[0],groundElevation(position[0],position[1]),position[1]));}
 hand(side:'left'|'right',seconds:number,position:readonly number[],yaw:number){const f=((seconds/this.period)%1+1)%1*FRAMES,a=Math.floor(f),b=(a+1)%FRAMES;return this.hands[a][side].clone().lerp(this.hands[b][side],f-a).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(new THREE.Vector3(position[0],groundElevation(position[0],position[1]),position[1]));}
 add(id:string,position:readonly number[],yaw:number,seconds:number,colors:{shirt:string;trousers:string;skin:string}){
  const i=this.mesh.count++;if(i>=this.mesh.instanceMatrix.count)throw Error('Crowd capacity exceeded');
  const matrix=new THREE.Matrix4().makeRotationY(yaw);matrix.setPosition(position[0],groundElevation(position[0],position[1]),position[1]);this.mesh.setMatrixAt(i,matrix);this.mesh.userData.ids[i]=id;
  this.phase.setX(i,((seconds/this.period)%1+1)%1*FRAMES);['shirt','trousers','skin'].forEach((key,j)=>new THREE.Color(colors[key as keyof typeof colors]).toArray(this.tones[j].array,i*3));
 }
 reset(){this.mesh.count=0;this.mesh.userData.ids.length=0;}
 flush(){this.mesh.instanceMatrix.needsUpdate=true;this.phase.needsUpdate=true;for(const a of this.tones)a.needsUpdate=true;}
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();this.proxy.geometry.dispose();this.atlas.dispose();}
}
