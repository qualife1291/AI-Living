import * as THREE from 'three';
import type {RiggedAvatar} from './rigged-avatar.ts';
export const HOME_BEDS=[-4.3,.4].map((x,i)=>({id:'bed-'+i,x,z:.2,surface:1.13,width:3.05,depth:4.3}));
export const SOFA_SEATS=[[2.85,0,3.7],[4.15,0,3.7]] as const;
export const cinemaSeat=(index:number):[number,number,number]=>[-4+(index%3)*4,0,-1.4+Math.floor(index/3)*2.5];
/** Fit actual deformed skin to an existing mattress. Feet/head are measured
 * after rotation; the body is never simply tipped through a desk or floor. */
export function lieOnBed(avatar:RiggedAvatar,index:number){
  const bed=HOME_BEDS[index];avatar.group.rotation.set(-Math.PI/2,0,0);avatar.group.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(avatar.group,true),center=box.getCenter(new THREE.Vector3());
  avatar.group.position.add(new THREE.Vector3(bed.x-center.x,bed.surface-box.min.y,bed.z-center.z));
  avatar.group.updateMatrixWorld(true);return bed;
}
/** Bend existing legs, place hips on the real seat and keep soles above ground.
 * No detached procedural limbs or changes to physical/navigation roots. */
export function sitOnSeat(avatar:RiggedAvatar,point:readonly number[],height=.99){
  avatar.poseTimeline([{clip:'idle',time:0,weight:1}],point,Math.PI);
  for(const side of ['left','right']){
    const leg=avatar.joint('leg-'+side);leg?.rotateX(-1.38);
    leg?.children.find(b=>(b as THREE.Bone).isBone)?.rotateX(1.55);
  }
  avatar.group.updateMatrixWorld(true);avatar.group.position.y+=height-avatar.seat().y;
  avatar.group.updateMatrixWorld(true);
  const min=Math.min(avatar.foot('left').y,avatar.foot('right').y);
  if(min<.025)avatar.group.position.y+=.025-min;
  avatar.group.updateMatrixWorld(true);
}
