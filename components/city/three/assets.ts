import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import catalog from "../../../public/models/kenney/catalog.json" with { type: "json" };
import resources from "../../../public/models/resources/catalog.json" with { type: "json" };
import { resolveModel } from "../../../lib/city/asset-bindings.ts";
import { CORE_MODELS } from "../../../lib/city/character-models.ts";
import {cityAssetIds} from '../../../lib/city/city-assets.ts';
import transfers from '../../../data/assets/city-transfer-manifest.json' with {type:'json'};
import {decodeAssetTransfer} from '../../../lib/city/asset-transfer.ts';

export {cityAssetIds};

export const approvedAssets = [...catalog.assets, ...resources.assets];
export type AssetPlacement = { id: string; x: number; y: number; z: number; width: number; depth: number; height: number; yaw?: number; stretch?: boolean };
type Compiled = { geometry: THREE.BufferGeometry; material: THREE.MeshPhongMaterial; size: THREE.Vector3 };
export type ResourceSets = { geometries: Set<THREE.BufferGeometry>; materials: Set<THREE.Material>; textures: Set<THREE.Texture> };
export function collectAssetResources(root: THREE.Object3D, sets: ResourceSets) {
  root.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.geometry) sets.geometries.add(mesh.geometry); if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { sets.materials.add(material); const map = (material as THREE.MeshStandardMaterial).map; if (map) sets.textures.add(map); } });
}

/** Only checked-in CC0 entries can load; no provider requests from a live viewer. */
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
    if (!metadata || metadata.license !== "CC0-1.0" || !["/models/kenney/", "/models/resources/"].some(prefix => metadata.url.startsWith(prefix)) || metadata.url.includes("..")) throw new Error(`Unapproved asset: ${id}`);
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
        const fallback=actor&&resolveModel(`character-${{an:'a',binh:'b',chi:'c'}[actor as 'an'|'binh'|'chi']}`);
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

/** Real object-node animations; normal cloning is valid for these skin-free GLBs. */
export class AssetAvatar {
  readonly group = new THREE.Group();
  readonly model: THREE.Object3D;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current = ""; private previous = ""; private changedAt = 0; private lastTime = 0;
  private bounds = new THREE.Box3();
  private tintKey = "";
  constructor(source: GLTF, height = 17.5, radius = 4.4, tint?: { shirt: string; trousers: string; skin: string }) {
    this.model = source.scene.clone(true);
    this.model.traverse(o => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; const old = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial; const color = /torso/i.test(mesh.name) ? tint?.shirt : /leg/i.test(mesh.name) ? tint?.trousers : /head/i.test(mesh.name) ? tint?.skin : undefined; mesh.castShadow = true; mesh.receiveShadow = true; mesh.material = new THREE.MeshPhongMaterial({ map: old.map, color: color ?? old.color, shininess: 18, specular: new THREE.Color("#635d52") }); });
    this.group.add(this.model); this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of source.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
    const rest = new THREE.Box3().setFromObject(this.model), center = rest.getCenter(new THREE.Vector3()), size = rest.getSize(new THREE.Vector3());
    // Keep the authored body proportions. Extended interaction limbs are not a
    // body collider: fitting the entire pickup sweep would turn people into strips.
    const extent = Math.hypot(size.x / 2, size.z / 2);
    const yScale = height / size.y, horizontal = Math.min(yScale, radius / Math.max(.001, extent));
    this.group.scale.set(horizontal, yScale, horizontal); this.model.position.x -= center.x; this.model.position.z -= center.z;
  }
  pose(clip: string, animationTime: number, presentationTime: number, position: readonly number[], yaw: number, floor: number) {
    if (this.current && presentationTime === this.lastTime) return false;
    const name = this.actions.has(clip) ? clip : "idle", delta = Math.max(0, Math.min(.15, presentationTime - this.lastTime)), seek = Math.abs(presentationTime - this.lastTime) > 1;
    if (name !== this.current || seek) { this.previous = seek ? "" : this.current; this.current = name; this.changedAt = seek ? presentationTime - .45 : presentationTime; this.actions.get(name)?.reset().play(); }
    const blend = Math.min(1, Math.max(0, (presentationTime - this.changedAt) / .45));
    for (const [key, action] of this.actions) {
      const active = key === name || key === this.previous && blend < 1;
      action.enabled = active; action.setEffectiveWeight(key === name ? blend : key === this.previous ? 1 - blend : 0);
      if (key === name) { const duration = Math.max(.001, action.getClip().duration); action.time = ((animationTime % duration) + duration) % duration; }
      else if (active) action.time += delta;
    }
    this.mixer.update(0); this.lastTime = presentationTime;
    this.group.position.set(position[0], 0, position.length > 2 ? position[2] : position[1]); this.group.rotation.set(0, yaw, 0); this.group.updateMatrixWorld(true);
    this.bounds.setFromObject(this.model); this.group.position.y = floor - this.bounds.min.y; this.group.updateMatrixWorld(true);
    return true;
  }
  assignId(id: string) { this.model.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.isMesh) mesh.userData.actorId = id; }); }
  tint(colors: { shirt: string; trousers: string; skin: string }) {
    const key = `${colors.shirt}/${colors.trousers}/${colors.skin}`; if (this.tintKey === key) return; this.tintKey = key;
    this.model.traverse(o => {
      const mesh = o as THREE.Mesh; if (!mesh.isMesh || /head/i.test(mesh.name)) return;
      const material = mesh.material as THREE.MeshPhongMaterial;
      if (/arm/i.test(mesh.name)) {
        if (!mesh.userData.wardrobeGeometry) { mesh.geometry = mesh.geometry.clone(); mesh.userData.wardrobeGeometry = true; }
        const position = mesh.geometry.getAttribute("position"), pixels = new Float32Array(position.count * 3), color = new THREE.Color();
        mesh.geometry.computeBoundingBox(); const handEnd = mesh.geometry.boundingBox!.min.y + .24;
        for (let i = 0; i < position.count; i++) { color.set(position.getY(i) <= handEnd ? colors.skin : colors.shirt); color.toArray(pixels, i * 3); }
        mesh.geometry.setAttribute("color", new THREE.BufferAttribute(pixels, 3)); material.vertexColors = true; material.color.set("white");
      } else material.color.set(/leg/i.test(mesh.name) ? colors.trousers : colors.shirt);
      material.map = null; material.needsUpdate = true;
    });
  }
  aimHands(targets: { right?: readonly number[]; left?: readonly number[] }) {
    for (const side of ["right", "left"] as const) {
      const goal = targets[side], arm = this.model.getObjectByName(`arm-${side}`) as THREE.Mesh | undefined;
      if (!goal || !arm?.parent || !arm.geometry) continue;
      const local = arm.parent.worldToLocal(new THREE.Vector3(...goal)).sub(arm.position);
      arm.geometry.computeBoundingBox(); const bounds = arm.geometry.boundingBox!, grip = bounds.getCenter(new THREE.Vector3()); grip.y = bounds.min.y + .12;
      if (local.lengthSq() > .0001) arm.quaternion.setFromUnitVectors(grip.normalize(), local.normalize());
      arm.updateMatrixWorld(true);
    }
  }
  hand(side = "right") {
    const mesh = this.model.getObjectByName(`arm-${side}`) as THREE.Mesh | undefined;
    if (!mesh?.geometry) return this.group.position.clone().add(new THREE.Vector3(0, 9, 1));
    mesh.geometry.computeBoundingBox(); const box = mesh.geometry.boundingBox!, point = box.getCenter(new THREE.Vector3()); point.y = box.min.y + .12; return mesh.localToWorld(point);
  }
  joint(name: string) { return this.model.getObjectByName(name); }
  head() { const head = this.joint("head"); return head ? new THREE.Box3().setFromObject(head).getCenter(new THREE.Vector3()).setY(new THREE.Box3().setFromObject(head).max.y) : this.group.position.clone().add(new THREE.Vector3(0, 17.5, 0)); }
  dispose() { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model); this.model.traverse(o => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; if (mesh.userData.wardrobeGeometry) mesh.geometry.dispose(); for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.dispose(); }); this.group.removeFromParent(); }
  snapshot() { const leg = this.model.getObjectByName("leg-left"); return { clip: this.current, leg: leg?.quaternion.toArray(), position: this.group.position.toArray() }; }
}
