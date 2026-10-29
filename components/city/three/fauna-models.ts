import * as THREE from 'three';
import type {animalsAt} from '../../../lib/life.ts';
import {groundElevation} from '../../../lib/city/ground.ts';
import {StudioFeline} from '../../studio/feline.ts';
import {AnimalRig} from './animal-rig.ts';
import {createFauna as createFallbackFauna} from './fauna-fallback.ts';
import type {createSharedPrimitives} from './humans.ts';
import type {AssetLibrary} from './assets.ts';
type Animal=ReturnType<typeof animalsAt>[number];
/** Studio feline + reviewed native rigs. Original sparrows stay species-correct. */
export function createFauna(scene:THREE.Scene,geometry:ReturnType<typeof createSharedPrimitives>,library:AssetLibrary){
 const fallback=createFallbackFauna(scene,geometry),entries=new Map<string,{cat?:StudioFeline;rig?:AnimalRig;modelId:string;x:number;z:number;yaw:number;travel:number;posed:boolean;draws:number}>();
 const release=(id:string)=>{const e=entries.get(id);if(!e)return;e.rig?.dispose();if(e.cat){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();e.cat.group.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){geometries.add(m.geometry);for(const mat of Array.isArray(m.material)?m.material:[m.material])materials.add(mat);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());e.cat.group.removeFromParent();}entries.delete(id);};
 return {
  draw(animals:Animal[],clock:number,dt:number,paused:boolean){
   const active=new Set(animals.map(a=>a.id));for(const id of entries.keys())if(!active.has(id))release(id);
   const missing:Animal[]=[];
   for(const a of animals){
    const modelId=a.species==='cat'?'studio/articulated-feline':a.modelId??(a.species==='dog'?'gobkit-animal/corgi':'');
    if(!modelId||a.species!=='cat'&&!library.get(modelId)){missing.push(a);continue;}
    let e=entries.get(a.id);if(!e){e={modelId,x:a.position[0],z:a.position[1],yaw:.4,travel:0,posed:false,draws:0};if(a.species==='cat'){e.cat=new StudioFeline();e.cat.group.scale.setScalar(1.9);scene.add(e.cat.group);}else{e.rig=new AnimalRig(library.get(modelId)!,a.species==='bird'?3.3:5.2);scene.add(e.rig.group);}const entry=e;(e.cat?.group??e.rig!.group).traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;const before=mesh.onBeforeRender;mesh.onBeforeRender=(...args)=>{before.apply(mesh,args);entry.draws++;};});entries.set(a.id,e);}
    if(paused&&e.posed)continue;
    const dx=a.position[0]-e.x,dz=a.position[1]-e.z,distance=Math.min(3,Math.hypot(dx,dz)),moving=a.walking&&distance>.001;
    if(!paused){e.travel+=distance;if(moving){const wanted=Math.atan2(dx,dz),alpha=1-Math.exp(-8*Math.max(0,Math.min(.15,dt)));e.yaw+=Math.atan2(Math.sin(wanted-e.yaw),Math.cos(wanted-e.yaw))*alpha;}}
    const floor=groundElevation(...a.position);
    if(e.cat){e.cat.pose(clock,[a.position[0],floor,a.position[1]],e.yaw,!moving,false);e.cat.locomotion(e.travel*Math.PI*2/9,moving?1:0);e.cat.group.updateMatrixWorld(true);e.cat.group.position.y+=floor-new THREE.Box3().setFromObject(e.cat.group,true).min.y;}else e.rig!.pose(moving,moving?e.travel/8:clock,a.position,e.yaw,floor);
    e.x=a.position[0];e.z=a.position[1];e.posed=true;
   }
   fallback.draw(missing,clock,dt,paused);
  },
  snapshots:()=>Object.fromEntries([...entries].map(([id,e])=>[id,{modelId:e.modelId,travel:e.travel,position:(e.cat?.group??e.rig!.group).position.toArray()}])),
  rendered:()=>Object.fromEntries([...entries].map(([id,e])=>[id,e.draws])),
  stats:{batches:5},dispose(){for(const id of [...entries.keys()])release(id);},
 };
}
