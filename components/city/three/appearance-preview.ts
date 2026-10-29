import * as THREE from 'three';
import type {Appearance} from '../../../lib/city/appearance.ts';
import {AssetLibrary} from './assets.ts';
import {RiggedAvatar} from './rigged-avatar.ts';

/** Same model and tint path as the city, drawn only on appearance/size changes. */
export async function createAppearancePreview(host:HTMLDivElement,appearance:()=>Appearance,modelId:string,signal?:AbortSignal){
 const library=new AssetLibrary();
 let renderer:THREE.WebGLRenderer;
 try{await library.load(modelId);if(signal?.aborted||!host.isConnected)throw new DOMException('Preview cancelled','AbortError');renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}
 catch(error){library.dispose();throw error;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,200),avatar=new RiggedAvatar(library.get(modelId)!);
 avatar.pose('idle',0,0,[0,0],-.25,0);scene.add(avatar.group,new THREE.HemisphereLight('#ffffff','#788564',3));
 const light=new THREE.DirectionalLight('#fff4d2',2);light.position.set(8,30,20);scene.add(light);host.appendChild(renderer.domElement);
 let dead=false;
 const draw=()=>{if(dead)return;avatar.tint(appearance());const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);
  const bounds=new THREE.Box3().setFromObject(avatar.group,true),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),tan=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),distance=Math.max(size.y/(2*tan*.8),size.x/(2*tan*camera.aspect*.8));camera.position.copy(center).addScaledVector(new THREE.Vector3(.4,.15,1).normalize(),distance);camera.lookAt(center);renderer.render(scene,camera);host.dataset.model=modelId;host.dataset.profile=avatar.snapshot().profile;host.dataset.ready='true';};
 const observer=new ResizeObserver(draw);
 const dispose=()=>{if(dead)return;dead=true;observer.disconnect();avatar.dispose();library.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 try{observer.observe(host);draw();}catch(error){dispose();throw error;}
 return {draw,dispose};
}
