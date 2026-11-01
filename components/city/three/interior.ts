import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { interiorKind, interiorPhase } from "@/lib/city/lifestory";
import { interiorAction, interiorProp } from "@/lib/city/interior-actions";
import { defaultAppearance } from "@/lib/city/appearance";
import { computeSimMs, worldTime } from "@/lib/clock";
import { actorsAt } from "@/lib/life";
import { crowdAt } from "@/lib/living/engine";
import type { World } from "@/lib/world";

export type InteriorCamera = 'wide' | 'follow' | 'overhead';
export function createInterior(host: HTMLDivElement, venue: string, floor: number, world: () => World, offset: number, options: {camera:InteriorCamera; focusId?:string} = {camera:'wide'}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
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
  function box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, parent: THREE.Object3D = scene) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: .68 }); materials.push(material);
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
  } else {
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
      const x = -4 + col * 4.5, z = -1.8 + row * 4.2;
      box(x, 1.5, z, 2.8, .18, 1.7, "#ab7956"); box(x, .7, z, .25, 1.4, .25, "#665848"); chair(x, z + 1.25);
      if (dining) { box(x, 1.65, z, .65, .08, .65, "#fff1ce"); box(x + .8, 1.8, z, .22, .4, .22, "#a4cbc3"); }
      else { box(x, 1.64, z, .9, .1, .65, study ? "#b37457" : "#829cae"); box(x + .7, 1.7, z, .15, .3, .15, "#e3b85d"); }
    }
  }
  box(-6, 1.35, -4.9, 3, 2.7, .75, "#7c6958");
  for (let i = 0; i < 11; i++) box(-7.25 + i * .24, 1.8, -4.4, .17, .7 + (i % 3) * .12, .3, ["#69897a", "#bd886b", "#dbbd7b"][i % 3]);
  // Kitchen/service counter, sink and shelves.
  box(-7, 1.05, 2, 1.4, 2.1, 4, dining ? "#4e7f78" : "#af967a"); box(-7, 2.15, 2, 1.6, .18, 4.2, "#eee4d1"); box(-7, 2.26, 1.4, .9, .08, .8, "#99b3b4");
  const pot = new THREE.Group(); scene.add(pot); box(-6, .45, 4.5, .7, .9, .7, "#b97757", pot); box(-6, 1.3, 4.5, 1.2, 1, 1, "#688967", pot); box(-6, 2, 4.5, .7, .8, .7, "#83a374", pot);
  // Visible shaft, moving cabin and sliding doors. No actor transport is fabricated.
  box(6.2, 3, -3.8, .2, 6, 3.5, "#546e79"); box(3.9, 3, -3.8, .16, 6, 3.5, "#546e79");
  const cabin = new THREE.Group(); scene.add(cabin); box(5.05, .2, -3.8, 2.1, .25, 3, "#a9bbb8", cabin); box(5.05, 1.3, -5.2, 2.1, 2.5, .1, "#819b9d", cabin);
  const doorL = box(4.5, 1.5, -2.25, 1, 2.8, .12, "#aebfc0", cabin), doorR = box(5.6, 1.5, -2.25, 1, 2.8, .12, "#aebfc0", cabin);
  const figures = new THREE.Group(); scene.add(figures);
  // Simple but fully 3D character silhouettes, connected to the actual
  // resident list. No synthetic occupants appear when the venue is empty.
  const bodies: {root:THREE.Group;shirt:THREE.Mesh;legs:THREE.Mesh[];
    armL:THREE.Mesh;armR:THREE.Mesh;head:THREE.Mesh;held:THREE.Mesh;heldDetail:THREE.Mesh}[]=[];
  for (let i = 0; i < 12; i++) {
    const root = new THREE.Group(); figures.add(root);
    const shirt = box(0,1.57,0,.75,1.03,.48,"#7b9f95",root);
    const head = box(0,2.37,0,.55,.55,.52,"#d8b18c",root);
    const eyes = box(0,2.41,.275,.32,.07,.035,"#475350",root);
    eyes.castShadow=false;
    const legs = [-.19,.19].map(x=>box(x,.59,0,.26,.93,.29,"#5c7481",root));
    const armL = box(-.53,1.57,.03,.22,.84,.26,"#7b9f95",root);
    const armR = box(.53,1.57,.03,.22,.84,.26,"#7b9f95",root);
    const held = box(.74,1.48,.36,.45,.32,.43,"#e2bb82",root);
    const heldDetail = box(.74,1.69,.36,.36,.05,.29,"#fff3dd",root);
    bodies.push({root,shirt,legs,armL,armR,head,held,heldDetail});
  }
  let frame = 0, last = 0;
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); key.shadow.mapSize.setScalar(w<600?512:1024); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  function tick(stamp: number) {
    frame = requestAnimationFrame(tick); if (document.hidden || stamp - last < 33) return; last = stamp;
    const w = world(), now = Date.now() + offset, sim = computeSimMs(w.born, w.clock, now) / 1000, phase = interiorPhase(sim), daylight = worldTime(w, now).daylight;
    key.intensity = 1.2 + daylight * 2.8; hemi.intensity = 1.3 + daylight;
    cabin.position.y = (phase.liftY - floor) * 3.3; cabin.visible = Math.abs(cabin.position.y) < 3.5;
    const slide = phase.doorsOpen ? .75 : 0; doorL.position.x = 4.5 - slide; doorR.position.x = 5.6 + slide;
    const atVenue = [...actorsAt(w, now), ...(w.living ? crowdAt(w.living, w, now) : [])]
      .filter((a) => !a.walking && a.location === venue);
    const present = [...atVenue].sort((a,b) =>
      Number(b.id === options.focusId)-Number(a.id === options.focusId));
    const shown = present.slice(0,bodies.length),seenActions: string[]=[];
    bodies.forEach((part,i)=>{
      const actor=shown[i],figure=part.root;
      // The world knows the venue but not a room/floor. Never duplicate a\n      // resident on each imaginary storey; ground-floor cutaway is an\n      // illustrative venue-wide projection, upper floors show architecture only.\n      figure.visible=!!actor && floor===0;if(!actor || floor!==0)return;
      const action=interiorAction(actor.kind,actor.activity);
      seenActions.push(action);
      const col=(i%3),row=Math.floor(i/3);
      figure.position.set(-4.5+col*3.3,0,-1.8+row*1.7);
      const sway=Math.sin(sim*.7+i)*.06;
      figure.rotation.y=sway;figure.rotation.z=0;
      const role=w.people.find(p=>p.id===actor.id)?.role ??
        w.living?.residents.find(r=>r.id===actor.id)?.roleId ?? '';
      const clothing=w.living?.appearances?.[actor.id] ?? defaultAppearance(actor.id,role);
      for (const mesh of [part.shirt,part.armL,part.armR])
        (mesh.material as THREE.MeshStandardMaterial).color.set(clothing.shirt);
      for (const leg of part.legs)(leg.material as THREE.MeshStandardMaterial).color.set(clothing.trousers);
      (part.head.material as THREE.MeshStandardMaterial).color.set(clothing.skin);
      const beat=Math.sin(sim*2.1+i)*.35,slow=Math.sin(sim*.65+i);
      part.armL.rotation.x=0;part.armR.rotation.x=0;part.head.rotation.x=0;
      part.head.rotation.y=slow*.07;
      if(['eat','drink','serve'].includes(action))part.armR.rotation.x=-.35-.35*Math.max(0,Math.sin(sim*1.6+i));
      else if(['read','write','study','type','repair','pack','cook','wash','clean','tidy','garden','shop','browse','care'].includes(action)){
        part.armL.rotation.x=-.3+beat*.23;part.armR.rotation.x=-.35-beat*.22;
        part.head.rotation.x=.12;
      }else if(action==='social'){part.armR.rotation.x=-.45-.3*Math.max(0,slow);}
      else if(action==='exercise'){part.armR.rotation.x=beat;part.armL.rotation.x=-beat;}
      else if(action==='sleep'){
        // Reclined pose is a visual metaphor, not proof of sleep completion.
        figure.rotation.z=-Math.PI/2;figure.position.y=.98;
      }else if(action==='rest'){part.head.rotation.y=slow*.045;}
      const prop=interiorProp(action);
      part.held.visible=part.heldDetail.visible=prop!=='none';
      const shape:Record<string,[number,number,number,string]> = {
        cup:[.29,.49,.29,'#f2ddae'],plate:[.68,.09,.56,'#f2eadb'],
        pan:[.67,.21,.52,'#69787b'],book:[.72,.14,.49,'#c79276'],
        tablet:[.72,.42,.08,'#7e9fae'],bag:[.47,.62,.36,'#c5ad86'],
        tool:[.13,.85,.18,'#8ba39a'],medical:[.44,.32,.38,'#d6e4de'],
      };
      if(prop!=='none'){
        const [w,h,d,color]=shape[prop]??shape.book;
        part.held.scale.set(w,h,d);
        (part.held.material as THREE.MeshStandardMaterial).color.set(color);
        part.heldDetail.visible=prop==='book'||prop==='tablet'||prop==='cup';
        part.heldDetail.scale.set(w*.7,.05,Math.max(.05,d*.5));
      }
    });
    host.dataset.interiorVisible=String(floor===0?shown.length:0);
    host.dataset.interiorVenueCount=String(atVenue.length);
    host.dataset.interiorActions=JSON.stringify(seenActions);\n    host.dataset.floorLocationsVerified='false';
    host.dataset.interiorResidents=JSON.stringify(shown.map(a=>({id:a.id,kind:a.kind,action:interiorAction(a.kind,a.activity)})));
    const followed=shown.find(a=>a.id===options.focusId)??shown[0];
    if(options.camera==='follow'&&followed){
      const index=shown.indexOf(followed),point=new THREE.Vector3(-4.5+(index%3)*3.3,1.6,-1.8+Math.floor(index/3)*1.7);
      controls.target.lerp(point,.15);
      // Camera stays in the currently selected room; never flies through a
      // wall or pretends to follow a different unseen building.
    }
    controls.update(); renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); geometry.dispose(); materials.forEach((m) => m.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
}
