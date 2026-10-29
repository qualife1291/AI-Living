import * as THREE from 'three';

type SkinActor={group:THREE.Group;joint:(name:string)=>THREE.Object3D|undefined;hand:(side:string)=>THREE.Vector3;foot:(side:string)=>THREE.Vector3};
/** Solve existing bones at their authored lengths; never move the actor root. */
export function reachLimb(actor:SkinActor,side:'left'|'right',target:THREE.Vector3,leg=false){
 const upper=actor.joint((leg?'leg-':'arm-')+side),end=actor.joint((leg?'foot-':'hand-')+side);
 if(!upper||!end)return;
 const lower=leg?actor.joint('knee-'+side):end.parent;
 if(!lower||lower===upper)return;
 const orientation=end.getWorldQuaternion(new THREE.Quaternion());
 const setWorld=(bone:THREE.Object3D,q:THREE.Quaternion)=>bone.quaternion.copy(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
 const surface=()=>leg?actor.foot(side):actor.hand(side);
 for(let iteration=0;iteration<3;iteration++){
  actor.group.updateMatrixWorld(true);
  const a=upper.getWorldPosition(new THREE.Vector3()),b=lower.getWorldPosition(new THREE.Vector3()),c=end.getWorldPosition(new THREE.Vector3());
  const l1=a.distanceTo(b),l2=b.distanceTo(c);if(l1<1e-4||l2<1e-4)return;
  const wrist=target.clone().sub(surface().sub(c)),delta=wrist.clone().sub(a),distance=THREE.MathUtils.clamp(delta.length(),Math.abs(l1-l2)+1e-4,l1+l2-1e-4),direction=delta.normalize();
  const pole=new THREE.Vector3(leg?0:side==='left'?.5:-.5,leg?0:-.8,leg?1:-.25).applyAxisAngle(new THREE.Vector3(0,1,0),actor.group.rotation.y);
  pole.addScaledVector(direction,-pole.dot(direction));if(pole.lengthSq()<1e-6)pole.set(1,0,0);pole.normalize();
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  const elbow=a.clone().addScaledVector(direction,along).addScaledVector(pole,height);
  const q=new THREE.Quaternion().setFromUnitVectors(b.clone().sub(a).normalize(),elbow.clone().sub(a).normalize()).multiply(upper.getWorldQuaternion(new THREE.Quaternion()));setWorld(upper,q);actor.group.updateMatrixWorld(true);
  const p=lower.getWorldPosition(new THREE.Vector3()),tip=end.getWorldPosition(new THREE.Vector3()),goal=a.clone().addScaledVector(direction,distance);
  q.setFromUnitVectors(tip.sub(p).normalize(),goal.sub(p).normalize()).multiply(lower.getWorldQuaternion(new THREE.Quaternion()));setWorld(lower,q);actor.group.updateMatrixWorld(true);
  setWorld(end,orientation);actor.group.updateMatrixWorld(true);
 }
 return surface().distanceTo(target);
}
