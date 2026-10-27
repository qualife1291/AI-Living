import * as THREE from "three";
import { createPeople } from "./people";
import { seed } from "@/lib/world";
import type { Actor } from "@/lib/life";
import type { Appearance } from "@/lib/city/appearance";
import { initializeLiving } from "@/lib/living/engine";

export function createAppearancePreview(host: HTMLDivElement, appearance: () => Appearance) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .1, 200);
  camera.position.set(22, 17, 42); camera.lookAt(0, 9, 0);
  scene.add(new THREE.HemisphereLight("#ffffff", "#788564", 3));
  const light = new THREE.DirectionalLight("#fff4d2", 2); light.position.set(8, 30, 20); scene.add(light);
  const people = createPeople(scene, 1);
  const world = { ...structuredClone(seed), paused: false, living: initializeLiving(0) };
  const actor: Actor = { id: "an", name: "An", kind: "rest", activity: "", location: "", from: "", position: [0, 0], path: [[0, 0]], walking: false, progress: 1, source: "routine" };
  host.appendChild(renderer.domElement);
  const draw = () => {
    world.living.appearances = { an: appearance() };
    camera.aspect = Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight); camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
    people.draw(world, [actor], new Map(), 0, 0, camera, "an");
    renderer.render(scene, camera);
  };
  const observer = new ResizeObserver(draw);
  const dispose = () => {
    observer.disconnect();
    const geometry = new Set<THREE.BufferGeometry>(); people.collectGeometry(geometry);
    geometry.forEach(g => g.dispose());
    const materials = new Set<THREE.Material>();
    scene.traverse(o => { if (o instanceof THREE.Mesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); });
    materials.forEach(m => m.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  };
  try { observer.observe(host); draw(); } catch (error) { dispose(); throw error; }
  return { draw, dispose };
}
