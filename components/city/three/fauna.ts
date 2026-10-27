import * as THREE from "three";
import type { animalsAt } from "../../../lib/life.ts";
import { groundElevation } from "../../../lib/city/ground.ts";
import type { createHumanGeometry } from "./humans.ts";

type Animal = ReturnType<typeof animalsAt>[number];
/** Recognizable animal silhouettes, pooled across the three existing policies. */
export function createFauna(scene: THREE.Scene, geometry: ReturnType<typeof createHumanGeometry>) {
  const material = new THREE.MeshPhongMaterial({ shininess: 10 });
  const shapes = { round: geometry.round, head: geometry.head, limb: geometry.limb, box: geometry.box, cone: new THREE.ConeGeometry(.5, 1, 4) };
  type Shape = keyof typeof shapes;
  const meshes = {} as Record<Shape, THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshPhongMaterial>>;
  for (const key of Object.keys(shapes) as Shape[]) { const mesh = new THREE.InstancedMesh(shapes[key], material, 128); mesh.count = 0; mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh); meshes[key] = mesh; }
  const dummy = new THREE.Object3D(), root = new THREE.Matrix4(), result = new THREE.Matrix4(), color = new THREE.Color();
  const states = new Map<string, { x: number; z: number; yaw: number; phase: number; weight: number }>();
  const put = (shape: Shape, x: number, y: number, z: number, w: number, h: number, d: number, tint: string, rx = 0, rz = 0) => {
    const mesh = meshes[shape], at = mesh.count++; if (at >= 128) throw new RangeError("Animal part budget exceeded");
    dummy.position.set(x, y, z); dummy.scale.set(w, h, d); dummy.rotation.set(rx, 0, rz); dummy.updateMatrix(); result.multiplyMatrices(root, dummy.matrix); mesh.setMatrixAt(at, result); mesh.setColorAt(at, color.set(tint));
  };
  return {
    draw(animals: Animal[], seconds: number, dt: number, paused: boolean) {
      for (const mesh of Object.values(meshes)) mesh.count = 0;
      for (const animal of animals) {
        let state = states.get(animal.id);
        if (!state) { state = { x: animal.position[0], z: animal.position[1], yaw: .4, phase: 0, weight: 0 }; states.set(animal.id, state); }
        const dx = animal.position[0] - state.x, dz = animal.position[1] - state.z, distance = Math.hypot(dx, dz);
        if (!paused) {
          const moving = animal.walking && distance > .001;
          const wanted = moving ? Math.atan2(dx, dz) : state.yaw;
          const alpha = 1 - Math.exp(-8 * Math.max(0, Math.min(.15, dt)));
          state.yaw += Math.atan2(Math.sin(wanted - state.yaw), Math.cos(wanted - state.yaw)) * alpha;
          state.weight += ((moving ? 1 : 0) - state.weight) * alpha;
          state.phase = (state.phase + Math.min(3, distance) * Math.PI * 2 / 9) % (Math.PI * 2);
          state.x = animal.position[0]; state.z = animal.position[1];
        }
        const floor = groundElevation(...animal.position), bird = animal.species === "bird", dog = animal.species === "dog";
        dummy.position.set(animal.position[0], floor + (bird && animal.walking ? 24 : .05), animal.position[1]); dummy.rotation.set(0, state.yaw, 0); dummy.scale.setScalar(bird ? .55 : dog ? .65 : .55); dummy.updateMatrix(); root.copy(dummy.matrix);
        if (bird) {
          for (let n = 0; n < 3; n++) {
            const x = (n - 1) * 3, z = n % 2 * 3;
            put("head", x, 1.5, z, 1.8, 2.2, 3, "#ad9576"); put("head", x, 2.7, z + 1, 1.7, 1.7, 1.8, "#9a8269");
            put("cone", x, 2.6, z + 2.1, .7, 1.2, .7, "#ddb36b", Math.PI / 2);
            for (const sign of [-1, 1]) { put("round", x + sign, 1.9, z, 1, .4, 2.5, "#6d7d7c", 0, sign * (animal.walking ? Math.sin(seconds * 15 + n) * .65 : .1)); put("box", x + sign * .5, 2.9, z + 1.6, .3, .35, .3, "#243e43"); }
            put("round", x, 1.4, z - 1.7, .8, .4, 2, "#607573", -.25);
          }
          continue;
        }
        const fur = dog ? "#bb9773" : "#d1a37b", length = dog ? 8 : 6;
        put("round", 0, dog ? 4 : 3.5, 0, dog ? 4.3 : 3.4, 3.6, length, fur);
        put("head", 0, dog ? 5.8 : 5.4, length / 2, dog ? 3.9 : 3.2, 3.3, 3.5, fur);
        for (const sign of [-1, 1]) {
          if (dog) put("round", sign * 1.9, 5.5, length / 2, 1.2, 3.4, 2.3, "#967b62");
          else { put("cone", sign * 1, 7.5, length / 2, 1.5, 2, 1.5, fur); put("box", sign, 7.4, length / 2 + .5, .55, .7, .2, "#d79e95"); }
          put("box", sign * .85, 6, length / 2 + 1.55, .45, .7, .35, "#294347");
          for (const end of [-1, 1]) {
            const phase = state.phase + (sign === end ? 0 : Math.PI), angle = Math.sin(phase) * .35 * state.weight;
            put("limb", sign * 1.25, 1.8, end * length * .3, 1.1, 3.1, 1.1, fur, angle);
            put("round", sign * 1.25, .4, end * length * .3 + .35, 1.4, .7, 1.8, "#e2c49c");
          }
        }
        put("round", 0, 5.1, length / 2 + 1.7, dog ? 2.7 : 1.8, 1.8, dog ? 2.3 : 1.3, "#e4c8a6");
        put("box", 0, 5.5, length / 2 + (dog ? 2.9 : 2.3), .8, .6, .5, "#4d544b");
        put("limb", Math.sin(seconds * (dog ? 5 : 1.5)) * .5, 4.4, -length / 2 - .8, .9, 4.7, .9, fur, -.45, Math.sin(seconds * 2) * .18);
      }
      for (const mesh of Object.values(meshes)) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
    },
    stats: { policies: 3, birds: 3, batches: 5 },
  };
}
