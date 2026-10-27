import { activityLift, hasHandProp } from "../../../lib/living/action-presentation.ts";
import { createPracticeBicycle } from "./activity-props.ts";
import * as THREE from "three";
import { createHumanGeometry, HumanMotion } from "./humans.ts";
import { defaultAppearance, themes } from "../../../lib/city/appearance.ts";
import { HUMAN_SCALE } from "../../../lib/city/scale.ts";
import { groundElevation } from "../../../lib/city/ground.ts";
import type { Actor } from "../../../lib/life.ts";
import type { World } from "../../../lib/world";
import type { SocialPose } from "../../../lib/living/social.ts";

/** Six geometry batches for the whole cast, including joints, faces and props. */
export function createPeople(scene: THREE.Scene, capacity: number) {
  const geometry = createHumanGeometry(), motion = new HumanMotion();
  type Shape = keyof typeof geometry;
  const budget: Record<Shape, number> = { box: 42, round: 18, head: 5, hair: 1, limb: 14, shoe: 2 };
  const material = new THREE.MeshPhongMaterial({ shininess: 22, specular: "#7c7668" });
  const meshes = {} as Record<Shape, THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshPhongMaterial>>;
  for (const key of Object.keys(geometry) as Shape[]) {
    const mesh = new THREE.InstancedMesh(geometry[key], material, capacity * budget[key]);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.ids = []; mesh.count = 0; scene.add(mesh); meshes[key] = mesh;
  }
  const dummy = new THREE.Object3D(), root = new THREE.Matrix4(), face = new THREE.Matrix4(), combined = new THREE.Matrix4(), faceTurn = new THREE.Matrix4();
  const beforeHead = new THREE.Matrix4().makeTranslation(0, 32, 0), afterHead = new THREE.Matrix4().makeTranslation(0, -32, 0);
  const tint = new THREE.Color(), headings = new Map<string, number>();
  let currentId = "";
  const bicycles = new Map<string, THREE.Group>();
  function put(shape: Shape, x: number, y: number, z: number, w: number, h: number, d: number, color: string, rx = 0, ry = 0, rz = 0, head = false) {
    if (w <= 0 || h <= 0 || d <= 0) return;
    const mesh = meshes[shape], index = mesh.count++;
    if (index >= mesh.instanceMatrix.count) throw new RangeError(`Human ${shape} instance budget exceeded`);
    dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(w, h, d); dummy.updateMatrix();
    combined.multiplyMatrices(head ? face : root, dummy.matrix);
    mesh.setMatrixAt(index, combined); mesh.setColorAt(index, tint.set(color)); mesh.userData.ids[index] = currentId;
  }
  function chain(x: number, y: number, z: number, upper: number, lower: number, length: number, width: number, shirt: string, skin: string) {
    const elbow = [x, y - Math.cos(upper) * length, z - Math.sin(upper) * length];
    const palm = [x, elbow[1] - Math.cos(lower) * length, elbow[2] - Math.sin(lower) * length];
    put("limb", x, (y + elbow[1]) / 2, (z + elbow[2]) / 2, width, length + .6, width * 1.1, shirt, upper);
    put("limb", x, (elbow[1] + palm[1]) / 2, (elbow[2] + palm[2]) / 2, width * .8, length + .5, width * .9, skin, lower);
    put("limb", x, elbow[1], elbow[2], width * .9, width * .9, width * .9, skin);
    return palm;
  }
  return {
    geometry,
    draw(world: World, actors: Actor[], poses: Map<string, SocialPose>, seconds: number, dt: number, camera: THREE.Camera, selected: string, skip = new Set<string>()) {
      for (const mesh of Object.values(meshes)) { mesh.count = 0; mesh.userData.ids.length = 0; }
      for(const [id,bike] of bicycles) bike.visible = actors.some(a => a.id===id && a.kind==="cycle" && !a.walking);
      const frames = motion.frame(actors, poses, seconds, dt, world.paused);
      headings.clear();
      for (const a of actors) {
        currentId = a.id;
        const state = frames.get(a.id)!; const { pose, yaw } = state; headings.set(a.id, yaw); if (skip.has(a.id)) continue;
        const core = world.people.find(p => p.id === a.id), npc = world.living?.residents.find(p => p.id === a.id);
        const appearance = world.living?.appearances?.[a.id] ?? defaultAppearance(a.id, core?.role ?? `${npc?.roleId} ${world.living?.catalog.roles.find(r => r.id === npc?.roleId)?.label}`);
        const near = a.id === selected || Math.hypot(camera.position.x - a.position[0], camera.position.z - a.position[1]) < 240;
        const prop = !a.walking && hasHandProp(a.kind);
        const hair = { black: "#303d3d", brown: "#6c4b36", gray: "#a6b3b1", bald: appearance.skin }[appearance.hair];
        const leftSole = 13.2 - Math.cos(pose.leftLeg) * 5.8 - Math.cos(pose.leftLeg + pose.leftKnee) * 5.8 + .2 - 1.1;
        const rightSole = 13.2 - Math.cos(pose.rightLeg) * 5.8 - Math.cos(pose.rightLeg + pose.rightKnee) * 5.8 + .2 - 1.1;
        const base = groundElevation(a.position[0], a.position[1]) - Math.min(leftSole, rightSole) * HUMAN_SCALE;
        dummy.position.set(a.position[0], base + pose.breath * HUMAN_SCALE + activityLift(a.kind, seconds) + (a.kind === "cycle" && !a.walking ? 4 : 0), a.position[1]);
        dummy.rotation.set(0, yaw, pose.sway); dummy.scale.setScalar(HUMAN_SCALE); dummy.updateMatrix(); root.copy(dummy.matrix);
        faceTurn.makeRotationFromEuler(new THREE.Euler(pose.headTilt, pose.headTurn, 0));
        face.copy(root).multiply(beforeHead).multiply(faceTurn).multiply(afterHead);
        put("round", 0, 20.4, 0, 11.2, 13, 7.2, appearance.shirt);
        put("round", 0, 13.4, 0, 9.3, 2, 6.5, appearance.trousers);
        put("limb", 0, 27.2, 0, 3.2, 2.6, 3.2, appearance.skin);
        put("head", 0, 32, 0, 8.8, 9.6, 8.6, appearance.skin, 0, 0, 0, true);
        if (appearance.hair !== "bald") put("hair", 0, 35.3, -.5, 9.1, 5.4, 8.7, hair, 0, 0, 0, true);
        const cycling = a.kind === "cycle" && !a.walking;
        if(cycling && !bicycles.has(a.id)){const bike=createPracticeBicycle();scene.add(bike);bicycles.set(a.id,bike);}
        const bike=bicycles.get(a.id);if(bike){bike.visible=cycling;bike.position.set(a.position[0],groundElevation(...a.position),a.position[1]);bike.rotation.y=yaw;}
        const gear = themes.find(t => t.id === appearance.theme)?.headgear ?? "none";
        if (gear !== "none") {
          put("round", 0, 38.1, 0, 10.8, gear === "chef" ? 4 : 3.5, 10, gear === "hardhat" ? "#f3bc4e" : gear === "chef" ? "#fff5df" : appearance.shirt, 0, 0, 0, true);
          put("box", 0, 36.8, 1, 11.6, .7, 11.8, gear === "hardhat" ? "#e7a638" : "#f4e7cd", 0, 0, 0, true);
          if (gear === "chef") for (const x of [-3, 0, 3]) put("head", x, 40.8, 0, 5, 4.8, 7, "#fff6e4", 0, 0, 0, true);
        }
        const palms: number[][] = [];
        for (const [index, sign] of [-1, 1].entries()) {
          const angle = prop && ["read", "study"].includes(a.kind) ? -.55 + pose.breath * .1 : index === 0 ? pose.leftArm : pose.rightArm;
          const lift = ["eat", "drink"].includes(a.kind) && prop && index === 1 ? (Math.sin(seconds * 1.6) + 1) * .23 : 0;
          const palm = chain(sign * 7.1, 25.2, 0, angle - lift, angle - (prop ? .65 : .16) - lift, 6, 3.5, appearance.shirt, appearance.skin);
          palms.push(palm); put("round", palm[0], palm[1], palm[2], 3.3, 3.4, 3.2, appearance.skin);
          const thigh = index === 0 ? pose.leftLeg : pose.rightLeg, knee = index === 0 ? pose.leftKnee : pose.rightKnee;
          const foot = chain(sign * 3, 13.2, 0, thigh, thigh + knee, 5.8, 4.8, appearance.trousers, appearance.trousers);
          put("shoe", foot[0], foot[1] + .2, foot[2] + 1, 5.4, 2.5, 8, "#3e5255");
          if (near) put("box", foot[0], foot[1] - .8, foot[2] + 1, 5.6, .6, 8.2, "#e4d8be");
        }
        for (const sign of [-1, 1]) {
          put("box", sign * 1.9, 32.8, 4.3, .95, 1.45 * pose.blink, .7, "#233f46", 0, 0, 0, true);
          if (!near) continue;
          put("round", sign * 4.3, 31.8, -.1, 1.4, 2.5, 2, appearance.skin, 0, 0, 0, true);
          put("round", sign * 1.9, 32.8, 4.02, 2.1, 1.9 * pose.blink, .65, "#fff9e9", 0, 0, 0, true);
          put("box", sign * 2, 34.4, 3.8, 2.2, .4, .6, hair, 0, 0, sign * .08, true);
          put("box", sign * 2.9, 30.8, 3.7, 1.2, .5, .4, "#cb917b", 0, 0, 0, true);
          put("box", sign * 2.4, 25.4, 3.5, 2.7, 1, .7, "#eee2cc", 0, 0, sign * .3);
          if (appearance.face === "glasses") {
            for (const x of [-1.5, 1.5]) put("box", sign * 1.9 + x, 32.8, 4.8, .3, 2.6, .35, "#536b6c", 0, 0, 0, true);
            for (const y of [-1.2, 1.2]) put("box", sign * 1.9, 32.8 + y, 4.8, 3.2, .3, .35, "#536b6c", 0, 0, 0, true);
          }
        }
        put("box", 0, 29.8, 4.2, 2.6, pose.mouth, .6, "#815a4c", 0, 0, 0, true);
        if (near) {
          put("head", 0, 31.5, 4.25, 1.5, 1.7, 1.6, appearance.skin, 0, 0, 0, true);
          put("box", 0, 30, 4.5, appearance.face === "moustache" ? 4 : 0, .6, .6, hair, 0, 0, 0, true);
          for (const y of [18, 21, 24]) put("box", .1, y, 3.7, .6, .65, .5, "#f5e3bb");
          put("box", 3, 22.4, 3.8, 2.1, 2.7, .5, "#eedc9c");
        }
        if (prop && near) {
          const right = palms[1], middle = [0, (palms[0][1] + right[1]) / 2 + 1, (palms[0][2] + right[2]) / 2 + 1];
          if (["read", "study"].includes(a.kind)) {
            put("box", ...middle as [number, number, number], 11, .7, 6, "#bd7964", -.2);
            for (const sign of [-1, 1]) {
              put("box", sign * 2.7, middle[1] + .55, middle[2], 5.1, .5, 5.6, "#fff5da", -.2, 0, sign * .05);
              for (let row = 0; row < 3; row++) put("box", sign * 2.7, middle[1] + .9, middle[2] - 1 + row, 3.6, .05, .14, "#8ea6a0");
            }
          } else if (["eat", "drink"].includes(a.kind)) {
            put("round", right[0], right[1] + 1.4, right[2] + .8, 3.3, 3.7, 3.3, "#fff0c4");
            put("round", right[0], right[1] + 3.3, right[2] + .8, 2.6, .2, 2.6, "#9d6e43");
            put("box", right[0] + 2, right[1] + 1.5, right[2] + .8, 1.2, 2.1, 1, "#e4b879");
          } else if (a.kind === "garden") {
            put("round", right[0], right[1] + .3, right[2] + 1, 4.6, 4, 4, "#4b9a9c");
            put("box", right[0], right[1] + 1.4, right[2] + 4.1, 1.2, 1.4, 4.3, "#4b9a9c", -.35);
            for (let n = 0; n < 3; n++) { const fall = ((seconds * 1.4 + n / 3) % 1 + 1) % 1; put("box", right[0], right[1] - fall * 9, right[2] + 6.5 + fall, .35, .8, .35, "#94d7e3"); }
          } else if (a.kind === "shop") {
            put("box", right[0], right[1]-2, right[2], 5, 5, 2.7, "#c7a479");
            put("box", right[0], right[1]+.6, right[2], 3, .5, .5, "#8a6a48");
          } else {
            put("box", right[0], right[1] + 2.4, right[2], 1.1, 7, 1.1, "#bd9566", -.25);
            put("round", right[0], right[1] + 5.6, right[2] - .8, 5, 1.8, 2.5, "#8a9ca0", -.25);
          }
        }
      }
      for (const mesh of Object.values(meshes)) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
      return headings;
    },
    stats: () => ({ batches: Object.keys(meshes).length, instances: Object.values(meshes).reduce((sum, mesh) => sum + mesh.count, 0) }),
  };
}
