import {
  BoxGeometry,
  CapsuleGeometry,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {activityLift} from "../../../lib/living/action-presentation.ts";
import type { Actor } from "@/lib/life";

/** Unit bounds let the instanced renderer retain its physical dimensions. */
function unitBounds<T extends BufferGeometry>(geometry: T): T {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(1 / size.x, 1 / size.y, 1 / size.z);
  geometry.computeBoundingBox();
  return geometry;
}

/** Shared fauna/traffic primitives; civilian bodies use their approved GLB skins. */
export function createSharedPrimitives(sharp = true): {
  box: BufferGeometry;
  round: BufferGeometry;
  head: BufferGeometry;
  limb: BufferGeometry;
} {
  return {
    box: new BoxGeometry(1, 1, 1),
    round: unitBounds(new RoundedBoxGeometry(1, 1, 1, sharp ? 2 : 1, 0.16)),
    head: unitBounds(new SphereGeometry(0.5, sharp ? 14 : 12, sharp ? 10 : 8)),
    limb: unitBounds(new CapsuleGeometry(0.25, 0.5, sharp ? 3 : 1, sharp ? 10 : 6)),
  };
}

function actorPhase(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

type MotionState = { position: [number, number]; phase: number; weight: number; yaw: number; action:string; started:number; fromLift:number; lift:number };
/** Gait follows distance actually travelled, never the requested schedule.
 * Joint transitions ease without moving the collision-safe root position. */
export class HumanMotion {
  private states = new Map<string, MotionState>();
  lift(id:string){return this.states.get(id)?.lift??0;}
  phase(id:string){return this.states.get(id)?.phase??0;}
  frame(actors: Actor[], poses: Map<string, { peerId: string; gesture: string; speaking: boolean }>, seconds: number, dt: number, paused: boolean) {
    const output = new Map<string, { yaw: number; phase:number; weight:number }>();
    const active = new Set(actors.map(a => a.id));
    for (const id of this.states.keys()) if (!active.has(id)) this.states.delete(id);
    const step = Math.max(0, Math.min(.15, Number.isFinite(dt) ? dt : 0));
    for (const actor of actors) {
      let state = this.states.get(actor.id);
      const social = poses.get(actor.id), peer = social?.gesture !== "idle" ? actors.find(a => a.id === social?.peerId) : undefined;
      if (!state) {
        state = { position: [...actor.position], phase: actorPhase(actor.id) * Math.PI * 2, weight: 0, action:actor.bicycle?'cycle':actor.walking?'walk':actor.kind,started:seconds,fromLift:0,lift:0,yaw: peer ? Math.atan2(peer.position[0] - actor.position[0], peer.position[1] - actor.position[1]) : .35 };
        this.states.set(actor.id, state);
      }
      if (!paused) {
        const action=actor.bicycle?'cycle':actor.walking?'walk':actor.kind;
        if(action!==state.action){state.action=action;state.started=seconds;state.fromLift=state.lift;}
        const elapsed=seconds-state.started,t=Math.max(0,Math.min(1,elapsed/.4)),ease=t*t*(3-2*t);
        state.lift=state.fromLift*(1-ease)+(actor.walking?0:activityLift(actor.kind,elapsed))*ease;
        const dx = actor.position[0] - state.position[0], dz = actor.position[1] - state.position[1], distance = Math.hypot(dx, dz);
        const walking = actor.walking && distance > .001 && actor.transport === "walk";
        state.weight += ((walking ? 1 : 0) - state.weight) * (1 - Math.exp(-10 * step));
        state.phase = (state.phase + Math.min(3, distance) * Math.PI * 2 / 14) % (Math.PI * 2);
        const wantedYaw = actor.bicycle ? actor.bicycle.yaw : peer ? Math.atan2(peer.position[0] - actor.position[0], peer.position[1] - actor.position[1]) : walking ? Math.atan2(dx, dz) : state.yaw;
        state.yaw += Math.atan2(Math.sin(wantedYaw - state.yaw), Math.cos(wantedYaw - state.yaw)) * (1 - Math.exp(-7 * step));
        state.position = [...actor.position];
      }
      output.set(actor.id, { yaw: state.yaw, phase:state.phase, weight:state.weight });
    }
    return output;
  }
}
