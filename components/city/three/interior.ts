import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { interiorKind, interiorPhase } from "@/lib/city/lifestory";
import { computeSimMs, worldTime } from "@/lib/clock";
import { actorsAt } from "@/lib/life";
import { crowdAt } from "@/lib/living/engine";
import type { World } from "@/lib/world";

export function createInterior(host: HTMLDivElement, venue: string, floor: number, world: () => World, offset: number) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#182b39");
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 200); camera.position.set(17, 18, 23);
  const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 2, 0); controls.minDistance = 12; controls.maxDistance = 45; controls.maxPolarAngle = 1.4; controls.enableDamping = true;
  const hemi = new THREE.HemisphereLight("#d4eaff", "#a58061", 2); scene.add(hemi);
  const key = new THREE.DirectionalLight("#ffdfb4", 4); key.position.set(-8, 18, 8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; Object.assign(key.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 }); scene.add(key);
  const geometry = new THREE.BoxGeometry(1, 1, 1), materials: THREE.Material[] = [];
  function box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, parent: THREE.Object3D = scene) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: .68 }); materials.push(material);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const kind = interiorKind(venue), dining = kind === "dining", study = kind === "study";
  // Open front and right walls preserve a readable cutaway at every camera angle.
  box(0, -.2, 0, 16, .4, 12, "#d9c6aa"); box(0, 2.8, -6, 16, 6, .22, "#e4ded0"); box(-8, 2.8, 0, .22, 6, 12, "#c4d3cd");
  for (let x = -7; x < 8; x += 1) box(x, .015, 0, .018, .025, 12, "#b7a78f");
  // Window mullions and a luminous courtyard beyond the rear wall.
  for (let i = 0; i < 3; i++) { box(-5 + i * 3.4, 3.3, -5.84, 2.8, 2.6, .12, "#86b4c0"); box(-5 + i * 3.4, 3.3, -5.7, .08, 2.7, .1, "#f6ecd7"); }
  function chair(x: number, z: number, back = true) { box(x, .9, z, .9, .2, .9, "#467b77"); if (back) box(x, 1.5, z - .4, .9, 1, .15, "#467b77"); for (const dx of [-.32, .32]) for (const dz of [-.32, .32]) box(x + dx, .4, z + dz, .08, .8, .08, "#594a3a"); }
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    const x = -4 + col * 4.5, z = -1.8 + row * 4.2;
    box(x, 1.5, z, 2.8, .18, 1.7, "#ab7956"); box(x, .7, z, .25, 1.4, .25, "#665848"); chair(x, z + 1.25);
    if (dining) { box(x, 1.65, z, .65, .08, .65, "#fff1ce"); box(x + .8, 1.8, z, .22, .4, .22, "#a4cbc3"); }
    else { box(x, 1.64, z, .9, .1, .65, study ? "#b37457" : "#829cae"); box(x + .7, 1.7, z, .15, .3, .15, "#e3b85d"); }
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
  for (let i = 0; i < 12; i++) { const person = new THREE.Group(); figures.add(person); box(0, 1.5, 0, .65, 1, .4, ["#d5a565", "#6e9caa", "#a47980"][i % 3], person); box(0, 2.3, 0, .5, .5, .5, "#e4b895", person); for (const x of [-.18, .18]) box(x, .6, 0, .22, .9, .26, "#415e70", person); }
  let frame = 0, last = 0;
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  function tick(stamp: number) {
    frame = requestAnimationFrame(tick); if (document.hidden || stamp - last < 33) return; last = stamp;
    const w = world(), now = Date.now() + offset, sim = computeSimMs(w.born, w.clock, now) / 1000, phase = interiorPhase(sim), daylight = worldTime(w, now).daylight;
    key.intensity = 1.2 + daylight * 2.8; hemi.intensity = 1.3 + daylight;
    cabin.position.y = (phase.liftY - floor) * 3.3; cabin.visible = Math.abs(cabin.position.y) < 3.5;
    const slide = phase.doorsOpen ? .75 : 0; doorL.position.x = 4.5 - slide; doorR.position.x = 5.6 + slide;
    const present = [...actorsAt(w, now), ...(w.living ? crowdAt(w.living, w, now) : [])].filter((a) => !a.walking && a.location === venue);
    figures.children.forEach((figure, i) => { figure.visible = floor === 0 && i < present.length; figure.position.set(-4 + (i % 3) * 2.4, 0, 1 + Math.floor(i / 3) * 1.2); figure.rotation.y = Math.sin(sim * .35 + i) * .12; });
    controls.update(); renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); geometry.dispose(); materials.forEach((m) => m.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
}
