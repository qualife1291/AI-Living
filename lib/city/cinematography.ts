import type { Actor } from "../life.ts";
import { segmentHits, type GroundRect } from "./footprints.ts";

/** A restrained tracking shot: eye-level bias, room for the listener, no random cuts. */
export function characterShot(actor: Actor, peer: Actor | undefined, heading: number, buildings: GroundRect[]) {
  const target: [number, number, number] = [actor.position[0] + (peer ? (peer.position[0] - actor.position[0]) * .3 : 0), 13, actor.position[1] + (peer ? (peer.position[1] - actor.position[1]) * .3 : 0)];
  for (const angle of [heading + .75, heading - .75, heading + 1.6, heading - 1.6, .6, 2.6]) {
    const radius = peer ? 100 : 78;
    const position: [number, number, number] = [target[0] + Math.sin(angle) * radius, target[1] + (peer ? 29 : 34), target[2] + Math.cos(angle) * radius];
    if (!buildings.some(r => segmentHits(r, actor.position, [position[0], position[2]], 2))) return { target, position };
  }
  return { target, position: [target[0] + 12, target[1] + 85, target[2] + 18] as [number, number, number] };
}
