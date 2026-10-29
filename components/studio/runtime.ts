import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AssetLibrary, collectAssetResources, type AssetPlacement } from "../city/three/assets.ts";
import { simpleProp } from "../city/three/model-actors.ts";
import { scenarioFrame, scenarioDefinitions, type ScenarioId, type ScenarioFrame, type EnvironmentProp } from "../../lib/city/scenarios/index.ts";
import {pickVisible,TapGesture} from "../city/three/picking.ts";
import {StudioAvatar} from "./avatar.ts";
import {studioCloth} from "./cloth.ts";
import {studioCamera} from "./camera.ts";
import {poseStudioActors} from "./actors.ts";
import {StudioFeline} from "./feline.ts";
import {STAGE_Y,stagePoint} from "./motion.ts";
import { resolveModel } from "../../lib/city/asset-bindings.ts";

export type StudioRuntime = { focus:(id:string)=>void; dispose: () => void };
type Stage = { group: THREE.Group; actors: Map<string, StudioAvatar>; kitten: StudioFeline | null; props: Map<string, THREE.Group>; occluders: THREE.Object3D[] };
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
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture })),back=new THREE.Mesh(sign.geometry,sign.material);sign.position.z=.01;back.position.z=-.01;back.rotation.y=Math.PI;group.add(sign,back);
  } else group.add(box(0, h / 2, 0, w, h, d, prop.color));
  group.position.set(...stagePoint(prop.position)); return group;
}

export async function createStudio(host: HTMLDivElement, input: () => { id: ScenarioId; time: number; cameraReset?:number }, signal?: AbortSignal,onSelect:(id:string|null)=>void=()=>{}): Promise<StudioRuntime> {
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
  scene.add(hemi, sun); const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.minDistance = 12; controls.maxDistance = 1200; controls.maxPolarAngle = Math.PI / 2 - .03;renderer.domElement.tabIndex=0;controls.listenToKeyEvents(renderer.domElement);
  let manualBeforeGesture=false;
  let manual = false,focused:string|null=null,lastReset=-1,snapBeat:number|undefined;
  let focusAnchor:THREE.Vector3|undefined;
  const clearCameraMotion=()=>{const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;}; controls.addEventListener("start", () => {manualBeforeGesture=manual; manual = true; });
  const stages = new Map<ScenarioId, Stage>(), skies = new Map<ScenarioId, THREE.CanvasTexture>();
  function build(frame: ScenarioFrame): Stage {
    const group = new THREE.Group(), actors = new Map<string, StudioAvatar>(), props = new Map<string, THREE.Group>(),occluders:THREE.Object3D[]=[];
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
    for(const [id,mesh] of library.addBatches(group, staticModels)){mesh.castShadow=id.includes("tree");if(id.includes("tree"))occluders.push(mesh);}
    if (library.get("suburban/building-type-a")) for(const mesh of library.addBatches(group, [{ id: "suburban/building-type-a", x: -90, y: 0, z: -70, width: 48, height: 38, depth: 40, yaw: Math.PI }, { id: "suburban/building-type-a", x: 88, y: 0, z: -75, width: 48, height: 40, depth: 40, yaw: Math.PI }]).values()){mesh.castShadow=false;occluders.push(mesh);}
    for (const actor of frame.actors) {
      if (actor.species === "cat") { cat = new StudioFeline();cat.group.traverse(o=>{if((o as THREE.Mesh).isMesh)o.userData.actorId=actor.id;}); group.add(cat.group); continue; }
      const source = library.get(modelFor(actor.modelHint)); if (!source) throw Error(`Studio actor asset unavailable: ${actor.modelHint}`);
      const avatar = new StudioAvatar(source, actor.heightMeters * 10 * STAGE_Y, actor.radius * .9, actor.wardrobe.shirt); avatar.tint({ shirt: actor.wardrobe.shirt, trousers: actor.wardrobe.trousers, skin: "#e6c69e" }); actors.set(actor.id, avatar);avatar.assignId(actor.id); group.add(avatar.group);
      const contact=new THREE.Mesh(new THREE.CircleGeometry(actor.radius*.7,16),new THREE.MeshBasicMaterial({color:"#4b5145",transparent:true,opacity:.13,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.set(actor.position[0],.025,actor.position[2]);contact.name=`contact-${actor.id}`;group.add(contact);
    }
    scene.add(group); const stage = { group, actors, props, kitten: cat,occluders }; stages.set(frame.id, stage); return stage;
  }
  let dirty = true;
  const resize = new ResizeObserver(() => { renderer.setSize(host.clientWidth, host.clientHeight); camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix(); dirty = true; }); resize.observe(host);
  let handle = 0, dead = false, lastDraw = 0, lastId = "", lastTime = -10, lastStatus = 0;
  const target = new THREE.Vector3(), eye = new THREE.Vector3();
  let activeStage:Stage|undefined,activeFrame:ScenarioFrame|undefined,activeContacts:ReturnType<typeof poseStudioActors>=[],subjectPoints:THREE.Vector3[]=[];
  const sightRay=new THREE.Raycaster();sightRay.near=.01;
  function render() {
    // Cosmetic cutaway of decorative roofs/canopies only. Preserve all actors,
    // props, contacts and world geometry; an in-frame head must remain visible.
    if(activeStage){let hidden=0;activeStage.group.updateMatrixWorld(true);for(const object of activeStage.occluders){object.visible=true;const blocks=subjectPoints.some(point=>{const delta=point.clone().sub(camera.position);sightRay.far=delta.length()-.2;sightRay.set(camera.position,delta.normalize());return sightRay.intersectObject(object,true).length>0;});object.visible=!blocks;if(blocks)hidden++;}host.dataset.sceneryCutaways=String(hidden);host.dataset.sceneryBlockedSubjects=String(subjectPoints.filter(point=>{const delta=point.clone().sub(camera.position);sightRay.far=delta.length()-.2;sightRay.set(camera.position,delta.normalize());return activeStage!.occluders.some(object=>object.visible&&sightRay.intersectObject(object,true).length>0);}).length);}

    if(manual){controls.target.y=Math.max(.5,controls.target.y);if(camera.position.y<.75){camera.position.y=.75;camera.lookAt(controls.target);}}
    host.dataset.camera=JSON.stringify({position:camera.position.toArray(),target:controls.target.toArray(),mode:focused?'actor':manual?'manual':'script',focused,distance:camera.position.distanceTo(controls.target)});
    renderer.render(scene, camera);
    if(activeFrame){const shown=activeFrame;
    host.dataset.framing=JSON.stringify([...activeContacts,...shown.actors.filter(a=>a.species==='cat').map(a=>({id:a.id,head:[a.position[0],a.position[1]*STAGE_Y+2.25,a.position[2]]}))].map(c=>{const actor=shown.actors.find(a=>a.id===c.id)!;const head=new THREE.Vector3(...c.head).project(camera),feet=new THREE.Vector3(actor.position[0],actor.position[1]*STAGE_Y,actor.position[2]).project(camera);return{id:c.id,head:head.toArray(),feet:feet.toArray()};}));
    host.dataset.pickTargets=JSON.stringify(shown.actors.map(actor=>{const head=activeContacts.find(c=>c.id===actor.id)?.head??[actor.position[0],actor.position[1]+2.25,actor.position[2]],point=new THREE.Vector3(actor.position[0],actor.position[1]+(head[1]-actor.position[1])*.6,actor.position[2]).project(camera);return{id:actor.id,x:(point.x+1)*host.clientWidth/2,y:(1-point.y)*host.clientHeight/2,depth:point.z};}));
    }
    host.dataset.triangles = String(renderer.info.render.triangles); host.dataset.drawCalls = String(renderer.info.render.calls); host.dataset.frames = String(Number(host.dataset.frames ?? 0) + 1);
  }
  function tick(stamp: number) {
    if (dead) return; handle = requestAnimationFrame(tick); if (document.hidden || stamp - lastDraw < 20) return;
    lastDraw = stamp; const state = input();
    const reset=(state.cameraReset??0)!==lastReset;
    if(reset){clearCameraMotion();manual=false;focused=null;focusAnchor=undefined;onSelect(null);}
    if (!reset&&!dirty && state.id === lastId && state.time === lastTime) { if (manual&&controls.update()) render(); return; }
    const frame = scenarioFrame(state.id, state.time), seeking = state.id !== lastId || Math.abs(state.time - lastTime) > .6;
    const stage = stages.get(state.id) ?? build(frame);activeFrame=frame;
    if(reset)snapBeat=frame.beat.index;lastReset=state.cameraReset??0;
    for (const [id, item] of stages) item.group.visible = id === state.id;
    if (state.id !== lastId) {
      manual = false;focused=null;focusAnchor=undefined;onSelect(null);
      let sky = skies.get(state.id); if (!sky) { const canvas = document.createElement("canvas"); canvas.width = 8; canvas.height = 256; const ctx = canvas.getContext("2d")!, gradient = ctx.createLinearGradient(0, 256, 0, 0); frame.theme.skyHex.forEach((color, i, all) => gradient.addColorStop(i / Math.max(1, all.length - 1), color)); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 8, 256); sky = new THREE.CanvasTexture(canvas); sky.colorSpace = THREE.SRGBColorSpace; skies.set(state.id, sky); }
      scene.background = sky; sun.position.set(-60, Math.tan(frame.theme.sunElevation * Math.PI / 180) * 80, 80); sun.color.set(frame.theme.kelvin < 5000 ? "#ffe1b1" : "#e8f2ff");
    }
    const contacts=poseStudioActors(stage.actors,frame);activeContacts=contacts;
    // Pairs retain both body shadows; triples retain the primary subject's.
    // Larger queues use ground contact geometry to bound the shadow render pass.
    const shadowSubject=frame.dialogue[0]?.speaker??scenarioDefinitions.find(d=>d.id===frame.id)!.shots[frame.beat.index].targetId;
    for(const [id,avatar] of stage.actors)avatar.group.traverse(o=>{if((o as THREE.Mesh).isMesh)o.castShadow=stage.actors.size<=2||stage.actors.size===3&&id===(stage.actors.has(shadowSubject)?shadowSubject:'ba');});
    for(const actor of frame.actors)if(actor.species==='cat'&&stage.kitten)stage.kitten.pose(frame.time,stagePoint(actor.position),actor.yaw,frame.time>=55,!!actor.carrierId);
    for(const actor of frame.actors){const shadow=stage.group.getObjectByName(`contact-${actor.id}`);if(shadow)shadow.position.set(actor.position[0],.025,actor.position[2]);}
    for (const prop of frame.props) {
      let group = stage.props.get(prop.id);
      if (!group) {
        const compiled = library.compile(modelFor(prop.modelHint ?? prop.kind));
        const model = compiled ? new THREE.Group().add(new THREE.Mesh(compiled.geometry, compiled.material)) : prop.kind==="cloth"?studioCloth():simpleProp(prop.kind), box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
        model.position.sub(box.getCenter(new THREE.Vector3())); group = new THREE.Group(); group.add(model);
        group.scale.set(prop.size[0] / Math.max(.01, size.x), prop.size[1]*STAGE_Y / Math.max(.01, size.y), prop.size[2] / Math.max(.01, size.z));
        stage.props.set(prop.id, group); stage.group.add(group);
      }
      group.traverse(o=>{if((o as THREE.Mesh).isMesh)o.userData.actorId=prop.holderId??undefined;});
      group.visible = prop.visible; group.position.set(...stagePoint(prop.position)); group.rotation.set(...prop.rotation);
    }
    const shot=studioCamera(frame,contacts,camera.aspect,snapBeat===frame.beat.index);const subjects=focused?[focused]:shot.subjects;host.dataset.cameraSubjects=JSON.stringify(subjects);activeStage=stage;
    subjectPoints=subjects.flatMap(id=>{const contact=contacts.find(c=>c.id===id),actor=frame.actors.find(a=>a.id===id)!;const head=contact?.head??[actor.position[0],actor.position[1]*STAGE_Y+2.25,actor.position[2]];return [new THREE.Vector3(...head),new THREE.Vector3(head[0],head[1]*.65,head[2])];});
    if (!manual) {
      target.copy(shot.target);eye.copy(shot.eye);
      camera.position.copy(eye); controls.target.copy(target);
      camera.fov = frame.camera.fov; camera.updateProjectionMatrix();
    }
    if(focused){const next=actorAnchor(focused);if(next){if(focusAnchor){const delta=next.clone().sub(focusAnchor);controls.target.add(delta);camera.position.add(delta);}focusAnchor=next;}}
    if(frame.time>=scenarioDefinitions.find(d=>d.id===frame.id)!.shots[frame.beat.index].at+2.4)snapBeat=undefined;
    controls.update(); render(); dirty = false;
    host.dataset.contacts=JSON.stringify(contacts);host.dataset.modelGeneration="supplied-civilians-v1";host.dataset.shadows=String(sun.castShadow);
    host.dataset.ready = "true"; host.dataset.scenario = frame.id; host.dataset.time = frame.time.toFixed(3); host.dataset.beat = String(frame.beat.index); host.dataset.assets = String(library.stats().loaded); host.dataset.assetFailures = String(library.stats().failed);
    if (stamp - lastStatus > 200 || seeking) { lastStatus = stamp; host.dataset.state = JSON.stringify(frame.state); host.dataset.cast = JSON.stringify(frame.actors.map(a => ({ id: a.id, age: a.age, clip: a.clip, position: a.position }))); host.dataset.props = JSON.stringify(frame.props.map(p => ({ id: p.id, holder: p.holderId, stage: p.stage, position: p.position }))); }
    lastId = state.id; lastTime = state.time;
  }
  function actorAnchor(id:string){const actor=activeFrame?.actors.find(a=>a.id===id);if(!actor)return;const head=activeStage?.actors.get(id)?.head().y??(actor.position[1]+actor.heightMeters*10)*STAGE_Y;return new THREE.Vector3(actor.position[0],(head+actor.position[1]*STAGE_Y)*.5,actor.position[2]);}
  function focusActor(id:string){const actor=activeFrame?.actors.find(a=>a.id===id),anchor=actorAnchor(id);if(!actor||!anchor)return;const height=activeStage?.actors.get(id)?.height??2.5,offset=camera.position.clone().sub(controls.target),distance=Math.max(12,height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*(camera.aspect<.85?.5:.62)),actor.radius/(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*Math.max(.3,camera.aspect)*.7));
    clearCameraMotion();manual=true;focused=id;focusAnchor=anchor.clone();onSelect(id);controls.target.copy(anchor);camera.position.copy(anchor).addScaledVector(offset.normalize(),distance);dirty=true;
  }
  const pointer=new THREE.Vector2(),pickRay=new THREE.Raycaster(),gesture=new TapGesture();
  const pointerDown=(e:PointerEvent)=>gesture.down(e),pointerMove=(e:PointerEvent)=>gesture.move(e),pointerCancel=(e:PointerEvent)=>gesture.cancel(e),pointerWheel=()=>gesture.invalidate();
  const pointerUp=(e:PointerEvent)=>{if(!gesture.up(e))return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);pickRay.setFromCamera(pointer,camera);const hit=pickVisible(pickRay,scene);if(hit?.object.userData.actorId){host.dataset.lastPick=hit.object.userData.actorId;focusActor(hit.object.userData.actorId);}else{manual=manualBeforeGesture;dirty=true;}};
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',pointerCancel);renderer.domElement.addEventListener('wheel',pointerWheel,{passive:true});
  const cameraKey=(e:KeyboardEvent)=>{if(e.key.startsWith('Arrow'))manual=true;if(e.key==='Escape'){clearCameraMotion();manual=false;focused=null;focusAnchor=undefined;snapBeat=activeFrame?.beat.index;onSelect(null);dirty=true;}};
  renderer.domElement.addEventListener('keydown',cameraKey);
  handle = requestAnimationFrame(tick);
  return { focus:focusActor,dispose() {
    renderer.domElement.removeEventListener('keydown',cameraKey);
    renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',pointerCancel);renderer.domElement.removeEventListener('wheel',pointerWheel);
    dead = true; for(const stage of stages.values())for(const actor of stage.actors.values())actor.dispose(); cancelAnimationFrame(handle); resize.disconnect(); controls.dispose();
    const sets = { geometries: new Set<THREE.BufferGeometry>(), materials: new Set<THREE.Material>(), textures: new Set<THREE.Texture>() }; collectAssetResources(scene, sets); library.collectAndClose(sets); skies.forEach(s => sets.textures.add(s)); sets.geometries.forEach(g => g.dispose()); sets.materials.forEach(m => m.dispose()); sets.textures.forEach(t => t.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  } };
}
