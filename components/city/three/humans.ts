import {
  BoxGeometry,
  CapsuleGeometry,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
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

/** Allocate once per city; share between all people and dispose with the scene. */
export function createHumanGeometry(): {
  box: BufferGeometry;
  round: BufferGeometry;
  head: BufferGeometry;
  hair: BufferGeometry;
  limb: BufferGeometry;
  shoe: BufferGeometry;
} {
  return {
    box: new BoxGeometry(1, 1, 1),
    round: unitBounds(new RoundedBoxGeometry(1, 1, 1, 1, 0.15)),
    head: unitBounds(new SphereGeometry(0.5, 12, 8)),
    hair: unitBounds(new SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
    limb: unitBounds(new CapsuleGeometry(0.25, 0.5, 1, 6)),
    shoe: unitBounds(new RoundedBoxGeometry(1, 1, 1, 1, 0.2)),
  };
}

function actorPhase(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

/**
 * Restrained animation from the simulation clock, with no runtime randomness.
 * Angles use radians; hand offsets/breath use pre-HUMAN_SCALE body units.
 * blink is an eye-height multiplier. Keep seconds frozen while paused.
 */
export function humanPose(
  actor: Actor,
  seconds: number,
  _index: number,
  social?: { gesture: string; speaking: boolean },
  gait?: { phase: number; weight: number },
): {
  headTilt: number;
  headTurn: number;
  breath: number;
  blink: number;
  leftArm: number;
  rightArm: number;
  leftHandY: number;
  rightHandY: number;
  leftHandZ: number;
  rightHandZ: number;
  leftLeg: number;
  rightLeg: number;
  leftKnee: number;
  rightKnee: number;
  sway: number;
  mouth: number;
} {
  const time = Number.isFinite(seconds) ? seconds : 0;
  const phase = actorPhase(actor.id);
  const angle = phase * Math.PI * 2;
  const riding = actor.walking && actor.transport && actor.transport !== "walk";
  const walk = actor.walking && !riding;
  const stridePhase = gait?.phase ?? time * 7 + angle;
  const weight = gait?.weight ?? (walk ? 1 : 0);
  const swing = Math.sin(stridePhase) * .48 * weight + Math.sin(time * 1.3 + angle) * .025 * (1 - weight);
  const usingProp = !actor.walking && ["read", "garden", "eat", "work"].includes(actor.kind);
  let leftArm = usingProp ? -0.55 : -swing;
  let rightArm = usingProp ? -0.6 : swing;
  let headTilt = usingProp ? 0.06 : Math.sin(time * 0.8 + angle) * 0.012;
  let headTurn = Math.sin(time * 0.48 + angle) * 0.025;

  if (social && !walk && !riding) {
    // Short gestures separated by quiet intervals; listeners do not mirror speech.
    const beat = Math.max(0, Math.sin(time * 1.6 + angle));
    if (social.speaking) {
      const gesture = social.gesture.toLowerCase();
      const wave = /wave|greet|hello/.test(gesture);
      const point = /point|show/.test(gesture);
      const open = /open|offer|explain|hand/.test(gesture);
      rightArm = wave ? -1.05 - beat * 0.16 : point ? -0.85 : -0.3 - beat * 0.2;
      leftArm = open ? -0.35 - beat * 0.1 : -0.12;
      headTilt = Math.sin(time * 2.1 + angle) * 0.035;
      headTurn = Math.sin(time * 0.9 + angle) * 0.025;
    } else {
      // A small nod about once per four seconds leaves time to simply listen.
      const nod = Math.max(0, Math.sin(time * 1.5 + angle) - 0.75) * 4;
      headTilt = 0.015 + nod * 0.065;
      leftArm = -0.04;
      rightArm = 0.04;
    }
  }

  const blinkTime = ((time + phase * 5) % (4.4 + phase) + 4.4 + phase) % (4.4 + phase);
  const blink = blinkTime < 0.16 ? 1 - Math.sin((blinkTime / 0.16) * Math.PI) * 0.92 : 1;
  return {
    headTilt,
    headTurn,
    breath: Math.sin(time * 1.7 + angle) * 0.12,
    blink,
    leftArm,
    rightArm,
    leftHandY: (1 - Math.cos(leftArm)) * 6,
    rightHandY: (1 - Math.cos(rightArm)) * 6,
    leftHandZ: -Math.sin(leftArm) * 6,
    rightHandZ: -Math.sin(rightArm) * 6,
    leftLeg: Math.sin(stridePhase) * .48 * weight,
    rightLeg: -Math.sin(stridePhase) * .48 * weight,
    leftKnee: Math.max(0, -Math.sin(stridePhase)) * .72 * weight,
    rightKnee: Math.max(0, Math.sin(stridePhase)) * .72 * weight,
    sway: Math.sin(stridePhase) * .025 * weight,
    mouth: social?.speaking ? .3 + Math.sin(time * 12 + angle) ** 2 * .8 : .16,
  };
}

export type HumanPose = ReturnType<typeof humanPose>;
type MotionState = { position: [number, number]; phase: number; weight: number; yaw: number; pose: HumanPose };
/** Gait follows distance actually travelled, never the requested schedule.
 * Joint transitions ease without moving the collision-safe root position. */
export class HumanMotion {
  private states = new Map<string, MotionState>();
  frame(actors: Actor[], poses: Map<string, { peerId: string; gesture: string; speaking: boolean }>, seconds: number, dt: number, paused: boolean) {
    const output = new Map<string, { yaw: number; pose: HumanPose }>();
    const active = new Set(actors.map(a => a.id));
    for (const id of this.states.keys()) if (!active.has(id)) this.states.delete(id);
    const step = Math.max(0, Math.min(.15, Number.isFinite(dt) ? dt : 0));
    for (const actor of actors) {
      let state = this.states.get(actor.id);
      const social = poses.get(actor.id), peer = social?.gesture !== "idle" ? actors.find(a => a.id === social?.peerId) : undefined;
      if (!state) {
        state = { position: [...actor.position], phase: actorPhase(actor.id) * Math.PI * 2, weight: 0, yaw: peer ? Math.atan2(peer.position[0] - actor.position[0], peer.position[1] - actor.position[1]) : .35, pose: humanPose({ ...actor, walking: false }, seconds, 0, social) };
        this.states.set(actor.id, state);
      }
      if (!paused) {
        const dx = actor.position[0] - state.position[0], dz = actor.position[1] - state.position[1], distance = Math.hypot(dx, dz);
        const walking = actor.walking && distance > .001 && actor.transport === "walk";
        state.weight += ((walking ? 1 : 0) - state.weight) * (1 - Math.exp(-10 * step));
        state.phase = (state.phase + Math.min(3, distance) * Math.PI * 2 / 14) % (Math.PI * 2);
        const wantedYaw = peer ? Math.atan2(peer.position[0] - actor.position[0], peer.position[1] - actor.position[1]) : walking ? Math.atan2(dx, dz) : state.yaw;
        state.yaw += Math.atan2(Math.sin(wantedYaw - state.yaw), Math.cos(wantedYaw - state.yaw)) * (1 - Math.exp(-7 * step));
        const wanted = humanPose({ ...actor, walking: state.weight > .05 }, seconds, 0, social?.gesture === "idle" ? undefined : social, { phase: state.phase, weight: state.weight });
        for (const key of Object.keys(wanted) as (keyof HumanPose)[]) state.pose[key] = key === "blink" ? wanted[key] : state.pose[key] + (wanted[key] - state.pose[key]) * (1 - Math.exp(-14 * step));
        state.position = [...actor.position];
      }
      output.set(actor.id, { yaw: state.yaw, pose: { ...state.pose } });
    }
    return output;
  }
}
