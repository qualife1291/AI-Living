import * as THREE from "three";
import {GARDEN_PLOTS} from "../../../lib/city/garden-plots.ts";
import {gardenViews,type GardenView} from "../../../lib/living/flora.ts";
import type {World} from "../../../lib/world";
import {streetModel,type StreetSolid} from "./streetscape.ts";

/** Two bounded batches inside the already reserved flower-bed footprints. */
export function createGardens(scene:THREE.Scene) {
  const material=new THREE.MeshLambertMaterial(),box=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,GARDEN_PLOTS.length*14);
  const bud=new THREE.InstancedMesh(new THREE.SphereGeometry(.5,8,6),material,GARDEN_PLOTS.length*6);
  for(const mesh of [box,bud]){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);}
  const dummy=new THREE.Object3D(),color=new THREE.Color();let key="",born="",lastSim:number|undefined,dead=false,updates=0,views:GardenView[]=[],failed=false;
  const put=(part:StreetSolid,floor:number)=>{
    const mesh=part.shape==="bud"?bud:box;
    dummy.position.set(part.x,floor+part.y-.55,part.z);dummy.rotation.set(0,part.angle??0,part.tilt??0);dummy.scale.set(part.w,part.h,part.d);dummy.updateMatrix();
    mesh.setMatrixAt(mesh.count,dummy.matrix);mesh.setColorAt(mesh.count++,color.set(part.color));
  };
  const upload=()=>{for(const mesh of [box,bud]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}updates++;};
  const bases=()=>{
    box.count=bud.count=0;
    for(const plot of GARDEN_PLOTS)for(const part of streetModel({...plot,kind:"flowers"}).slice(0,2))put(part,plot.floor);
    upload();
  };
  bases();
  return {
    draw(world:World,simMs:number) {
      if(dead)return;
      if(world.born!==born){if(born)bases();born=world.born;lastSim=undefined;key="";views=[];}
      const at=world.paused&&lastSim!==undefined?lastSim:simMs;lastSim=at;
      try{views=gardenViews(world.living?.flora,at);failed=false;}catch{failed=true;return;}
      const next=JSON.stringify(views.map(v=>[v.id,v.phase,Math.floor(v.moisture/10)]));if(next===key)return;key=next;
      box.count=bud.count=0;
      for(const v of views)for(const part of streetModel({...v,kind:"flowers"},{phase:v.phase,moisture:Math.floor(v.moisture/10)*10}))put(part,v.floor);
      upload();
    },
    stats(){return {plots:GARDEN_PLOTS.length,plants:GARDEN_PLOTS.length*6,batches:2,updates,failed,views:views.map(v=>({id:v.id,phase:v.phase,moisture:v.moisture,x:v.x,z:v.z}))};},
    dispose(){if(dead)return;dead=true;for(const mesh of [box,bud]){scene.remove(mesh);mesh.geometry.dispose();}material.dispose();},
  };
}
