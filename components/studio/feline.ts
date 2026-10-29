import * as THREE from 'three';
/** Original articulated cat, in the same rounded 3D style as the daily-life cast. */
export class StudioFeline {
 readonly group=new THREE.Group();private chest=new THREE.Group();private head=new THREE.Group();private tail=new THREE.Group();private ears:THREE.Group[]=[];private lids:THREE.Mesh[]=[];
 constructor(){
  const fur=new THREE.MeshPhongMaterial({color:'#bba38a',shininess:10}),cream=new THREE.MeshPhongMaterial({color:'#f2e5cf'}),pink=new THREE.MeshPhongMaterial({color:'#b98182'}),dark=new THREE.MeshPhongMaterial({color:'#304f46'});
  const ellipsoid=(parent:THREE.Object3D,p:number[],s:number[],mat=fur)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),mat);m.position.set(...p as [number,number,number]);m.scale.set(...s as [number,number,number]);m.castShadow=true;parent.add(m);return m;};
  this.group.add(this.chest);ellipsoid(this.chest,[0,.85,-.15],[.65,.65,1.05]);this.head.position.set(0,1.4,.7);this.chest.add(this.head);ellipsoid(this.head,[0,0,0],[.65,.6,.54]);ellipsoid(this.head,[0,-.25,.4],[.44,.26,.22],cream);
  for(const sign of [-1,1]){const ear=new THREE.Group();ear.position.set(sign*.43,.39,.02);this.head.add(ear);const outer=new THREE.Mesh(new THREE.ConeGeometry(.32,.65,3),fur),inner=new THREE.Mesh(new THREE.ConeGeometry(.19,.4,3),pink);outer.rotation.y=Math.PI;inner.rotation.y=Math.PI;inner.position.set(0,.01,.06);ear.add(outer,inner);this.ears.push(ear);
   ellipsoid(this.head,[sign*.28,.04,.49],[.13,.16,.07],dark);ellipsoid(this.head,[sign*.30,.08,.55],[.035,.04,.025],cream);const lid=ellipsoid(this.head,[sign*.28,.04,.55],[.15,.001,.025]);this.lids.push(lid);
   for(const z of [-.8,.55]){ellipsoid(this.chest,[sign*.44,.3,z],[.23,.36,.25]);ellipsoid(this.chest,[sign*.44,.12,z+.12],[.25,.12,.34],cream);}
   for(let i=0;i<3;i++){const curve=new THREE.LineCurve3(new THREE.Vector3(sign*.2,-.25,.6),new THREE.Vector3(sign*.95,-.18+i*.11,.6));this.head.add(new THREE.Mesh(new THREE.TubeGeometry(curve,1,.009,3),cream));}
  }
  ellipsoid(this.head,[0,-.18,.65],[.11,.07,.06],pink);this.tail.position.set(0,.8,-1);this.chest.add(this.tail);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(.2,.2,-.45),new THREE.Vector3(.6,.5,-.7),new THREE.Vector3(.8,.8,-.55)]);const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,12,.13,6),fur);mesh.castShadow=true;this.tail.add(mesh);
 }
 pose(time:number,position:readonly number[],yaw:number,calm:boolean,carried:boolean){this.group.position.set(position[0],position[1],position[2]);this.group.rotation.set(0,yaw,0);this.chest.scale.y=1+Math.sin(time*(calm?2.4:4.5))*.025;this.head.rotation.set(.05+Math.sin(time*.8)*.04,Math.sin(time*.6)*.12,carried?.08:0);this.tail.rotation.y=Math.sin(time*1.5)*(calm?.18:.35);this.ears.forEach((e,i)=>e.rotation.z=(i?1:-1)*(.12+Math.sin(time*1.8+i)*.07));const blink=Math.pow(Math.max(0,Math.cos(time*1.3)),28);this.lids.forEach(m=>m.scale.y=.001+blink*.17);}
}
