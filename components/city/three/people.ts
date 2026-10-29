import * as THREE from 'three';
import {createSharedPrimitives,HumanMotion} from './humans.ts';
import {CrowdBatch} from './crowd-batch.ts';
import type {AssetLibrary} from './assets.ts';
import {CORE_MODELS,CITIZEN_MODELS,CITIZEN_FALLBACK,residentModel} from '../../../lib/city/character-models.ts';
import {defaultAppearance} from '../../../lib/city/appearance.ts';
import type {Quality} from '../../../lib/city/scale.ts';
import {groundElevation} from '../../../lib/city/ground.ts';
import type {Actor} from '../../../lib/life.ts';
import type {World} from '../../../lib/world';
import type {SocialPose} from '../../../lib/living/social.ts';
import {actorActionKind,resolveActorClip,simpleProp,placeActionProp} from './model-actors.ts';
import {hasHandProp} from '../../../lib/living/action-presentation.ts';
import {createBicycle,spinBicycle} from './activity-props.ts';

/** Distant residents share the same approved skin/palette as the close cast.
 * Eight interpolated samples replace per-resident skeletal controllers. */
export function createPeople(scene:THREE.Scene,capacity:number,library:Pick<AssetLibrary,'get'|'load'|'failures'>&Partial<Pick<AssetLibrary,'compile'>>){
 const geometry=createSharedPrimitives(),motion=new HumanMotion(),batches=new Map<string,{batch:CrowdBatch;used:number}>(),bicycles=new Map<string,THREE.Group>();
 const props=new Map<string,{kind:string;group:THREE.Group}>();
 const release=(group:THREE.Group)=>{group.removeFromParent();group.traverse(o=>{const m=o as THREE.Mesh;m.geometry?.dispose();if(m.material)for(const material of Array.isArray(m.material)?m.material:[m.material])material.dispose();});};
 const heads=new Map<string,THREE.Vector3>(),assignments=new Map<string,string>();
 let built=false,clock=0,quality:Quality='balanced';
 function batchFor(modelId:string,kind:string){
  const key=modelId+'/'+kind,existing=batches.get(key);if(existing){existing.used=clock;return existing.batch;}
  if(built||!library.get(modelId))return;
  built=true;const batch=new CrowdBatch(library.get(modelId)!,modelId,kind,capacity);batch.mesh.receiveShadow=quality!=='eco';scene.add(batch.mesh);batches.set(key,{batch,used:clock});return batch;
 }
 // Warm one cheap idle batch per available style so a new action never hides a resident.
 for(const id of CITIZEN_MODELS){built=false;batchFor(id,'idle');}built=false;
 return {
  geometry,
  setQuality(next:Quality='balanced'){quality=next;for(const {batch} of batches.values())batch.mesh.receiveShadow=quality!=='eco';},
  collectGeometry(target:Set<THREE.BufferGeometry>){for(const g of Object.values(geometry))target.add(g);},
  head:(id:string)=>heads.get(id)?.clone(),
  lift:(id:string)=>motion.lift(id),
  phase:(id:string)=>motion.phase(id),
  draw(world:World,actors:Actor[],poses:Map<string,SocialPose>,seconds:number,dt:number,_camera:THREE.Camera,_selected:string,skip=new Set<string>()){
   built=false;clock=seconds;heads.clear();assignments.clear();for(const {batch} of batches.values())batch.reset();
   for(const value of props.values())value.group.visible=false;
   for(const [id,bike] of bicycles)bike.visible=!skip.has(id)&&actors.some(a=>a.id===id&&!!a.bicycle);
   const frames=motion.frame(actors,poses,seconds,dt,world.paused),headings=new Map<string,number>();
   for(const actor of actors){
    const yaw=frames.get(actor.id)!.yaw;headings.set(actor.id,yaw);if(skip.has(actor.id))continue;
    const core=world.people.find(p=>p.id===actor.id),npc=world.living?.residents.find(p=>p.id===actor.id),wanted=CORE_MODELS[actor.id]??residentModel(npc?.roleId??'',actor.id);
    if(!library.get(wanted)&&!library.failures.has(wanted))void library.load(wanted).catch(()=>{});
    const modelId=library.get(wanted)?wanted:library.get(CITIZEN_FALLBACK)?CITIZEN_FALLBACK:undefined;if(!modelId)continue;
    const clip=resolveActorClip(actor,poses.get(actor.id)?.speaking),kind=actor.bicycle?'cycle':actor.walking||actor.kind==='run'?clip:poses.has(actor.id)?actorActionKind(actor)+'|'+(poses.get(actor.id)?.speaking?'talk':'listen'):clip==='sit'?'sit':actorActionKind(actor),batch=batchFor(modelId,kind)??batchFor(modelId,'idle')??batches.get(CITIZEN_FALLBACK+'/idle')?.batch;
    const appearance=world.living?.appearances?.[actor.id]??defaultAppearance(actor.id,core?.role??npc?.roleId);
    if(batch){const time=kind==='cycle'?(actor.bicycle?.distance??0)/3:actor.walking?motion.phase(actor.id)/(Math.PI*2)*batch.period:seconds;batch.add(actor.id,actor.position,yaw,time,appearance,motion.lift(actor.id));heads.set(actor.id,batch.head(time,actor.position,yaw).add(new THREE.Vector3(0,motion.lift(actor.id),0)));assignments.set(actor.id,batch.modelId);
     const propKind=actorActionKind(actor);
     if(_camera.position.distanceTo(new THREE.Vector3(actor.position[0],groundElevation(...actor.position)+8,actor.position[1]))<300&&!actor.walking&&!actor.bicycle&&(hasHandProp(actor.kind)||['cook','soccer','swim','lantern'].includes(propKind))){
      let prop=props.get(actor.id);if(prop?.kind!==propKind){if(prop)release(prop.group);const group=simpleProp(propKind,library);group.traverse(o=>{if((o as THREE.Mesh).isMesh)o.userData.actorId=actor.id;});scene.add(group);prop={kind:propKind,group};props.set(actor.id,prop);}
      prop.group.visible=true;placeActionProp(prop.group,propKind,batch.height,yaw,new THREE.Vector3(actor.position[0],groundElevation(...actor.position),actor.position[1]),{left:batch.hand('left',time,actor.position,yaw).add(new THREE.Vector3(0,motion.lift(actor.id),0)),right:batch.hand('right',time,actor.position,yaw).add(new THREE.Vector3(0,motion.lift(actor.id),0))},time);
     }
    }
    if(actor.bicycle&&!bicycles.has(actor.id)){const bike=createBicycle();bike.traverse(o=>{if((o as THREE.Mesh).isMesh)o.userData.actorId=actor.id;});scene.add(bike);bicycles.set(actor.id,bike);}
    const bike=bicycles.get(actor.id);if(bike){bike.visible=!!actor.bicycle;bike.position.set(actor.position[0],groundElevation(...actor.position),actor.position[1]);bike.rotation.y=yaw;if(actor.bicycle)spinBicycle(bike,actor.bicycle.distance);}
   }
   const active=new Set(actors.map(a=>a.id));for(const [id,prop] of props)if(!active.has(id)||skip.has(id)){release(prop.group);props.delete(id);}for(const [id,bike] of bicycles)if(!active.has(id)||skip.has(id)){release(bike);bicycles.delete(id);}
   for(const [key,value] of batches){value.batch.flush();if(value.batch.kind!=='idle'&&!value.batch.mesh.count&&seconds-value.used>20){value.batch.dispose();batches.delete(key);}}
   return headings;
  },
  stats:()=>({batches:[...batches.values()].filter(b=>b.batch.mesh.count).length,instances:[...batches.values()].reduce((sum,b)=>sum+b.batch.mesh.count,0),modelIds:[...new Set([...batches.values()].filter(b=>b.batch.mesh.count).map(b=>b.batch.modelId))],style:'same-approved-civilian-skins',samples:8,assignments:Object.fromEntries(assignments)}),
  dispose(){for(const {batch} of batches.values())batch.dispose();batches.clear();for(const bike of bicycles.values())release(bike);bicycles.clear();for(const prop of props.values())release(prop.group);props.clear();},
 };
}
