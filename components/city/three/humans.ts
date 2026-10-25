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
    limb: unitBounds(new CapsuleGeometry(0.25, 0.5, 2, 8)),
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
} {
  const time = Number.isFinite(seconds) ? seconds : 0;
  const phase = actorPhase(actor.id);
  const angle = phase * Math.PI * 2;
  const riding = actor.walking && actor.transport && actor.transport !== "walk";
  const walk = actor.walking && !riding;
  const swing = walk
    ? Math.sin(time * 7 + angle) * 0.48
    : Math.sin(time * 1.3 + angle) * 0.025;
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
  };
}
