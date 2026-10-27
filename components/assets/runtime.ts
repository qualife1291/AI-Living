import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {AssetLibrary,approvedAssets} from '../city/three/assets.ts';
import {RiggedAvatar} from '../city/three/rigged-avatar.ts';
export async function createAssetViewer(host:HTMLDivElement,onClips:(clips:string[])=>void,onError:(message:string)=>void) {
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#d6e9e6');scene.add(new THREE.HemisphereLight('#fff8eb','#9aaf95',2));const sun=new THREE.DirectionalLight('#fff1d6',2.5);sun.position.set(-15,30,25);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(35,1,.1,1000);camera.position.set(25,18,38);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,8,0);controls.enableDamping=true;controls.minDistance=8;controls.maxDistance=120;controls.maxPolarAngle=Math.PI/2-.02;
 const floor=new THREE.Mesh(new THREE.CircleGeometry(32,48),new THREE.MeshLambertMaterial({color:'#c9cfad'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.08;scene.add(floor);
 let dirty=true,dead=false,version=0,frame=0,last=0,time=0,poseVersion=0,playing=true,clip='idle',library:AssetLibrary|undefined,pendingLibrary:AssetLibrary|undefined,avatar:RiggedAvatar|undefined,staticRoot:THREE.Group|undefined;
 const resize=new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();dirty=true;});resize.observe(host);
 const disposeModel=()=>{avatar?.dispose();avatar=undefined;if(staticRoot)scene.remove(staticRoot);staticRoot=undefined;library?.dispose();library=undefined;};
 async function select(id:string) {
  const ticket=++version;pendingLibrary?.dispose();disposeModel();dirty=true;host.dataset.loading='true';onError('');
  const extra=id.startsWith('kaykit-adventurers/')?['kaykit-adventurers/rig_medium_general','kaykit-adventurers/rig_medium_movement-basic']:[];
  const next=new AssetLibrary();pendingLibrary=next;await next.preload([id,...extra],8000);
  if(dead||ticket!==version){next.dispose();return;}
  const source=next.get(id);if(!source){next.dispose();onError('Chưa tải được model. Hãy chọn lại để thử.');host.dataset.loading='false';return;}
  pendingLibrary=undefined;library=next;let skinned=false;source.scene.traverse(o=>{if((o as THREE.SkinnedMesh).isSkinnedMesh)skinned=true;});
  if(skinned){const animationSources=extra.flatMap(key=>next.get(key)?.animations??[]);avatar=new RiggedAvatar({...source,animations:source.animations.length?source.animations:animationSources},18,100);scene.add(avatar.group);onClips((source.animations.length?source.animations:animationSources).map(a=>a.name));}
  else {const object=source.scene.clone(true),box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=18/Math.max(...size);object.position.set(-center.x,-box.min.y,-center.z);staticRoot=new THREE.Group();staticRoot.add(object);staticRoot.scale.setScalar(scale);scene.add(staticRoot);onClips([]);}
  clip='idle';time=0;poseVersion+=1000;dirty=true;host.dataset.model=id;host.dataset.loading='false';host.dataset.skinned=String(skinned);host.dataset.ready='true';camera.position.set(25,18,38);controls.target.set(0,8,0);controls.update();
 }
 function tick(stamp:number){if(dead)return;frame=requestAnimationFrame(tick);const dt=last?Math.min(.2,(stamp-last)/1000):0;last=stamp;if(document.hidden)return;
  if(avatar&&(playing||dirty)){if(playing)time+=dt;avatar.pose(clip,time,poseVersion+time,[0,0,0],0,0);dirty=true;}
  const moved=controls.update();if(!dirty&&!moved)return;renderer.render(scene,camera);dirty=false;host.dataset.renderedModel=host.dataset.model??'';host.dataset.frames=String(Number(host.dataset.frames??0)+1);host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.clip=avatar?.snapshot().resolvedClip??'static';
 }
 frame=requestAnimationFrame(tick);
 return {select,play(value:boolean){playing=value;dirty=true;},animation(value:string){clip=value;time=0;poseVersion+=1000;dirty=true;},dispose(){dead=true;version++;cancelAnimationFrame(frame);resize.disconnect();controls.dispose();pendingLibrary?.dispose();disposeModel();floor.geometry.dispose();(floor.material as THREE.Material).dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();},metadata:(id:string)=>approvedAssets.find(a=>a.id===id)};
}
