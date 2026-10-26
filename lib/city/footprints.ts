import { boulevards, venues, type Venue } from "./world.ts";

export type GroundRect = { x: number; z: number; width: number; depth: number; id?: string };
export const openVenue = (v: Venue) => ["square", "park", "garden", "sport", "bus", "metro"].includes(v.type);
export function containsPoint(r: GroundRect, p: readonly number[], margin = 0) {
  return Math.abs(p[0] - r.x) < r.width / 2 + margin && Math.abs(p[1] - r.z) < r.depth / 2 + margin;
}
/** Slab test, also catches a segment whose two ends are outside a building. */
export function segmentHits(r: GroundRect, a: readonly number[], b: readonly number[], margin = 0) {
  let enter = 0, exit = 1;
  for (const axis of [0, 1]) {
    const center = axis ? r.z : r.x, half = (axis ? r.depth : r.width) / 2 + margin;
    const delta = b[axis] - a[axis], low = center - half, high = center + half;
    if (Math.abs(delta) < 1e-9) { if (a[axis] <= low || a[axis] >= high) return false; }
    else {
      let t0 = (low - a[axis]) / delta, t1 = (high - a[axis]) / delta;
      if (t0 > t1) [t0, t1] = [t1, t0];
      enter = Math.max(enter, t0); exit = Math.min(exit, t1);
      if (enter >= exit) return false;
    }
  }
  return enter < exit;
}
const cache = new Map<string, GroundRect>();
/** Keep activity anchors, relocate only fictional buildings that occupied asphalt.
 * Rendering, navigation and traffic QA all consume this exact same footprint. */
export function venueGeometry(v: Venue): GroundRect {
  const known = cache.get(v.name); if (known) return known;
  const candidates: GroundRect[] = [];
  for (let n = 0; n <= 12; n++) for (const [dx, dz] of n === 0 ? [[0, 0]] : [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]])
    candidates.push({ id: v.name, x: v.x + dx * n * 12, z: v.y - 47 + dz * n * 12, width: 104, depth: 72 });
  const clear = (r: GroundRect) => !boulevards.some(path => path.slice(1).some((b, i) => segmentHits(r, path[i], b, 28)));
  const chosen = candidates.find(clear) ?? candidates.at(-1)!;
  cache.set(v.name, chosen);
  return chosen;
}
export const venueObstacles = venues.filter(v => !openVenue(v)).map(venueGeometry);
