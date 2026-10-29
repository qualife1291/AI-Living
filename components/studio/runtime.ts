import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AssetLibrary, collectAssetResources, type AssetPlacement } from "../city/three/assets.ts";
import { simpleProp } from "../city/three/model-actors.ts";
import { scenarioFrame, scenarioDefinitions, type ScenarioId, type ScenarioFrame, type EnvironmentProp } from "../../lib/city/scenarios/index.ts";
import {StudioAvatar} from "./avatar.ts";
import {studioCamera} from "./camera.ts";
import {poseStudioActors} from "./actors.ts";
import {StudioFeline} from "./feline.ts";
import {STAGE_Y,stagePoint} from "./motion.ts";
import { resolveModel } from "../../lib/city/asset-bindings.ts";

export type StudioRuntime = { dispose: () => void };
type Stage = { group: THREE.Group; actors: Map<string, StudioAvatar>; kitten: StudioFeline | null; props: Map<string, THREE.Group> };
const modelFor = (hint = "") => resolveModel(hint) ?? "";

function box(x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhongMaterial({ color, shininess: 8 })); mesh.position.set(x, y, z); return mesh;
}
function makeEnvironment(prop: EnvironmentProp) {
  const group = new THREE.Group(), [w, h, d] = prop.size;
  if (prop.kind === "bench") {
    group.add(box(0, h * .55, 0, w, 1, d, "#c5ab83"), box(0, h * .85, -d * .4, w, h * .45, .7, "#b39a75"));
    for (const x of [-w * .35, w * .35]) group.add(box(x, h * .25, 0, 1.3, h * .5, d * .7, "#7c9990"));
  } else if (prop.kind === "sign") {
    const canvas = document.createElement("canvas"); canvas.width = 768; canvas.height = 160; const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fbe7b5"; ctx.fillRect(0, 0, 768, 160); ctx.fillStyle = "#a65642"; ctx.font = "600 50px sans-serif"; ctx.textAlign = "center"; ctx.fillText("BÁNH MÌ · MỜI XẾP HÀNG", 384, 98, 735);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })); group.add(sign);
  } else group.add(box(0, h / 2, 0, w, h, d, prop.color));
  group.position.set(...stagePoint(prop.position)); return group;
}

export async function createStudio(host: HTMLDivElement, input: () => { id: ScenarioId; time: number }, signal?: AbortSignal): Promise<StudioRuntime> {
  const wanted = ["market/display-bread", "market/display-fruit", "roads/dumpster", "suburban/tree-large", "suburban/building-type-a", ...scenarioDefinitions.flatMap(d => [...d.cast.map(a => modelFor(a.modelHint)), ...d.environment.map(p => modelFor(p.modelHint ?? p.kind))])].filter(Boolean);
  const library = await new AssetLibrary().preload([...new Set(wanted)], 15000);
  if (signal?.aborted || !host.isConnected) { library.dispose(); throw new DOMException("Studio navigation cancelled", "AbortError"); }
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
  catch (error) { library.dispose(); throw error; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.5, Math.sqrt(2000000 / Math.max(1,host.clientWidth*host.clientHeight)))); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-label", "Các nhân vật trong kịch bản mô phỏng"); host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 2000), hemi = new THREE.HemisphereLight("#edf6fc", "#93836d", 1.9), sun = new THREE.DirectionalLight("#ffe7bb", 2.3);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:400});sun.shadow.normalBias=.15;sun.shadow.bias=-.0003;
  scene.add(hemi, sun); const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.minDistance = 12; controls.maxDistance = 1200; controls.maxPolarAngle = Math.PI / 2 - .03;
  let manual = false; controls.addEventListener("start", () => { manual = true; });
  const stages = new Map<ScenarioId, Stage>(), skies = new Map<ScenarioId, THREE.CanvasTexture>();
  function build(frame: ScenarioFrame): Stage {
    const group = new THREE.Group(), actors = new Map<string, StudioAvatar>(), props = new Map<string, THREE.Group>();
    const floor=box(0, -.6, 0, 3000, 1.2, 3000, frame.theme.groundHex);floor.receiveShadow=true;group.add(floor);
    // Pavement bands make distance and posture readable, without expensive textures.
    for (let n = -6; n <= 6; n++) group.add(box(n * 16, .005, 0, .12, .02, 180, "#b8b4a1"));
    let cat: StudioFeline | null = null;
    const staticModels: AssetPlacement[] = [];
    for (const environment of frame.environment) {
      const environmentStage={...environment,position:stagePoint(environment.position),size:[environment.size[0],environment.size[1]*STAGE_Y,environment.size[2]] as [number,number,number]};
      const id = environment.kind === "tree" ? "suburban/tree-large" : modelFor(environment.modelHint);
      if (id && library.get(id)) staticModels.push({ id, x: environment.position[0], y: environmentStage.position[1], z: environment.position[2], width: environment.size[0], height: environmentStage.size[1], depth: environment.size[2], yaw: Math.PI, stretch: environment.kind === "counter" });
      else group.add(makeEnvironment(environmentStage));
    }
    for(const [id,mesh] of library.addBatches(group, staticModels))mesh.castShadow=id.includes("tree");
    if (library.get("suburban/building-type-a")) for(const mesh of library.addBatches(group, [{ id: "suburban/building-type-a", x: -90, y: 0, z: -70, width: 48, height: 38, depth: 40, yaw: Math.PI }, { id: "suburban/building-type-a", x: 88, y: 0, z: -75, width: 48, height: 40, depth: 40, yaw: Math.PI }]).values())mesh.castShadow=false;
    for (const actor of frame.actors) {
      if (actor.species === "cat") { cat = new StudioFeline(); group.add(cat.group); continue; }
      const source = library.get(modelFor(actor.modelHint)); if (!source) throw Error(`Studio actor asset unavailable: ${actor.modelHint}`);
      const avatar = new StudioAvatar(source, actor.heightMeters * 10, actor.radius * .9, actor.wardrobe.shirt); avatar.tint({ shirt: actor.wardrobe.shirt, trousers: actor.wardrobe.trousers, skin: "#e6c69e" }); actors.set(actor.id, avatar); group.add(avatar.group);
      const contact=new THREE.Mesh(new THREE.CircleGeometry(actor.radius*.7,16),new THREE.MeshBasicMaterial({color:"#4b5145",transparent:true,opacity:.13,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.set(actor.position[0],.025,actor.position[2]);contact.name=`contact-${actor.id}`;group.add(contact);
    }
    scene.add(group); const stage = { group, actors, props, kitten: cat }; stages.set(frame.id, stage); return stage;
  }
  let dirty = true;
  const resize = new ResizeObserver(() => { renderer.setSize(host.clientWidth, host.clientHeight); camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix(); dirty = true; }); resize.observe(host);
  let handle = 0, dead = false, lastDraw = 0, lastId = "", lastTime = -10, lastStatus = 0;
  const target = new THREE.Vector3(), eye = new THREE.Vector3();
  function render() {
    renderer.render(scene, camera);
    host.dataset.triangles = String(renderer.info.render.triangles); host.dataset.drawCalls = String(renderer.info.render.calls); host.dataset.frames = String(Number(host.dataset.frames ?? 0) + 1);
  }
  function tick(stamp: number) {
    if (dead) return; handle = requestAnimationFrame(tick); if (document.hidden || stamp - lastDraw < 20) return;
    lastDraw = stamp; const state = input();
    if (!dirty && state.id === lastId && state.time === lastTime) { if (manual&&controls.update()) render(); return; }
    const frame = scenarioFrame(state.id, state.time), seeking = state.id !== lastId || Math.abs(state.time - lastTime) > .6;
    const stage = stages.get(state.id) ?? build(frame);
    for (const [id, item] of stages) item.group.visible = id === state.id;
    if (state.id !== lastId) {
      manual = false;
      let sky = skies.get(state.id); if (!sky) { const canvas = document.createElement("canvas"); canvas.width = 8; canvas.height = 256; const ctx = canvas.getContext("2d")!, gradient = ctx.createLinearGradient(0, 256, 0, 0); frame.theme.skyHex.forEach((color, i, all) => gradient.addColorStop(i / Math.max(1, all.length - 1), color)); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 8, 256); sky = new THREE.CanvasTexture(canvas); sky.colorSpace = THREE.SRGBColorSpace; skies.set(state.id, sky); }
      scene.background = sky; sun.position.set(-60, Math.tan(frame.theme.sunElevation * Math.PI / 180) * 80, 80); sun.color.set(frame.theme.kelvin < 5000 ? "#ffe1b1" : "#e8f2ff");
    }
    const contacts=poseStudioActors(stage.actors,frame);
    // Large queues retain the primary subject's real shadow; all cast have
    // inexpensive ground contact geometry. Small casts retain all body shadows.
    const focused=frame.dialogue[0]?.speaker??scenarioDefinitions.find(d=>d.id===frame.id)!.shots[frame.beat.index].targetId;
    for(const [id,avatar] of stage.actors)avatar.group.traverse(o=>{if((o as THREE.Mesh).isMesh)o.castShadow=stage.actors.size<=3||id===(stage.actors.has(focused)?focused:'ba');});
    for(const actor of frame.actors)if(actor.species==='cat'&&stage.kitten)stage.kitten.pose(frame.time,stagePoint(actor.position),actor.yaw,frame.time>=55,!!actor.carrierId);
    for(const actor of frame.actors){const shadow=stage.group.getObjectByName(`contact-${actor.id}`);if(shadow)shadow.position.set(actor.position[0],.025,actor.position[2]);}
    for (const prop of frame.props) {
      let group = stage.props.get(prop.id);
      if (!group) {
        const compiled = library.compile(modelFor(prop.modelHint ?? prop.kind));
        const model = compiled ? new THREE.Group().add(new THREE.Mesh(compiled.geometry, compiled.material)) : simpleProp(prop.kind), box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
        model.position.sub(box.getCenter(new THREE.Vector3())); group = new THREE.Group(); group.add(model);
        group.scale.set(prop.size[0] / Math.max(.01, size.x), prop.size[1]*STAGE_Y / Math.max(.01, size.y), prop.size[2] / Math.max(.01, size.z));
        stage.props.set(prop.id, group); stage.group.add(group);
      }
      group.visible = prop.visible; group.position.set(...stagePoint(prop.position)); group.rotation.set(...prop.rotation);
    }
    if (!manual) {
      const shot=studioCamera(frame,contacts,camera.aspect);target.copy(shot.target);eye.copy(shot.eye);host.dataset.cameraSubjects=JSON.stringify(shot.subjects);
      camera.position.copy(eye); controls.target.copy(target);
      camera.fov = frame.camera.fov; camera.updateProjectionMatrix();
    }
    controls.update(); render(); dirty = false;
    host.dataset.framing=JSON.stringify([...contacts,...frame.actors.filter(a=>a.species==='cat').map(a=>({id:a.id,head:[a.position[0],a.position[1]*STAGE_Y+2.25,a.position[2]]}))].map(c=>{const actor=frame.actors.find(a=>a.id===c.id)!;const head=new THREE.Vector3(...c.head).project(camera),feet=new THREE.Vector3(actor.position[0],0,actor.position[2]).project(camera);return{id:c.id,head:head.toArray(),feet:feet.toArray()};}));
    host.dataset.contacts=JSON.stringify(contacts);host.dataset.modelGeneration="daily-rig-v2";host.dataset.shadows=String(sun.castShadow);
    host.dataset.ready = "true"; host.dataset.scenario = frame.id; host.dataset.time = frame.time.toFixed(3); host.dataset.beat = String(frame.beat.index); host.dataset.assets = String(library.stats().loaded); host.dataset.assetFailures = String(library.stats().failed);
    if (stamp - lastStatus > 200 || seeking) { lastStatus = stamp; host.dataset.state = JSON.stringify(frame.state); host.dataset.cast = JSON.stringify(frame.actors.map(a => ({ id: a.id, age: a.age, clip: a.clip, position: a.position }))); host.dataset.props = JSON.stringify(frame.props.map(p => ({ id: p.id, holder: p.holderId, stage: p.stage, position: p.position }))); }
    lastId = state.id; lastTime = state.time;
  }
  handle = requestAnimationFrame(tick);
  return { dispose() {
    dead = true; for(const stage of stages.values())for(const actor of stage.actors.values())actor.dispose(); cancelAnimationFrame(handle); resize.disconnect(); controls.dispose();
    const sets = { geometries: new Set<THREE.BufferGeometry>(), materials: new Set<THREE.Material>(), textures: new Set<THREE.Texture>() }; collectAssetResources(scene, sets); library.collectAndClose(sets); skies.forEach(s => sets.textures.add(s)); sets.geometries.forEach(g => g.dispose()); sets.materials.forEach(m => m.dispose()); sets.textures.forEach(t => t.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  } };
}
