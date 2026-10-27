import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import catalog from "../../../public/models/kenney/catalog.json" with { type: "json" };
import { resolveModel } from "../../../lib/city/asset-bindings.ts";

export const approvedAssets = catalog.assets;
export const cityAssetIds = [...["character-a", "character-b", "character-c", "car-sedan", "car-hatchback", "car-taxi", "display-bread", "display-fruit", "bin"].map(key => resolveModel(key)!).filter(Boolean), "commercial/building-a", "commercial/building-b", "commercial/building-c", "suburban/building-type-a", "suburban/building-type-b", "suburban/building-type-c", "watercraft/boat-fishing-small", "watercraft/boat-row-small", "trains/railroad-straight"];
export type AssetPlacement = { id: string; x: number; y: number; z: number; width: number; depth: number; height: number; yaw?: number; stretch?: boolean };
type Compiled = { geometry: THREE.BufferGeometry; material: THREE.MeshPhongMaterial; size: THREE.Vector3 };
export type ResourceSets = { geometries: Set<THREE.BufferGeometry>; materials: Set<THREE.Material>; textures: Set<THREE.Texture> };
export function collectAssetResources(root: THREE.Object3D, sets: ResourceSets) {
  root.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.geometry) sets.geometries.add(mesh.geometry); if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { sets.materials.add(material); const map = (material as THREE.MeshStandardMaterial).map; if (map) sets.textures.add(map); } });
}

/** Only checked-in CC0 entries can load; no provider requests from a live viewer. */
export class AssetLibrary {
  private loader = new GLTFLoader();
  private loaded = new Map<string, GLTF>();
  private pending = new Map<string, Promise<GLTF>>();
  private compiled = new Map<string, Compiled>();
  private dead = false;
  readonly failures = new Set<string>();
  get(id: string) { return this.loaded.get(id); }
  async load(id: string) {
    const cached = this.loaded.get(id); if (cached) return cached;
    const request = this.pending.get(id); if (request) return request;
    const metadata = approvedAssets.find(a => a.id === id);
    if (!metadata || metadata.license !== "CC0-1.0" || !metadata.url.startsWith("/models/kenney/") || metadata.url.includes("..")) throw new Error(`Unapproved asset: ${id}`);
    const promise = this.loader.loadAsync(`${metadata.url}?v=${metadata.sha256.slice(0, 12)}`).then(model => {
      if (this.dead) { const sets: ResourceSets = { geometries: new Set(), materials: new Set(), textures: new Set() }; collectAssetResources(model.scene, sets); sets.geometries.forEach(g => g.dispose()); sets.materials.forEach(m => m.dispose()); sets.textures.forEach(t => t.dispose()); throw new Error("Asset view disposed"); }
      this.loaded.set(id, model); return model;
    }).catch(error => { this.failures.add(id); throw error; });
    this.pending.set(id, promise); return promise;
  }
  async preload(ids = cityAssetIds, timeoutMs = 4000) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([Promise.allSettled(ids.map(id => this.load(id))), new Promise(resolve => { timer = setTimeout(resolve, timeoutMs); })]);
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
    const compiled = { geometry, size, material: new THREE.MeshPhongMaterial({ map: texture, vertexColors: true, shininess: 12, alphaTest: .1 }) };
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
      mesh.instanceMatrix.needsUpdate = true; scene.add(mesh); meshes.set(id, mesh);
    }
    return meshes;
  }
  collectAndClose(sets: ResourceSets) { this.dead = true; for (const model of this.loaded.values()) collectAssetResources(model.scene, sets); for (const model of this.compiled.values()) { sets.geometries.add(model.geometry); sets.materials.add(model.material); } this.loaded.clear(); this.compiled.clear(); }
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
    this.model.traverse(o => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; const old = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial; const color = /torso/i.test(mesh.name) ? tint?.shirt : /leg/i.test(mesh.name) ? tint?.trousers : /head/i.test(mesh.name) ? tint?.skin : undefined; mesh.material = new THREE.MeshPhongMaterial({ map: old.map, color: color ?? old.color, shininess: 10 }); });
    this.group.add(this.model); this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of source.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
    const rest = new THREE.Box3().setFromObject(this.model), center = rest.getCenter(new THREE.Vector3()), size = rest.getSize(new THREE.Vector3());
    const envelope = rest.clone();
    for (const name of ["idle", "walk", "sprint", "sit", "pick-up", "holding-both", "interact-right", "emote-yes", "emote-no"]) {
      const action = this.actions.get(name); if (!action) continue; this.mixer.stopAllAction(); action.play();
      for (let sample = 0; sample <= 12; sample++) { this.mixer.setTime(action.getClip().duration * sample / 12); envelope.union(new THREE.Box3().setFromObject(this.model)); }
    }
    this.mixer.stopAllAction();
    const extent = Math.hypot(Math.max(Math.abs(envelope.min.x - center.x), Math.abs(envelope.max.x - center.x)), Math.max(Math.abs(envelope.min.z - center.z), Math.abs(envelope.max.z - center.z)));
    const yScale = height / size.y, horizontal = Math.min(yScale, radius / Math.max(.001, extent));
    this.group.scale.set(horizontal, yScale, horizontal); this.model.position.x -= center.x; this.model.position.z -= center.z;
  }
  pose(clip: string, animationTime: number, presentationTime: number, position: readonly number[], yaw: number, floor: number) {
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
    this.group.position.set(position[0], 0, position.length > 2 ? position[2] : position[1]); this.group.rotation.set(0, yaw + Math.PI, 0); this.group.updateMatrixWorld(true);
    this.bounds.setFromObject(this.model); this.group.position.y = floor - this.bounds.min.y; this.group.updateMatrixWorld(true);
  }
  assignId(id: string) { this.model.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.isMesh) mesh.userData.actorId = id; }); }
  tint(colors: { shirt: string; trousers: string; skin: string }) {
    const key = `${colors.shirt}/${colors.trousers}/${colors.skin}`; if (this.tintKey === key) return; this.tintKey = key;
    this.model.traverse(o => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; const color = /torso|arm/i.test(mesh.name) ? colors.shirt : /leg/i.test(mesh.name) ? colors.trousers : /head/i.test(mesh.name) ? colors.skin : undefined; if (color) (mesh.material as THREE.MeshPhongMaterial).color.set(color); });
  }
  hand(side = "right") {
    const mesh = this.model.getObjectByName(`arm-${side}`) as THREE.Mesh | undefined;
    if (!mesh?.geometry) return this.group.position.clone().add(new THREE.Vector3(0, 9, 1));
    mesh.geometry.computeBoundingBox(); const box = mesh.geometry.boundingBox!, point = box.getCenter(new THREE.Vector3()); point.y = box.min.y + .12; return mesh.localToWorld(point);
  }
}
