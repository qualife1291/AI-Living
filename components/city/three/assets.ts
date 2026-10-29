import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import catalog from "../../../public/models/kenney/catalog.json" with { type: "json" };
import citizens from "../../../public/models/citizens/catalog.json" with {type:"json"};
import resources from "../../../public/models/resources/catalog.json" with { type: "json" };
import { CORE_MODELS, CITIZEN_FALLBACK } from "../../../lib/city/character-models.ts";
import {cityAssetIds} from '../../../lib/city/city-assets.ts';
import supplied from '../../../public/models/supplied/catalog.json' with {type:'json'};
import {reviewedAssetLicense} from '../../../lib/city/asset-policy.ts';
import transfers from '../../../data/assets/city-transfer-manifest.json' with {type:'json'};
import {decodeAssetTransfer} from '../../../lib/city/asset-transfer.ts';

export {cityAssetIds};

export const approvedAssets = [...catalog.assets, ...resources.assets, ...citizens.assets,...supplied.assets];
export type AssetPlacement = { id: string; x: number; y: number; z: number; width: number; depth: number; height: number; yaw?: number; stretch?: boolean };
type Compiled = { geometry: THREE.BufferGeometry; material: THREE.MeshPhongMaterial; size: THREE.Vector3 };
export type ResourceSets = { geometries: Set<THREE.BufferGeometry>; materials: Set<THREE.Material>; textures: Set<THREE.Texture> };
export function collectAssetResources(root: THREE.Object3D, sets: ResourceSets) {
  root.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.geometry) sets.geometries.add(mesh.geometry); if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { sets.materials.add(material); const map = (material as THREE.MeshStandardMaterial).map; if (map) sets.textures.add(map); } });
}

/** Only checked-in, reviewed entries can load; no provider requests from a live viewer. */
export class AssetLibrary {
  private manager = new THREE.LoadingManager();
  private loader = new GLTFLoader(this.manager);
  private loaded = new Map<string, GLTF>();
  private pending = new Map<string, Promise<GLTF>>();
  private compiled = new Map<string, Compiled>();
  private dead = false;
  private transferAbort = new AbortController();
  readonly failures = new Set<string>();
  get(id: string) { return this.loaded.get(id); }
  async load(id: string) {
    if (this.dead) throw new Error("Asset view disposed");
    const cached = this.loaded.get(id); if (cached) return cached;
    const request = this.pending.get(id); if (request) return request;
    const metadata = approvedAssets.find(a => a.id === id);
    if (!metadata || !reviewedAssetLicense(metadata) || !["/models/kenney/", "/models/resources/", "/models/citizens/", "/models/supplied/"].some(prefix => metadata.url.startsWith(prefix)) || metadata.url.includes("..")) throw new Error(`Unapproved asset: ${id}`);
    const canonical = `${metadata.url}?v=${metadata.sha256.slice(0, 12)}`;
    const transfer = transfers.assets.find(a=>a.id===id&&a.sourceSha256===metadata.sha256&&a.sourceUrl===metadata.url);
    const requestModel = transfer && typeof DecompressionStream !== 'undefined' && globalThis.crypto?.subtle
      ? fetch(transfer.url,{signal:this.transferAbort.signal}).then(async response=>{
          if(!response.ok)throw Error('Asset transport unavailable');
          const decoded=await decodeAssetTransfer(await response.arrayBuffer(),transfer);
          if(this.dead)throw Error('Asset view disposed');
          return this.loader.parseAsync(decoded,metadata.url.slice(0,metadata.url.lastIndexOf('/')+1));
        }).catch(error=>{if(this.dead)throw error;return this.loader.loadAsync(canonical);})
      : this.loader.loadAsync(canonical);
    const promise = requestModel.then(model => {
      if (this.dead) { const sets: ResourceSets = { geometries: new Set(), materials: new Set(), textures: new Set() }; collectAssetResources(model.scene, sets); sets.geometries.forEach(g => g.dispose()); sets.materials.forEach(m => m.dispose()); sets.textures.forEach(t => t.dispose()); throw new Error("Asset view disposed"); }
      this.failures.delete(id); this.loaded.set(id, model); return model;
    }).catch(error => { this.failures.add(id); throw error; }).finally(() => { this.pending.delete(id); });
    this.pending.set(id, promise); return promise;
  }
  async preload(ids = cityAssetIds, timeoutMs = 4000) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([Promise.allSettled(ids.map(async id => {
      try { await this.load(id); }
      catch {
        const actor=Object.keys(CORE_MODELS).find(actor=>CORE_MODELS[actor]===id);
        const fallback=actor&&CITIZEN_FALLBACK;
        if(fallback&&!this.dead)await this.load(fallback);
      }
    })), new Promise(resolve => { timer = setTimeout(resolve, timeoutMs); })]);
    if (timer) clearTimeout(timer);
    return this;
  }
  /** Rigid meshes sharing a palette become one instanced draw per model. */
  compile(id: string): Compiled | undefined {
    const cached = this.compiled.get(id); if (cached) return cached;
    const model = this.get(id); if (!model || model.animations.length) return;
    const geometries: THREE.BufferGeometry[] = []; let texture: THREE.Texture | null = null;
    model.scene.updateMatrixWorld(true);
    model.scene.traverse(o => {
      const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
      const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      if (material.map) texture = material.map;
      const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld);
      if (!geo.getAttribute("normal")) geo.computeVertexNormals();
      if (!geo.getAttribute("uv")) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(geo.getAttribute("position").count * 2), 2));
      const colors = new Float32Array(geo.getAttribute("position").count * 3), base = material.color ?? new THREE.Color("white");
      for (let i = 0; i < colors.length; i += 3) { colors[i] = base.r; colors[i + 1] = base.g; colors[i + 2] = base.b; }
      for (const name of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(name)) geo.deleteAttribute(name);
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3)); geometries.push(geo);
    });
    if (!geometries.length) return;
    const geometry = mergeGeometries(geometries); geometries.forEach(g => g.dispose()); if (!geometry) return;
    geometry.computeBoundingBox(); const box = geometry.boundingBox!, center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    geometry.translate(-center.x, -box.min.y, -center.z); geometry.computeBoundingBox();
    const compiled = { geometry, size, material: new THREE.MeshPhongMaterial({ map: texture, vertexColors: true, shininess: 20, specular: new THREE.Color("#5c584f"), alphaTest: .1 }) };
    this.compiled.set(id, compiled); return compiled;
  }
  addBatches(scene: THREE.Object3D, placements: AssetPlacement[]) {
    const groups = new Map<string, AssetPlacement[]>();
    for (const p of placements) { const list = groups.get(p.id) ?? []; list.push(p); groups.set(p.id, list); }
    const meshes = new Map<string, THREE.InstancedMesh>(), dummy = new THREE.Object3D();
    for (const [id, entries] of groups) {
      const model = this.compile(id); if (!model) continue;
      const mesh = new THREE.InstancedMesh(model.geometry, model.material, entries.length);
      entries.forEach((p, i) => { setAssetTransform(dummy, model.size, p); mesh.setMatrixAt(i, dummy.matrix); });
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.userData.placements = entries; mesh.userData.assetSize = model.size;
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.instanceMatrix.needsUpdate = true; scene.add(mesh); meshes.set(id, mesh);
    }
    return meshes;
  }
  addWorldLOD(scene: THREE.Scene, placements: AssetPlacement[]) {
    const meshes = this.addBatches(scene, placements), dummy = new THREE.Object3D(), tint = new THREE.Color();
    let lastX = Infinity, lastZ = Infinity;
    const coarse = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), Math.max(1, placements.length)); coarse.frustumCulled = false; coarse.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(coarse);
    return (camera: THREE.Camera, detailedShadows = false) => {
      for (const mesh of meshes.values()) mesh.castShadow = detailedShadows;
      if (Math.hypot(camera.position.x - lastX, camera.position.z - lastZ) < 8) return;
      lastX = camera.position.x; lastZ = camera.position.z;
      coarse.count = 0;
      for (const mesh of meshes.values()) {
        mesh.count = 0;
        for (const p of mesh.userData.placements as AssetPlacement[]) {
          const distance = Math.hypot(camera.position.x - p.x, camera.position.z - p.z), building = p.width > 40 && p.height > 30;
          if (distance < (building ? 650 : p.height < 2 ? 420 : 320)) { setAssetTransform(dummy, mesh.userData.assetSize, p); mesh.setMatrixAt(mesh.count++, dummy.matrix); }
          else if (building) { dummy.position.set(p.x, p.y + p.height / 2, p.z); dummy.rotation.set(0, p.yaw ?? 0, 0); dummy.scale.set(p.width, p.height, p.depth); dummy.updateMatrix(); coarse.setMatrixAt(coarse.count, dummy.matrix); coarse.setColorAt(coarse.count++, tint.set(p.id.startsWith("commercial") ? "#c9d3cc" : "#d6c9ad")); }
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
      coarse.instanceMatrix.needsUpdate = true; if (coarse.instanceColor) coarse.instanceColor.needsUpdate = true;
    };
  }
  collectAndClose(sets: ResourceSets) { this.dead = true; this.transferAbort.abort(); this.manager.abort(); for (const model of this.loaded.values()) collectAssetResources(model.scene, sets); for (const model of this.compiled.values()) { sets.geometries.add(model.geometry); sets.materials.add(model.material); } this.loaded.clear(); this.compiled.clear(); }
  dispose() { const sets: ResourceSets = { geometries: new Set(), materials: new Set(), textures: new Set() }; this.collectAndClose(sets); sets.geometries.forEach(g => g.dispose()); sets.materials.forEach(m => m.dispose()); sets.textures.forEach(t => t.dispose()); }
  stats() { return { loaded: this.loaded.size, failed: this.failures.size }; }
}

export function setAssetTransform(dummy: THREE.Object3D, size: THREE.Vector3, p: AssetPlacement) {
  const sx = p.width / size.x, sy = p.height / size.y, sz = p.depth / size.z, uniform = Math.min(sx, sy, sz);
  dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.yaw ?? 0, 0); dummy.scale.set(p.stretch ? sx : uniform, p.stretch ? sy : uniform, p.stretch ? sz : uniform); dummy.updateMatrix();
}
