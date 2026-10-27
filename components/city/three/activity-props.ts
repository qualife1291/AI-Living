import * as THREE from "three";
import { BICYCLE_WHEEL_RADIUS } from "../../../lib/city/bicycle.ts";
/** Authored bicycle; wheel rotation follows ground distance rather than wall time. */
export function createBicycle() {
  const group = new THREE.Group(), frame = new THREE.MeshPhongMaterial({color:"#548e96"}), tire = new THREE.MeshPhongMaterial({color:"#344346"});
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const rod = (from: number[], to: number[]) => {
    a.fromArray(from); b.fromArray(to); const mesh = new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,a.distanceTo(b),6),frame);
    mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());group.add(mesh);
  };
  for(const z of [-5.5,5.5]) {
    const wheel = new THREE.Group(); wheel.name = "bicycle-wheel";
    wheel.rotation.y = Math.PI / 2; wheel.position.set(0,3.35,z);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(BICYCLE_WHEEL_RADIUS,.35,6,16),tire));
    for (const angle of [0, Math.PI/3, Math.PI*2/3]) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,5.8,4),frame); spoke.rotation.z = angle; wheel.add(spoke);
    }
    group.add(wheel);
  }
  for(const [from,to] of [[[0,3,-5.5],[0,7,-1]],[[0,3,0],[0,7,-1]],[[0,3,0],[0,3,-5.5]],[[0,3,0],[0,7,3]],[[0,7,-1],[0,7,3]],[[0,7,3],[0,3,5.5]],[[0,7,3],[0,9,3.5]]])rod(from,to);
  const saddle=new THREE.Mesh(new THREE.BoxGeometry(2.4,.6,2),tire);saddle.position.set(0,7.5,-1);group.add(saddle);rod([-2,9,3.5],[2,9,3.5]);
  return group;
}
export function spinBicycle(bicycle: THREE.Group, distance: number) {
  for (const wheel of bicycle.children) if (wheel.name === "bicycle-wheel") wheel.rotation.z = -distance / BICYCLE_WHEEL_RADIUS;
}
