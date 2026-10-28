import type { Actor } from "../life.ts";
import { segmentHits, type GroundRect } from "./footprints.ts";

export type CameraOccluder = GroundRect & { minY: number; maxY: number };
/** Segment/AABB in three dimensions: foliage above a walker still blocks a camera ray. */
export function cameraRayBlocked(box: CameraOccluder, from: readonly number[], to: readonly number[]) {
  let enter=0,exit=1;
  const low=[box.x-box.width/2,box.minY,box.z-box.depth/2],high=[box.x+box.width/2,box.maxY,box.z+box.depth/2];
  for(let axis=0;axis<3;axis++){
    const delta=to[axis]-from[axis];
    if(Math.abs(delta)<1e-12){if(from[axis]<low[axis]||from[axis]>high[axis])return false;}
    else{const a=(low[axis]-from[axis])/delta,b=(high[axis]-from[axis])/delta;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));if(enter>exit)return false;}
  }
  return exit>1e-6&&enter<1-1e-6;
}

/** A restrained tracking shot: eye-level bias, room for the listener, no random cuts. */
export function characterShot(actor: Actor, peer: Actor | undefined, heading: number, buildings: GroundRect[], aspect = 1.6, height = 17.5, occluders: CameraOccluder[] = [], peerHeight = height) {
  const framing = actor.bicycle ? 1 : Math.max(.65, Math.min(1, height / 17.5));
  const target: [number, number, number] = [actor.position[0] + (peer ? (peer.position[0] - actor.position[0]) * .3 : 0), 13 * framing, actor.position[1] + (peer ? (peer.position[1] - actor.position[1]) * .3 : 0)];
  // Portrait needs a wider two-shot so the listener's replies stay on screen.
  const portraitScale = peer || actor.bicycle ? Math.max(1, .95 / Math.max(.35, Number.isFinite(aspect) ? aspect : 1.6)) : 1;
  const subjects=[{actor,height},...(peer?[{actor:peer,height:peerHeight}]:[])];
  const clear=(position: readonly number[])=>subjects.every(({actor:subject,height:bodyHeight})=>
    !buildings.some(r=>segmentHits(r,subject.position,[position[0],position[2]],2))&&
    !occluders.some(box=>cameraRayBlocked(box,[subject.position[0],Math.max(2,bodyHeight*.8),subject.position[1]],position)));
  // First preserve the familiar shot. If crowns block every angle, try below
  // the foliage before falling back overhead; never move an actor to fix a shot.
  for(const rise of occluders.length?[peer?29:34,8]:[peer?29:34])
   for (const angle of [heading + .75, heading - .75, heading + 1.6, heading - 1.6, .6, 2.6]) {
    const radius = (actor.bicycle ? 120 : peer ? 100 : 78) * portraitScale * framing;
    const position: [number, number, number] = [target[0] + Math.sin(angle) * radius, target[1] + rise * portraitScale * framing, target[2] + Math.cos(angle) * radius];
    if(clear(position))return {target,position};
   }
  return { target, position: [target[0] + 12, target[1] + 85 * portraitScale, target[2] + 18] as [number, number, number] };
}
