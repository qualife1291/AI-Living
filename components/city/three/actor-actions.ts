import * as THREE from 'three';
import type {Actor} from '../../../lib/life.ts';
import {groundElevation} from '../../../lib/city/ground.ts';
import type {RiggedAvatar} from './rigged-avatar.ts';
import {reachLimb} from './limb-contact.ts';
type Hands={left:THREE.Vector3;right:THREE.Vector3};
type State={key:string;started:number;from:Hands;last:Hands};
const sides=['left','right'] as const,Y=new THREE.Vector3(0,1,0);
/** Presentation-only action contacts. No roots, plans, inventory or rewards are written. */
export class ActorActions{
 private states=new Map<string,State>();
 forget(id:string){this.states.delete(id);}
 apply(avatar:RiggedAvatar,actor:Actor,kind:string,seconds:number){
  const floor=groundElevation(...actor.position),origin=new THREE.Vector3(actor.position[0],floor,actor.position[1]),yaw=avatar.group.rotation.y,h=avatar.height;
  const toLocal=(p:THREE.Vector3)=>p.sub(origin).applyAxisAngle(Y,-yaw),toWorld=(p:THREE.Vector3)=>p.clone().applyAxisAngle(Y,yaw).add(origin);
  const base={left:toLocal(avatar.hand('left')),right:toLocal(avatar.hand('right'))},key=actor.bicycle?'cycle':actor.walking?'walk':kind;
  let state=this.states.get(actor.id);
  if(!state){state={key,started:seconds-.6,from:{left:base.left.clone(),right:base.right.clone()},last:{left:base.left.clone(),right:base.right.clone()}};this.states.set(actor.id,state);}
  if(state.key!==key){state.from={left:state.last.left.clone(),right:state.last.right.clone()};state.key=key;state.started=seconds;}
  const t=THREE.MathUtils.clamp((seconds-state.started)/.6,0,1),blend=t*t*(3-2*t),goals:Partial<Hands>={};
  const goal=(side:'left'|'right',x:number,y:number,z:number)=>{goals[side]=new THREE.Vector3((side==='left'?1:-1)*x*h,y*h,z*h);};
  if(!actor.walking&&!actor.bicycle){
   if(['read','study'].includes(kind)){for(const side of sides)goal(side,.075,.62,.145);avatar.joint('head')?.rotateX(.16*blend);}
   else if(['drink','eat','cup','bread'].includes(kind)){const sip=(1-Math.cos(seconds*1.5))*.5;goal('right',.045,.61+.18*sip,.115);}
   else if(['work','tool'].includes(kind))goal('right',.09,.57,.14);
   else if(['garden','can'].includes(kind))goal('right',.075,.57,.15);
   else if(['shop','bag'].includes(kind))goal('right',.14,.45,.06);
   else if(kind==='cook'){goal('right',.105,.59,.15);goals.left=new THREE.Vector3(.025*h+Math.sin(seconds*2)*.35,.68*h,.15*h+Math.cos(seconds*2)*.35);}
   else if(kind==='swim'){for(const side of sides)goal(side,.13,.64,.12+Math.sin(seconds*2+(side==='left'?0:Math.PI))*.035);}
   else if(['exercise','jump'].includes(kind)){for(const side of sides)goal(side,.10,.8+Math.sin(seconds*2+(side==='left'?0:Math.PI))*.09,.07);}
   else if(kind==='soccer'){
    const kick=Math.max(0,Math.sin(seconds*2));avatar.joint('leg-right')?.rotateX(-.4*kick*blend);avatar.joint('knee-right')?.rotateX(.4*kick*blend);avatar.joint('foot-right')?.rotateX(.1*kick*blend);
    for(const side of sides)goal(side,.12,.61,.06);
   }
  }
  if(actor.bicycle){
   for(const name of ['Hips','Spine','Spine1','Spine2','Neck','Head'])avatar.joint(name)?.quaternion.slerp(new THREE.Quaternion(),blend);
   avatar.joint('Spine')?.rotateX(.35*blend);avatar.group.updateMatrixWorld(true);
   avatar.group.position.y+=(floor+7.8-avatar.seat().y)*blend;avatar.group.updateMatrixWorld(true);
   const phase=actor.bicycle.distance/3;
   for(const side of sides){const foot=avatar.joint('foot-'+side);if(foot?.parent)foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromAxisAngle(Y,yaw)));avatar.group.updateMatrixWorld(true);const sign=side==='left'?1:-1,pedal=new THREE.Vector3(sign*1.35,3+sign*Math.sin(phase)*1.1,sign*Math.cos(phase)*1.1);reachLimb(avatar,side,avatar.foot(side).lerp(toWorld(pedal),blend),true);goals[side]=new THREE.Vector3(sign*2,9,3.5);}
  }
  avatar.group.updateMatrixWorld(true);
  for(const side of sides){const target=goals[side]??base[side],from=state.from[side];if(goals[side]||blend<1)reachLimb(avatar,side,toWorld(from.clone().lerp(target,blend)));}
  avatar.group.updateMatrixWorld(true);
  state.last={left:toLocal(avatar.hand('left')),right:toLocal(avatar.hand('right'))};
  return {kind:key,blend,hands:{left:avatar.hand('left').toArray(),right:avatar.hand('right').toArray()}};
 }
}
