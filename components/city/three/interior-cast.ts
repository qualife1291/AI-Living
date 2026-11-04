import * as THREE from 'three';
import {AssetLibrary} from './assets.ts';
import {RiggedAvatar} from './rigged-avatar.ts';
import {HOME_BEDS,SOFA_SEATS,cinemaSeat,lieOnBed,sitOnSeat} from './home-poses.ts';
import {reachLimb} from './limb-contact.ts';
import {simpleProp,placeActionProp} from './model-actors.ts';
import {CORE_MODELS,residentModel} from '../../../lib/city/character-models.ts';
import {defaultAppearance} from '../../../lib/city/appearance.ts';
import {interiorAction,interiorProp,type InteriorAction} from '../../../lib/city/interior-actions.ts';
import type {Actor} from '../../../lib/life.ts';
import type {World} from '../../../lib/world.ts';

export const INTERIOR_CAST_LIMIT=8;
const Y=new THREE.Vector3(0,1,0);
type Entry={avatar:RiggedAvatar;modelId:string;action:InteriorAction;draws:number;
  prop?:THREE.Group;propKey?:string;lastPose?:string;support?:string};
const propKinds:Record<string,string>={plate:'bread',cup:'cup',pan:'cook',book:'read',tablet:'phone',bag:'bag',tool:'tool',medical:'work'};
function releaseProp(entry:Entry){
  entry.prop?.removeFromParent();entry.prop?.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;
    m.geometry.dispose();for(const material of Array.isArray(m.material)?m.material:[m.material])material.dispose();});
  entry.prop=undefined;entry.propKey=undefined;
}
/** Stable, bounded illustrative room slots; never writes navigation or occupancy. */
export function interiorSlot(index:number,home=false):[number,number,number]{
  if(home)return [[2.95,0,-.4],[2.95,0,1.9],[-5.6,0,4.5],[-3.3,0,4.5],[-1,0,4.5],[1.3,0,4.5],[4.9,0,.4],[4.9,0,3.3]][index] as [number,number,number];
  return [[-1.75,0,-1.8],[2.75,0,-1.8],[-1.75,0,2.4],[2.75,0,2.4],
    [5.3,0,-.6],[5.3,0,1.5],[5.3,0,3.6],[2.75,0,4.5]][index] as [number,number,number];
}
/** Same reviewed civilian rigs/wardrobe as city and Studio. No legacy figures,
 * synthetic occupants, physics receipts, learning writes or fixed preload race. */
export function createInteriorCast(scene:THREE.Scene,library:AssetLibrary){
  const entries=new Map<string,Entry>(),requested=new Set<string>();let dead=false;
  function request(id:string){
    if(dead||library.get(id)||requested.has(id))return;
    requested.add(id);void library.load(id).catch(()=>{});
  }
  function remove(id:string){const e=entries.get(id);if(e){releaseProp(e);e.avatar.dispose();entries.delete(id);}}
  return {
    draw(world:World,actors:readonly Actor[],seconds:number,floor:number,focusId='',home=false,cinema=false){
      if(dead)return;
      let beds=0,seats=0;
      const shown=floor===0?[...actors].sort((a,b)=>Number(b.id===focusId)-Number(a.id===focusId)).filter(a=>{
        const action=interiorAction(a.kind,a.activity);
        if(home&&action==='sleep')return beds++<HOME_BEDS.length;
        if(home&&action==='watch-tv')return seats++<SOFA_SEATS.length;
        return true;
      }).slice(0,INTERIOR_CAST_LIMIT):[];
      let bedSlot=0,sofaSlot=0;
      const wanted=new Set(shown.map(a=>a.id));for(const id of entries.keys())if(!wanted.has(id))remove(id);
      shown.forEach((actor,index)=>{
        const resident=world.living?.residents.find(r=>r.id===actor.id),role=world.people.find(p=>p.id===actor.id)?.role??resident?.roleId??'';
        const modelId=CORE_MODELS[actor.id]??residentModel(resident?.roleId??role,actor.id);
        request(modelId);request('supplied/props/book');
        let entry=entries.get(actor.id);
        if(entry&&entry.modelId!==modelId&&library.get(modelId)){remove(actor.id);entry=undefined;}
        if(!entry){const source=library.get(modelId);if(!source)return;
          const avatar=new RiggedAvatar(source,2.6,.85,true);avatar.assignId(actor.id);scene.add(avatar.group);
          entry={avatar,modelId,action:'observe',draws:0};entries.set(actor.id,entry);
          const own=entry;avatar.group.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;
            const previous=m.onBeforeRender;m.onBeforeRender=function(...args){own.draws++;previous.apply(this,args);};});
        }
        const action=interiorAction(actor.kind,actor.activity),avatar=entry.avatar;
        const appearance=world.living?.appearances?.[actor.id]??defaultAppearance(actor.id,role);
        avatar.tint(appearance);
        // Paused worlds can receive appearance/selection updates without pose
        // drift. Absolute sampling also keeps late-loaded models on the clock.
        const nativeBook=!!library.compile('supplied/props/book');
        const sleeping=home&&action==='sleep',watching=(home&&action==='watch-tv')||(cinema&&action==='watch-film');
        const bedIndex=sleeping?bedSlot++:undefined,sofaIndex=home&&action==='watch-tv'?sofaSlot++:undefined;
        const slot=action==='fridge'&&home?[-6.7,0,-1.2] as [number,number,number]:watching?(cinema?cinemaSeat(index):[...SOFA_SEATS[sofaIndex!]] as [number,number,number]):interiorSlot(index,home);
        const key=[seconds,index,action,home,cinema,bedIndex,sofaIndex,nativeBook].join('/');
        if(entry.lastPose===key)return;
        entry.lastPose=key;entry.action=action;
        const yaw=watching||action==='fridge'?Math.PI:-Math.PI/2,h=avatar.height,base=new THREE.Vector3(...slot);
        avatar.poseTimeline([{clip:'idle',time:seconds,weight:1}],slot,yaw);
        const target=(side:'left'|'right',x:number,y:number,z:number)=>{
          const p=new THREE.Vector3((side==='left'?1:-1)*x*h,y*h,z*h).applyAxisAngle(Y,yaw).add(base);
          reachLimb(avatar,side,p);
        };
        const beat=Math.sin(seconds*2.1+index),slow=Math.sin(seconds*.65+index);
        if(['read','study','write','type','repair','pack','cook','wash','clean','tidy','garden','shop','browse','care'].includes(action)){
          target('left',.075,.65-.012*beat,.16);target('right',.075,.65+.012*beat,.16);
          avatar.joint('head')?.rotateX(.1);
        }else if(['eat','drink','serve'].includes(action))target('right',.045,.64+.13*(1-Math.cos(seconds*1.5))*.5,.14);
        else if(action==='social')target('right',.09,.64+.1*Math.max(0,slow),.11);
        else if(action==='exercise'){target('left',.12,.75+.09*beat,.1);target('right',.12,.75-.09*beat,.1);}
        else avatar.joint('head')?.rotateY(slow*(action==='sleep'?.01:.045));
        avatar.group.updateMatrixWorld(true);
        entry.support=undefined;
        if(sleeping){entry.support=lieOnBed(avatar,bedIndex!).id;}
        else if(watching){sitOnSeat(avatar,slot);entry.support=cinema?'cinema-seat-'+index:'sofa-seat-'+sofaIndex;}
        else if(home&&action==='fridge'){target('right',.05,.68,.27);avatar.group.updateMatrixWorld(true);}
        // Support is an illustrative contact with room geometry, not ownership,
        // floor authority, productive completion or a new learning receipt.
        const prop=interiorProp(action),kind=propKinds[prop];
        const propKey=kind?kind+'/'+(kind==='read'&&nativeBook?'native':'basic'):undefined;
        if(entry.propKey!==propKey){releaseProp(entry);if(kind){entry.prop=simpleProp(kind,library);entry.propKey=propKey;scene.add(entry.prop);}}
        if(entry.prop&&kind){placeActionProp(entry.prop,kind,h,yaw,base,{left:avatar.hand('left'),right:avatar.hand('right')},seconds);entry.prop.updateMatrixWorld(true);}
      });
    },
    snapshots(){return [...entries].map(([id,e])=>({id,modelId:e.modelId,action:e.action,height:e.avatar.height,
      position:e.avatar.group.position.toArray(),head:e.avatar.head().toArray(),hands:{left:e.avatar.hand('left').toArray(),right:e.avatar.hand('right').toArray()},
      prop:e.propKey??null,support:e.support??null,draws:e.draws}));},
    focus(id:string){const avatar=entries.get(id)?.avatar;return avatar?.head().add(avatar.seat()).multiplyScalar(.5);},
    dispose(){if(dead)return;dead=true;for(const id of [...entries.keys()])remove(id);},
  };
}
