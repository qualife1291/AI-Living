import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { interiorKind, interiorPhase } from "@/lib/city/lifestory";
import { interiorAction } from "@/lib/city/interior-actions";
import {AssetLibrary} from "./assets";
import {createInteriorCast} from "./interior-cast";
import {batchInteriorRoom,createInteriorFurniture} from "./interior-furniture";
import {createHomeAppliances} from './home-appliances';
import {cinemaSeat} from './home-poses';
import { computeSimMs, worldTime } from "@/lib/clock";
import { actorsAt } from "@/lib/life";
import { crowdAt } from "@/lib/living/engine";
import type { World } from "@/lib/world";

export type InteriorCamera = 'wide' | 'follow' | 'overhead';
export function createInterior(host: HTMLDivElement, venue: string, floor: number, world: () => World, offset: number|(()=>number), options: {camera:InteriorCamera; focusId?:string} = {camera:'wide'}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#182b39");
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 200);
  camera.position.set(...(options.camera === "overhead" ? [0,32,.01] : options.camera === "follow" ? [8,10,13] : [17,18,23]) as [number,number,number]);
  const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 2, 0); controls.minDistance = 12; controls.maxDistance = 45; controls.maxPolarAngle = 1.4; controls.enableDamping = true;
  const hemi = new THREE.HemisphereLight("#d4eaff", "#a58061", 2); scene.add(hemi);
  const key = new THREE.DirectionalLight("#ffdfb4", 4); key.position.set(-8, 18, 8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; Object.assign(key.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 }); scene.add(key);
  const geometry = new THREE.BoxGeometry(1, 1, 1), materials: THREE.Material[] = [];
  const library=new AssetLibrary(),furniture=createInteriorFurniture(scene,library);
  // Reuse room palette materials; native rigs own their wardrobe materials.
  const staticMaterials = new Map<string, THREE.MeshStandardMaterial>();
  function box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, parent: THREE.Object3D = scene) {
    let material = staticMaterials.get(color);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: .68 });
      materials.push(material);
      staticMaterials.set(color, material);
    }
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const kind = interiorKind(venue), dining = kind === "dining", study = kind === "study";
  host.dataset.interiorCamera=options.camera;
  host.dataset.interiorFloor=String(floor);
  host.dataset.interiorLocation=venue;
  // Open front and right walls preserve a readable cutaway at every camera angle.
  box(0, -.2, 0, 16, .4, 12, "#d9c6aa"); box(0, 2.8, -6, 16, 6, .22, "#e4ded0"); box(-8, 2.8, 0, .22, 6, 12, "#c4d3cd");
  for (let x = -7; x < 8; x += 1) box(x, .015, 0, .018, .025, 12, "#b7a78f");
  // Window mullions and a luminous courtyard beyond the rear wall.
  for (let i = 0; i < 3; i++) { box(-5 + i * 3.4, 3.3, -5.84, 2.8, 2.6, .12, "#86b4c0"); box(-5 + i * 3.4, 3.3, -5.7, .08, 2.7, .1, "#f6ecd7"); }
  function chair(x: number, z: number, back = true) { box(x, .9, z, .9, .2, .9, "#467b77"); if (back) box(x, 1.5, z - .4, .9, 1, .15, "#467b77"); for (const dx of [-.32, .32]) for (const dz of [-.32, .32]) box(x + dx, .4, z + dz, .08, .8, .08, "#594a3a"); }
  if (kind === "home") {
    // A residential cutaway: two distinct beds with pillows/duvets, wardrobes,
    // low drawers and a bedside light. Furniture is visual only; sleep and
    // ownership remain exclusively in the authenticated world state.
    for (const [i,x] of [-4.3,.4].entries()) {
      box(x,.40,.45,3.2,.8,4.5,"#986f58");
      box(x,.92,.45,3.05,.22,4.3,"#e9dec3");
      box(x,1.03,1.25,2.85,.16,2.4,i===0?"#8bb3b2":"#c69fb6");
      box(x,1.06,-1.25,2.3,.21,.9,"#fff5df");
      box(x,.93,-1.82,3.2,1.8,.24,"#765e4f");
    }
    for (const x of [-5.9,-2.7,1.5]) {
      box(x,1.65,-4.65,1.4,3.3,1.4,"#977c62");
      box(x,1.75,-3.88,1.16,2.9,.10,"#bda083");
      box(x+.32,1.7,-3.80,.07,.34,.09,"#d7c6a2");
    }
    box(2.75,.7,3.7,1.45,1.4,1.4,"#ad967b");
    box(2.75,1.45,3.7,1.6,.12,1.6,"#d9c5a6");
    box(2.75,1.84,3.7,.50,.72,.5,"#edcb7e");
  } else if(kind==='cinema'){
    for(let i=0;i<8;i++){const [x,,z]=cinemaSeat(i);chair(x,z);}
  } else {
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
      const x = -4 + col * 4.5, z = -1.8 + row * 4.2;
      box(x, 1.5, z, 2.8, .18, 1.7, "#ab7956"); box(x, .7, z, .25, 1.4, .25, "#665848"); chair(x, z + 1.25);
      if (dining) { box(x, 1.65, z, .65, .08, .65, "#fff1ce"); box(x + .8, 1.8, z, .22, .4, .22, "#a4cbc3"); }
      else {
        const book=new THREE.Group();box(x,1.64,z,.9,.1,.65,study?'#b37457':'#829cae',book);
        furniture.add({id:'supplied/props/book',x,y:1.59,z,width:.9,height:.16,depth:.65},book);
        const lamp=new THREE.Group();box(x+.9,1.8,z,.2,.42,.2,'#e3b85d',lamp);
        furniture.add({id:'supplied/props/lamp',x:x+.9,y:1.59,z,width:.4,height:.65,depth:.4},lamp);
      }
    }
  }
  const shelf=new THREE.Group();box(-6,1.35,-4.9,3,2.7,.75,'#7c6958',shelf);
  for(let i=0;i<11;i++)box(-7.25+i*.24,1.8,-4.4,.17,.7+(i%3)*.12,.3,['#69897a','#bd886b','#dbbd7b'][i%3],shelf);
  furniture.add({id:'supplied/props/shelf',x:-6,y:0,z:-4.9,width:3,height:2.7,depth:.85},shelf);
  // Kitchen/service counter, sink and shelves.
  box(-7, 1.05, 2, 1.4, 2.1, 4, dining ? "#4e7f78" : "#af967a"); box(-7, 2.15, 2, 1.6, .18, 4.2, "#eee4d1"); box(-7, 2.26, 1.4, .9, .08, .8, "#99b3b4");
  const pot = new THREE.Group(); scene.add(pot); box(-6, .45, 4.5, .7, .9, .7, "#b97757", pot); box(-6, 1.3, 4.5, 1.2, 1, 1, "#688967", pot); box(-6, 2, 4.5, .7, .8, .7, "#83a374", pot);
  furniture.add({id:'supplied/props/plant',x:-6,y:0,z:4.5,width:1.2,height:2.8,depth:1.2},pot);
  // Visible shaft, moving cabin and sliding doors. No actor transport is fabricated.
  box(6.2, 3, -3.8, .2, 6, 3.5, "#546e79"); box(3.9, 3, -3.8, .16, 6, 3.5, "#546e79");
  const cabin = new THREE.Group(); scene.add(cabin); box(5.05, .2, -3.8, 2.1, .25, 3, "#a9bbb8", cabin); box(5.05, 1.3, -5.2, 2.1, 2.5, .1, "#819b9d", cabin);
  const doorL = box(4.5, 1.5, -2.25, 1, 2.8, .12, "#aebfc0", cabin), doorR = box(5.6, 1.5, -2.25, 1, 2.8, .12, "#aebfc0", cabin);
  const appliances=kind==='home'||kind==='cinema'?createHomeAppliances(scene,box,kind==='home',kind==='cinema'):undefined;
  const room=batchInteriorRoom(scene,geometry),cast=createInteriorCast(scene,library);
  let frame = 0, last = 0, renderedFrames = 0;
  let lastWidth = 0, lastHeight = 0;
  let sampledAt = Number.NEGATIVE_INFINITY, sampledWorld: World | null = null, actorSamples = 0;
  let atVenue: ReturnType<typeof actorsAt> = [];
  host.dataset.interiorFrames = '0';
  host.dataset.interiorActorSamples = '0';
  host.dataset.interiorMaterials = String(materials.length);
  // The DOM host survives camera/floor remounts. Never retain old callbacks or
  // occupants as evidence that the newly created canvas has rendered them.
  host.dataset.interiorModels='[]';host.dataset.interiorNativeCount='0';
  host.dataset.interiorResidents='[]';host.dataset.interiorVisible='0';
  host.dataset.interiorFurniture='[]';host.dataset.interiorPoseClock='';
  // Ignore transient zero-size layout during camera/floor changes instead of
  // allocating a zero-sized render target or invalid perspective projection.
  const resize = () => {
    const w = Math.floor(host.clientWidth), h = Math.floor(host.clientHeight);
    if (w < 2 || h < 2 || (w === lastWidth && h === lastHeight)) return;
    lastWidth = w; lastHeight = h;
    renderer.setSize(w, h);
    key.shadow.mapSize.setScalar(w < 600 ? 512 : 1024);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  // Recompute authoritative venue occupancy at <= 4 Hz (or on a fresh world
  // snapshot); keep animations and WebGL frames at 30 FPS. This is only a visual
  // cache: no resident plan, arrival, policy or reward is written.
  function tick(stamp: number) {
    frame = requestAnimationFrame(tick);
    if (document.hidden || stamp - last < 33) return;
    resize();
    if (lastWidth < 2 || lastHeight < 2) return;
    last = stamp;
    const w = world(), now = Date.now() + (typeof offset==='function'?offset():offset), sim = computeSimMs(w.born, w.clock, now) / 1000, phase = interiorPhase(sim), daylight = worldTime(w, now).daylight;
    host.dataset.interiorPoseClock=sim.toFixed(3);
    key.intensity = 1.2 + daylight * 2.8; hemi.intensity = 1.3 + daylight;
    cabin.position.y = (phase.liftY - floor) * 3.3; cabin.visible = Math.abs(cabin.position.y) < 3.5;
    const slide = phase.doorsOpen ? .75 : 0; doorL.position.x = 4.5 - slide; doorR.position.x = 5.6 + slide;
    if (sampledWorld !== w || now - sampledAt >= 250) {
      atVenue = [...actorsAt(w, now), ...(w.living ? crowdAt(w.living, w, now) : [])]
        .filter((a) => !a.walking && a.location === venue);
      atVenue.sort((a,b) => Number(b.id === options.focusId)-Number(a.id === options.focusId));
      sampledWorld = w;
      sampledAt = now;
      host.dataset.interiorActorSamples = String(++actorSamples);
    }
    furniture.update();
    cast.draw(w,atVenue,sim,floor,options.focusId,kind==='home',kind==='cinema');
    host.dataset.interiorFurniture=JSON.stringify(furniture.snapshots());
    const native=cast.snapshots(),shown=atVenue.slice(0,8);
    if(appliances)host.dataset.interiorAppliances=JSON.stringify(appliances.update(sim,native.some(a=>a.action==='fridge'),native.some(a=>a.action==='watch-tv'||a.action==='watch-film')));
    const seenActions=native.map(a=>a.action);
    host.dataset.interiorModels=JSON.stringify(native);
    host.dataset.interiorNativeCount=String(native.length);
    host.dataset.interiorVisible=String(native.length);
    host.dataset.interiorVenueCount=String(atVenue.length);
    host.dataset.interiorActions=JSON.stringify(seenActions);
    host.dataset.floorLocationsVerified='false';
    host.dataset.interiorResidents=JSON.stringify(shown.filter(a=>native.some(n=>n.id===a.id)).map(a=>({id:a.id,kind:a.kind,action:interiorAction(a.kind,a.activity)})));
    const followed=shown.find(a=>a.id===options.focusId)??shown[0];
    if(options.camera==='follow'&&followed){
      const point=cast.focus(followed.id)??new THREE.Vector3(0,1.6,0);
      controls.target.lerp(point,.15);
      // Camera stays in the currently selected room; never flies through a
      // wall or pretends to follow a different unseen building.
    }
    controls.update(); renderer.render(scene, camera);
    if(renderedFrames%15===0){
      const used=new Set<THREE.Material>();scene.traverse(o=>{const mesh=o as THREE.Mesh;
        if(mesh.isMesh)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])used.add(material);
      });host.dataset.interiorMaterials=String(used.size);
    }
    // A mode label is not a rendered frame: browser acceptance must wait for
    // actual WebGL draws after each camera/floor switch (especially mobile).
    host.dataset.interiorFrames=String(++renderedFrames);
    host.dataset.interiorDrawCalls=String(renderer.info.render.calls);
  }
  frame = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); cast.dispose(); furniture.dispose(); appliances?.dispose(); room.dispose(); library.dispose(); geometry.dispose(); materials.forEach((m) => m.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
}
