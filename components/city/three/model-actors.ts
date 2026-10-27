import * as THREE from "three";
import { AssetAvatar, AssetLibrary } from "./assets.ts";
import { defaultAppearance } from "../../../lib/city/appearance.ts";
import { groundElevation } from "../../../lib/city/ground.ts";
import { resolveModel } from "../../../lib/city/asset-bindings.ts";
import type { World } from "../../../lib/world";
import type { Actor } from "../../../lib/life.ts";
import type { SocialPose } from "../../../lib/living/social.ts";

export const proceduralPropKinds = ["book", "read", "wallet", "phone", "note", "crutch", "leaf", "cup", "drink", "eat", "garden", "can", "broom", "bread", "blanket", "cloth", "tool", "work"];
export function simpleProp(kind: string) {
  if (!proceduralPropKinds.includes(kind)) throw new Error(`No procedural prop recipe for ${kind}`);
  const group = new THREE.Group();
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhongMaterial({ color, shininess: 12 })); mesh.position.set(x, y, z); group.add(mesh); };
  if (/book|read/.test(kind)) { box(0, 0, 0, 3.7, .3, 2.3, "#bc7759"); box(0, .23, 0, 3.4, .2, 2.1, "#fff0cc"); box(0, .4, 0, .09, .1, 2, "#a1b6af"); }
  else if (/wallet/.test(kind)) { box(0, 0, 0, 2.3, .35, 1.6, "#654333"); box(0, .2, 0, 2, .05, 1.3, "#b49265"); }
  else if (/phone/.test(kind)) { box(0, 0, 0, 1.1, 2.2, .25, "#34464a"); box(0, .1, .14, .9, 1.8, .02, "#6f9b9c"); }
  else if (/note/.test(kind)) { box(0, 0, 0, 2, .05, .9, "#92b7a4"); box(0, .04, 0, 1.5, .01, .6, "#c6ddbb"); }
  else if (/crutch/.test(kind)) { box(0, 0, 0, .35, 15, .35, "#a8835c"); box(0, 7.4, 0, 2.1, .7, .7, "#b59570"); box(.5, .7, 0, 1.5, .5, .6, "#aa855e"); box(0, -7.4, 0, .8, .8, .8, "#40575a"); }
  else if (/leaf/.test(kind)) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(.5, 5, 3), new THREE.MeshPhongMaterial({ color: "#b7a16d" })); leaf.scale.set(1.2, .08, .6); group.add(leaf); }
  else if (/cup|drink|eat/.test(kind)) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(.65, .55, 1.4, 12), new THREE.MeshPhongMaterial({ color: "#f0d694" })); cup.position.y = .7; group.add(cup); box(.75, .7, 0, .4, .7, .4, "#dbc28b"); }
  else if (/garden|can/.test(kind)) { box(0, .5, 0, 1.8, 1.5, 1.4, "#4e9ea3"); box(0, .7, 1.5, .5, .5, 2, "#4e9ea3"); }
  else if (/broom/.test(kind)) { box(0, 4, 0, .25, 13, .25, "#bb9a71"); box(0, -2.7, 0, 2.5, 1, .6, "#a38358"); }
  else if (/bread/.test(kind)) { const bread = new THREE.Mesh(new THREE.CapsuleGeometry(.65, 1.5, 3, 8), new THREE.MeshPhongMaterial({ color: "#e1b36c" })); bread.rotation.z = Math.PI / 2; group.add(bread); }
  else if (/blanket|cloth/.test(kind)) box(0, 0, 0, 6, .3, 4, "#d99aa8");
  else { box(0, .6, 0, .4, 3, .4, "#ba976a"); box(0, 2.1, 0, 1.6, .6, .8, "#8ca0a1"); }
  return group;
}

export function createModelActors(scene: THREE.Scene, library: AssetLibrary) {
  const avatars = new Map<string, AssetAvatar>(), props = new Map<string, { kind: string; group: THREE.Group }>(), travel = new Map<string, { x: number; z: number; distance: number }>();
  for (const [id, modelId] of [["an", resolveModel("character-a")!], ["binh", resolveModel("character-b")!], ["chi", resolveModel("character-c")!]]) {
    const source = library.get(modelId); if (!source) continue;
    const avatar = new AssetAvatar(source); avatar.assignId(id); scene.add(avatar.group); avatars.set(id, avatar);
  }
  return {
    ids: new Set(avatars.keys()),
    draw(world: World, actors: Actor[], social: Map<string, SocialPose>, headings: Map<string, number>, seconds: number) {
      for (const [id, avatar] of avatars) {
        const actor = actors.find(a => a.id === id); avatar.group.visible = !!actor; if (!actor) continue;
        const old = travel.get(id), distance = old?.distance ?? 0;
        const walked = world.paused || !old ? 0 : Math.min(3, Math.hypot(actor.position[0] - old.x, actor.position[1] - old.z));
        travel.set(id, { x: actor.position[0], z: actor.position[1], distance: distance + walked });
        const person = world.people.find(p => p.id === id), appearance = world.living?.appearances?.[id] ?? defaultAppearance(id, person?.role);
        avatar.tint(appearance);
        const holding = !actor.walking && ["read", "eat", "garden", "work"].includes(actor.kind);
        const speaking = social.get(id)?.speaking;
        const clip = actor.walking ? "walk" : holding ? actor.kind === "read" ? "holding-both" : "holding-right" : speaking ? "emote-yes" : "idle";
        const animationTime = actor.walking ? (distance + walked) / 14 * (2 / 3) : seconds;
        avatar.pose(clip, animationTime, seconds, actor.position, headings.get(id) ?? .35, groundElevation(...actor.position));
        const oldProp = props.get(id);
        if (holding && oldProp?.kind !== actor.kind) {
          if (oldProp) { scene.remove(oldProp.group); oldProp.group.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose(); if (m.material) (m.material as THREE.Material).dispose(); }); }
          const group = simpleProp(actor.kind); scene.add(group); props.set(id, { kind: actor.kind, group });
        }
        const prop = props.get(id)?.group;
        if (prop) { prop.visible = holding; const right = avatar.hand(); prop.position.copy(actor.kind === "read" ? right.add(avatar.hand("left")).multiplyScalar(.5) : right); prop.rotation.set(0, headings.get(id) ?? .35, 0); }
      }
    },
  };
}
