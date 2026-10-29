import { activityLift, hasHandProp, handProp } from "../../../lib/living/action-presentation.ts";
import { createBicycle, spinBicycle } from "./activity-props.ts";
import * as THREE from "three";
import { AssetLibrary } from "./assets.ts";
import {ActorActions} from "./actor-actions.ts";
import { RiggedAvatar } from "./rigged-avatar.ts";
import { CORE_MODELS, CITIZEN_FALLBACK, residentModel } from "../../../lib/city/character-models.ts";
import { defaultAppearance } from "../../../lib/city/appearance.ts";
import { groundElevation } from "../../../lib/city/ground.ts";
import type { World } from "../../../lib/world";
import type { Actor } from "../../../lib/life.ts";
import type { SocialPose } from "../../../lib/living/social.ts";

export const proceduralPropKinds = [
  "book", "read", "wallet", "phone", "note", "crutch", "leaf", "cup", "drink", "eat",
  "garden", "can", "broom", "bread", "blanket", "cloth", "tool", "work", "bag",
  "cook", "wok", "pan", "pot", "soccer", "ball", "football", "swim", "float",
  "lantern", "festival", "umbrella", "drum"
];

export function simpleProp(kind: string,library?:Partial<Pick<AssetLibrary,'compile'>>) {
  if (!proceduralPropKinds.includes(kind)) throw new Error(`No procedural prop recipe for ${kind}`);
  const group = new THREE.Group();
  if(/^(book|read)$/.test(kind)){
    const source=library?.compile?.('supplied/props/book');
    if(source){const mesh=new THREE.Mesh(source.geometry.clone(),source.material.clone());mesh.scale.setScalar(Math.min(3.7/source.size.x,.55/source.size.y,2.3/source.size.z));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);group.userData.assetId='supplied/props/book';return group;}
  }
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhongMaterial({ color, shininess: 18, specular: "#635d52" }));
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.position.set(x, y, z); group.add(mesh);
  };
  if (/book|read/.test(kind)) { box(0, 0, 0, 3.7, .3, 2.3, "#bc7759"); box(0, .23, 0, 3.4, .22, 2.1, "#fff4d9"); box(0, .41, 0, .14, .12, 2.15, "#5e8c83"); }
  else if (/wallet/.test(kind)) { box(0, 0, 0, 2.3, .38, 1.6, "#6b4432"); box(0, .21, 0, 2.05, .07, 1.35, "#c59f6d"); box(.7, .23, 0, .35, .1, .45, "#e6c98a"); }
  else if (/phone/.test(kind)) { box(0, 0, 0, 1.1, 2.2, .25, "#2d3e44"); box(0, .06, .14, .94, 1.85, .03, "#7cb0b4"); box(0, -.88, .15, .28, .08, .03, "#d8ecec"); }
  else if (/note/.test(kind)) { box(0, 0, 0, 2, .05, .9, "#92b7a4"); box(0, .04, 0, 1.6, .02, .65, "#dcf0d2"); }
  else if (/crutch/.test(kind)) { box(0, 0, 0, .35, 15, .35, "#a8835c"); box(0, 7.4, 0, 2.1, .75, .75, "#c4a27a"); box(.5, .7, 0, 1.5, .5, .6, "#aa855e"); box(0, -7.4, 0, .82, .82, .82, "#3a5054"); }
  else if (/leaf/.test(kind)) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(.5, 8, 6), new THREE.MeshPhongMaterial({ color: "#b7a16d", shininess: 14 })); leaf.scale.set(1.2, .08, .6); group.add(leaf); }
  else if (/cook|wok|pan|pot/.test(kind)) {
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.15, .55, 16), new THREE.MeshPhongMaterial({ color: "#343d42", shininess: 28 }));
    pan.position.y = .3; group.add(pan);
    const food = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.1, .18, 14), new THREE.MeshPhongMaterial({ color: "#f2c15a", shininess: 20 }));
    food.position.y = .52; group.add(food);
    box(2.1, .42, 0, 1.8, .22, .32, "#8c583a");
    const stirrer=new THREE.Group();stirrer.name='stirrer';const handle=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1.4,5),new THREE.MeshPhongMaterial({color:'#b78d5c'}));handle.position.y=-.6;const bowl=new THREE.Mesh(new THREE.SphereGeometry(.24,6,4),new THREE.MeshPhongMaterial({color:'#a2afb0'}));bowl.position.y=-1.45;bowl.scale.y=.4;stirrer.add(handle,bowl);group.add(stirrer);
  }
  else if (/soccer|ball|football/.test(kind)) {
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), new THREE.MeshPhongMaterial({ color: "#f7f5eb", shininess: 22 }));
    ball.position.y = 1.15; group.add(ball);
    for (const [dx, dy, dz] of [[0, 2.1, 0], [.9, 1.3, .5], [-.9, 1.3, .5], [0, 1.1, -1]]) box(dx, dy, dz, .48, .18, .48, "#28363b");
  }
  else if (/swim|float/.test(kind)) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, .55, 10, 20), new THREE.MeshPhongMaterial({ color: "#f08b6d", shininess: 24 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = .6; group.add(ring);
  }
  else if (/lantern|festival/.test(kind)) {
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), new THREE.MeshPhongMaterial({ color: "#e35642", emissive: "#ff9d42", emissiveIntensity: .35, shininess: 20 }));
    lantern.scale.set(1, 1.25, 1); lantern.position.y = 1.2; group.add(lantern);
    box(0, 2.5, 0, .7, .25, .7, "#e8c252"); box(0, -.2, 0, .5, .6, .5, "#e8c252");
  }
  else if (/umbrella/.test(kind)) {
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.5, 12), new THREE.MeshPhongMaterial({ color: "#579da6", shininess: 18 }));
    canopy.position.y = 4.2; group.add(canopy); box(0, 2.1, 0, .22, 4.2, .22, "#735c48");
  }
  else if (/drum/.test(kind)) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 1.8, 16), new THREE.MeshPhongMaterial({ color: "#c94a38", shininess: 22 }));
    drum.position.y = .9; group.add(drum);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, .12, 16), new THREE.MeshPhongMaterial({ color: "#f7ead0", shininess: 14 }));
    top.position.y = 1.82; group.add(top);
  }
  else if (kind === "bag") { box(0,.8,0,2.4,2.2,1.3,"#d4b181"); box(0,2.1,0,1.6,.25,.3,"#9e7953"); }
  else if (/cup|drink|eat/.test(kind)) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(.68, .55, 1.4, 16), new THREE.MeshPhongMaterial({ color: "#f6e0a6", shininess: 24 })); cup.position.y = .7; group.add(cup); const coffee = new THREE.Mesh(new THREE.CylinderGeometry(.58, .58, .1, 14), new THREE.MeshPhongMaterial({ color: "#6e472b", shininess: 30 })); coffee.position.y = 1.38; group.add(coffee); box(.75, .7, 0, .4, .7, .4, "#dbc28b"); }
  else if (/garden|can/.test(kind)) { box(0, .5, 0, 1.8, 1.5, 1.4, "#4e9ea3"); box(0, .7, 1.5, .48, .48, 2, "#4e9ea3"); box(0, 1.35, -.2, 1.1, .35, 1.1, "#3d8287"); }
  else if (/broom/.test(kind)) { box(0, 4, 0, .26, 13, .26, "#c2a075"); box(0, -2.1, 0, 2.2, .45, .55, "#7c6548"); box(0, -2.8, 0, 2.5, 1.05, .62, "#b59160"); }
  else if (/bread/.test(kind)) { const bread = new THREE.Mesh(new THREE.CapsuleGeometry(.65, 1.5, 4, 12), new THREE.MeshPhongMaterial({ color: "#e3b466", shininess: 16 })); bread.rotation.z = Math.PI / 2; group.add(bread); for (const x of [-.5, 0, .5]) box(x, .58, 0, .18, .15, .75, "#f6dca2"); }
  else if (/blanket|cloth/.test(kind)) { box(0, 0, 0, 6, .32, 4, "#df9ca9"); box(0, .18, 0, 5.4, .08, 3.5, "#f3c4cd"); }
  else { box(0, .6, 0, .42, 3, .42, "#ba976a"); box(0, 2.1, 0, 1.65, .62, .82, "#8ca0a1"); }
  return group;
}

export function resolveActorClip(actor: Actor, speaking = false): string {
  const act = `${actor.kind} ${actor.activity ?? ""} ${actor.location ?? ""}`.toLowerCase();
  if (actor.bicycle) return "drive";
  if (actor.kind === "cycle") return actor.walking ? "walk" : "idle";
  if (actor.walking && actor.transport && actor.transport !== "walk") return "drive";
  if (actor.walking) return ["run", "tag"].includes(actor.kind) || /run|sprint|chạy|vội/.test(act) ? "sprint" : "walk";
  if (actor.kind === "run") return "sprint";
  if (actor.kind === "tag") return "idle"; // Waiting/yielding is not running in place.
  if (/jump|nhảy|cheer|cổ vũ/.test(act)) return "idle";
  if (/soccer|đá bóng|kick/.test(act)) return "idle";
  if (/swim|bơi/.test(act)) return "idle";
  if (/cook|nấu ăn|bếp/.test(act)) return "holding-both";
  if (/sit|ngồi|nghỉ/.test(act) && actor.kind === "rest") return "sit";
  if (["read", "study", "eat", "drink", "garden", "work", "shop"].includes(actor.kind)) return ["read", "study"].includes(actor.kind) ? "holding-both" : "holding-right";
  if (speaking) return "emote-yes";
  return "idle";
}

export function placeActionProp(prop:THREE.Group,kind:string,height:number,yaw:number,origin:THREE.Vector3,hands:{left:THREE.Vector3;right:THREE.Vector3},seconds:number){
 const scale=height/17.5;prop.scale.setScalar(scale*(kind==='swim'?1.4:1));prop.rotation.set(kind==='read'?-.2:0,yaw+(kind==='cook'?Math.PI:0),kind==='cup'?-.12:0);
 if(kind==='soccer')prop.position.copy(new THREE.Vector3(0,0,3+Math.max(0,Math.sin(seconds*2))*.6).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(origin));
 else if(kind==='swim')prop.position.copy(origin).add(new THREE.Vector3(0,height*.44-.6*prop.scale.y,0));
 else{
  const anchor=kind==='read'?hands.right.clone().add(hands.left).multiplyScalar(.5):hands.right;
  const grips:Record<string,number[]>={cook:[2.1,.42,0],garden:[0,1.35,-.2],can:[0,1.35,-.2],bag:[0,2.1,0],work:[0,.4,0],tool:[0,.4,0]};
  prop.position.copy(anchor).sub(new THREE.Vector3(...(grips[kind]??[0,0,0])).multiplyScalar(scale).applyQuaternion(prop.quaternion));
  const stirrer=prop.getObjectByName('stirrer');if(stirrer){prop.updateMatrixWorld(true);stirrer.position.copy(prop.worldToLocal(hands.left.clone()));}
 }
}

export function actorActionKind(actor:Actor){
 const act=`${actor.kind} ${actor.activity??''} ${actor.location??''}`.toLowerCase();
 return ['drink','eat','study','shop'].includes(actor.kind)?handProp(actor.kind):/cook|nấu ăn/.test(act)?'cook':/soccer|đá bóng/.test(act)?'soccer':/swim|bơi/.test(act)?'swim':/lễ hội|festival|đèn lồng/.test(act)?'lantern':actor.kind;
}

export function createModelActors(scene: THREE.Scene, library: AssetLibrary) {
  const avatars = new Map<string, RiggedAvatar>(), props = new Map<string, { kind: string; group: THREE.Group }>(), travel = new Map<string, { x: number; z: number; distance: number }>();
  const ids = new Set<string>(), modelIds = new Map<string, string>();
  const posed = new Set<string>();
  const verticalMotion=new Map<string,{key:string;start:number;from:number;last:number}>();
  const actions=new ActorActions();
  const bicycles = new Map<string, THREE.Group>();
  const remove = (id: string) => {
    avatars.get(id)?.dispose(); avatars.delete(id); ids.delete(id); modelIds.delete(id);
    for (const group of [props.get(id)?.group, bicycles.get(id)]) if (group) {
      group.removeFromParent(); group.traverse(o => { const mesh = o as THREE.Mesh; mesh.geometry?.dispose(); if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.dispose(); });
    }
    props.delete(id); bicycles.delete(id); travel.delete(id); posed.delete(id); verticalMotion.delete(id); actions.forget(id);
  };
  const request = (id:string) => {if(!library.get(id)&&!library.failures.has(id))void library.load(id).catch(()=>{});};
  const install = (id:string,wanted:string) => {
    request(wanted);
    const modelId=library.get(wanted)?wanted:library.get(CITIZEN_FALLBACK)?CITIZEN_FALLBACK:Object.values(CORE_MODELS).find(key=>library.get(key));
    if(!modelId||modelIds.get(id)===modelId)return;
    const source=library.get(modelId)!,previousTravel=travel.get(id),previousMotion=verticalMotion.get(id);if(ids.has(id))remove(id);if(previousTravel)travel.set(id,previousTravel);if(previousMotion)verticalMotion.set(id,previousMotion);
    const avatar=new RiggedAvatar(source,17.5,4.4);avatar.assignId(id);scene.add(avatar.group);avatars.set(id,avatar);ids.add(id);modelIds.set(id,modelId);
  };
  for(const [id,model] of Object.entries(CORE_MODELS))install(id,model);
  return {
    ids,
    /** Bounded close cast: three core plus selected, speakers and nearby residents. */
    prepare(world:World,selected:string,nearby:Actor[]=[],speakers:Iterable<string>=[]) {
      for(const [id,model] of Object.entries(CORE_MODELS))install(id,model);
      const visible=new Set(nearby.map(a=>a.id)),wanted=[...new Set([selected,...speakers,...nearby.map(a=>a.id)])]
        .filter(id=>!CORE_MODELS[id]&&(id===selected||visible.has(id))&&world.living?.residents.some(r=>r.id===id)).slice(0,5);
      for(const id of [...ids])if(!CORE_MODELS[id]&&!wanted.includes(id))remove(id);
      for(const id of wanted){const resident=world.living!.residents.find(r=>r.id===id)!;install(id,residentModel(resident.roleId,resident.id));}
    },
    draw(world: World, actors: Actor[], social: Map<string, SocialPose>, headings: Map<string, number>, seconds: number, gait?:(id:string)=>number,sharedLift?:(id:string)=>number) {
      for (const [id, avatar] of avatars) {
        const actor = actors.find(a => a.id === id); avatar.group.visible = !!actor;
        if (!actor) { const prop = props.get(id)?.group, bike = bicycles.get(id); if (prop) prop.visible = false; if (bike) bike.visible = false; continue; }

        const old = travel.get(id), distance = old?.distance ?? 0;
        const walked = world.paused || !old ? 0 : Math.min(3, Math.hypot(actor.position[0] - old.x, actor.position[1] - old.z));
        travel.set(id, { x: actor.position[0], z: actor.position[1], distance: distance + walked });
        const person = world.people.find(p => p.id === id), appearance = world.living?.appearances?.[id] ?? defaultAppearance(id, person?.role);
        avatar.tint(appearance);
        if(world.paused&&posed.has(id))continue;
        const propKind = actorActionKind(actor);
        const holding = !actor.bicycle && !actor.walking && (hasHandProp(actor.kind) || ["cook", "soccer", "swim", "lantern"].includes(propKind));
        const speaking = social.get(id)?.speaking;
        const clip = !actor.walking && social.has(id)
          ? speaking ? "talk" : "listen" : resolveActorClip(actor, speaking);
        const animationTime = actor.bicycle ? 0 : actor.walking ? (gait?gait(id)/(Math.PI*2):(distance+walked)/14)*avatar.duration(clip) : seconds;
        const motionKey=actor.bicycle?'cycle':actor.walking?'walk':actor.kind;
        let vertical=verticalMotion.get(id);if(!vertical){vertical={key:motionKey,start:seconds,from:0,last:0};verticalMotion.set(id,vertical);}if(vertical.key!==motionKey){vertical={key:motionKey,start:seconds,from:vertical.last,last:vertical.last};verticalMotion.set(id,vertical);}
        const phase=seconds-vertical.start,t=THREE.MathUtils.clamp(phase/.4,0,1),ease=t*t*(3-2*t),lift=actor.walking?0:activityLift(actor.kind,phase);vertical.last=vertical.from*(1-ease)+lift*ease;
        const changed=avatar.pose(clip,animationTime,seconds,actor.position,headings.get(id)??.35,groundElevation(...actor.position)+(sharedLift?sharedLift(id):vertical.last)+(actor.bicycle?4:0));
        if(changed)actions.apply(avatar,actor,holding?propKind:actor.kind,seconds,sharedLift?sharedLift(id):vertical.last);
        const cycling=!!actor.bicycle;
        if(cycling && !bicycles.has(id)){const bike=createBicycle();bike.traverse(o=>{if((o as THREE.Mesh).isMesh)o.userData.actorId=id;});scene.add(bike);bicycles.set(id,bike);}
        const bike=bicycles.get(id);if(bike){bike.visible=cycling;bike.position.set(actor.position[0],groundElevation(...actor.position),actor.position[1]);bike.rotation.y=headings.get(id)??.35;if(actor.bicycle)spinBicycle(bike,actor.bicycle.distance);}
        posed.add(id);
        const oldProp = props.get(id);
        if (holding && oldProp?.kind !== propKind) {
          if (oldProp) { scene.remove(oldProp.group); oldProp.group.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose(); if (m.material) (m.material as THREE.Material).dispose(); }); }
          const group = simpleProp(propKind,library);group.traverse(o=>{if((o as THREE.Mesh).isMesh)o.userData.actorId=id;}); group.scale.setScalar(avatar.height / 17.5); scene.add(group); props.set(id, { kind: propKind, group });
        }
        const prop = props.get(id)?.group;
        if(prop){prop.visible=holding;placeActionProp(prop,propKind,avatar.height,headings.get(id)??.35,new THREE.Vector3(actor.position[0],groundElevation(...actor.position),actor.position[1]),{left:avatar.hand('left'),right:avatar.hand('right')},seconds);}

      }
    },
    head: (id: string) => avatars.get(id)?.head(),
    height: (id: string) => { const avatar = avatars.get(id); return avatar?.height??17.5; },
    snapshots: () => Object.fromEntries([...avatars].map(([id, avatar]) => [id, { ...avatar.snapshot(), modelId: modelIds.get(id) }])),
    dispose() { for (const id of [...ids]) remove(id); },
  };
}
