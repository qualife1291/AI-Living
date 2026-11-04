import * as THREE from 'three';
import {AssetLibrary,setAssetTransform,type AssetPlacement} from './assets.ts';

/** Batch only immutable direct room meshes. Lift doors/cabin, avatars and
 * asynchronous fixture placeholders remain independent and can still move. */
export function batchInteriorRoom(scene:THREE.Scene,geometry:THREE.BufferGeometry){
  const groups=new Map<THREE.Material,THREE.Mesh[]>();
  for(const object of [...scene.children]){
    const mesh=object as THREE.Mesh;
    if(!mesh.isMesh||mesh.geometry!==geometry||Array.isArray(mesh.material))continue;
    const rows=groups.get(mesh.material)??[];rows.push(mesh);groups.set(mesh.material,rows);
  }
  const batches:THREE.InstancedMesh[]=[];
  for(const [material,meshes] of groups){
    const batch=new THREE.InstancedMesh(geometry,material,meshes.length);
    batch.castShadow=batch.receiveShadow=true;
    meshes.forEach((mesh,i)=>{mesh.updateMatrix();batch.setMatrixAt(i,mesh.matrix);mesh.removeFromParent();});
    batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();scene.add(batch);batches.push(batch);
  }
  return {batches,dispose(){for(const batch of batches){batch.removeFromParent();batch.dispose();}}};
}
/** Adopt approved native fixtures whenever their download finishes; no 4s
 * preload cutoff and no old figure fallback. Library owns shared GPU assets. */
export function createInteriorFurniture(scene:THREE.Scene,library:AssetLibrary){
  const records:{placement:AssetPlacement;fallback:THREE.Group;mesh?:THREE.Mesh;draws:number}[]=[];
  const requested=new Set<string>();let dead=false;
  return {
    add(placement:AssetPlacement,fallback:THREE.Group){
      scene.add(fallback);records.push({placement,fallback,draws:0});
      if(!requested.has(placement.id)){requested.add(placement.id);void library.load(placement.id).catch(()=>{});}
    },
    update(){if(dead)return;
      for(const record of records){if(record.mesh)continue;
        const compiled=library.compile(record.placement.id);if(!compiled)continue;
        const mesh=new THREE.Mesh(compiled.geometry,compiled.material);
        setAssetTransform(mesh,compiled.size,record.placement);mesh.castShadow=mesh.receiveShadow=true;
        mesh.userData.assetId=record.placement.id;mesh.onBeforeRender=()=>{record.draws++;};
        scene.add(mesh);record.mesh=mesh;record.fallback.removeFromParent();
      }
    },
    snapshots(){return records.map(r=>({modelId:r.placement.id,loaded:!!r.mesh,draws:r.draws}));},
    dispose(){if(dead)return;dead=true;for(const record of records){record.mesh?.removeFromParent();record.fallback.removeFromParent();}},
  };
}
