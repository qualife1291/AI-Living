import * as THREE from "three";
/** Lightweight authored bicycle for practice actions; no external asset dependency. */
export function createPracticeBicycle() {
  const group = new THREE.Group(), frame = new THREE.MeshPhongMaterial({color:"#548e96"}), tire = new THREE.MeshPhongMaterial({color:"#344346"});
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const rod = (from: number[], to: number[]) => {
    a.fromArray(from); b.fromArray(to); const mesh = new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,a.distanceTo(b),6),frame);
    mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());group.add(mesh);
  };
  for(const z of [-5.5,5.5]) {const wheel=new THREE.Mesh(new THREE.TorusGeometry(3,.35,6,16),tire);wheel.rotation.y=Math.PI/2;wheel.position.set(0,3,z);group.add(wheel);}
  for(const [from,to] of [[[0,3,-5.5],[0,7,-1]],[[0,3,0],[0,7,-1]],[[0,3,0],[0,3,-5.5]],[[0,3,0],[0,7,3]],[[0,7,-1],[0,7,3]],[[0,7,3],[0,3,5.5]],[[0,7,3],[0,9,3.5]]])rod(from,to);
  const saddle=new THREE.Mesh(new THREE.BoxGeometry(2.4,.6,2),tire);saddle.position.set(0,7.5,-1);group.add(saddle);rod([-2,9,3.5],[2,9,3.5]);
  return group;
}
