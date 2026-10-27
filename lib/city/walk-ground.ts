import { cityBuildings } from "./three-layout.ts";
import { containsPoint, segmentHits, venueObstacles, type GroundRect } from "./footprints.ts";
import { distance, type Point } from "../life.ts";
import { sceneryObstacles } from "./scenery.ts";
export const WALK_RADIUS = 4.8;
export const groundObstacles: GroundRect[] = [...venueObstacles, ...cityBuildings().map(b => ({ x: b.x, z: b.z, width: b.width + 8, depth: b.depth + 8 })), ...sceneryObstacles];
const buckets = new Map<string, GroundRect[]>(), BUCKET = 64;
for (const r of groundObstacles) for (let z = Math.floor((r.z - r.depth / 2 - WALK_RADIUS) / BUCKET); z <= Math.floor((r.z + r.depth / 2 + WALK_RADIUS) / BUCKET); z++)
  for (let x = Math.floor((r.x - r.width / 2 - WALK_RADIUS) / BUCKET); x <= Math.floor((r.x + r.width / 2 + WALK_RADIUS) / BUCKET); x++) {
    const key = `${x}:${z}`, list = buckets.get(key) ?? []; list.push(r); buckets.set(key, list);
  }
function nearbyRects(a: readonly number[], b = a) {
  if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 128) return groundObstacles;
  const result = new Set<GroundRect>();
  for (let z = Math.floor(Math.min(a[1], b[1]) / BUCKET); z <= Math.floor(Math.max(a[1], b[1]) / BUCKET); z++)
    for (let x = Math.floor(Math.min(a[0], b[0]) / BUCKET); x <= Math.floor(Math.max(a[0], b[0]) / BUCKET); x++) for (const r of buckets.get(`${x}:${z}`) ?? []) result.add(r);
  return [...result];
}
export const walkable = (p: readonly number[]) => !nearbyRects(p).some(r => containsPoint(r, p, WALK_RADIUS));
export const segmentWalkable = (a: readonly number[], b: readonly number[]) => !nearbyRects(a, b).some(r => segmentHits(r, a, b, WALK_RADIUS));
export function nearestWalkable(point: Point): Point {
  let p: Point = [...point];
  for (let pass = 0; pass < 12; pass++) {
    const hit = groundObstacles.find(r => containsPoint(r, p, WALK_RADIUS + .1));
    if (!hit) return p;
    const candidates: Point[] = [[hit.x - hit.width / 2 - WALK_RADIUS - .2, p[1]], [hit.x + hit.width / 2 + WALK_RADIUS + .2, p[1]], [p[0], hit.z - hit.depth / 2 - WALK_RADIUS - .2], [p[0], hit.z + hit.depth / 2 + WALK_RADIUS + .2]];
    candidates.sort((a, b) => distance(point, a) - distance(point, b));
    p = candidates.find(walkable) ?? candidates[0];
  }
  return p;
}
