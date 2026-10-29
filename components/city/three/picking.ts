import * as THREE from 'three';

/** Picking follows the objects actually rendered, including animated bounds. */
export function pickVisible(ray:THREE.Raycaster,scene:THREE.Object3D,ignored=new Set<THREE.Object3D>()){
 scene.updateMatrixWorld(true);
 const candidates:THREE.Object3D[]=[];
 scene.traverseVisible(object=>{
  for(let p:THREE.Object3D|null=object;p;p=p.parent)if(ignored.has(p)||p.userData.pickThrough)return;
  const mesh=object as THREE.Mesh;
  // Weather particles and text billboards must not intercept a body click.
  if(!mesh.isMesh)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  if(materials.every(m=>!m.visible||m.transparent&&m.opacity===0))return;
  const skin=object as THREE.SkinnedMesh;
  if(skin.isSkinnedMesh){skin.computeBoundingSphere();if(skin.boundingBox)skin.computeBoundingBox();}
  const instances=object as THREE.InstancedMesh;
  if(instances.isInstancedMesh){instances.boundingSphere=null;if(instances.boundingBox)instances.boundingBox=null;}
  candidates.push(object);
 });
 return ray.intersectObjects(candidates,false)[0];
}

/** A drag, cancelled pointer or pinch is never a tap, even if it ends near start. */
export class TapGesture{
 private pointers=new Set<number>();
 private candidate?:{id:number;x:number;y:number};
 down(e:Pick<PointerEvent,'pointerId'|'clientX'|'clientY'|'button'>){
  this.pointers.add(e.pointerId);
  this.candidate=this.pointers.size===1&&e.button===0?{id:e.pointerId,x:e.clientX,y:e.clientY}:undefined;
 }
 move(e:Pick<PointerEvent,'pointerId'|'clientX'|'clientY'>){const c=this.candidate;if(c&&c.id===e.pointerId&&Math.hypot(e.clientX-c.x,e.clientY-c.y)>5)this.candidate=undefined;}
 up(e:Pick<PointerEvent,'pointerId'|'clientX'|'clientY'|'button'>){
  const c=this.candidate,ok=this.pointers.size===1&&c?.id===e.pointerId&&e.button===0&&Math.hypot(e.clientX-c.x,e.clientY-c.y)<=5;
  this.pointers.delete(e.pointerId);this.candidate=undefined;return !!ok;
 }
 cancel(e:Pick<PointerEvent,'pointerId'>){this.pointers.delete(e.pointerId);this.candidate=undefined;}
 invalidate(){this.candidate=undefined;}
}
