import { cityBuildings } from "./three-layout.ts";
import { containsPoint, segmentHits, venueObstacles, type GroundRect } from "./footprints.ts";
import { along, distance, type Actor, type Point } from "../life.ts";
import { spaceActors } from "../living/social.ts";
import type { World } from "../world";
import type { TrafficVehicle } from "./traffic.ts";
import { vehicleContains } from "./traffic.ts";

export const WALK_RADIUS = 4.8;
export const groundObstacles: GroundRect[] = [...venueObstacles, ...cityBuildings().map(b => ({ x: b.x, z: b.z, width: b.width + 8, depth: b.depth + 8 }))];
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
const CELL = 8, X0 = -480, Z0 = -850, WIDTH = 450, HEIGHT = 360, SIZE = WIDTH * HEIGHT;
let grid: Uint8Array | null = null;
function cells() {
  if (grid) return grid;
  grid = new Uint8Array(SIZE);
  for (const r of groundObstacles) {
    const x0 = Math.max(0, Math.ceil((r.x - r.width / 2 - WALK_RADIUS - X0) / CELL)), x1 = Math.min(WIDTH - 1, Math.floor((r.x + r.width / 2 + WALK_RADIUS - X0) / CELL));
    const z0 = Math.max(0, Math.ceil((r.z - r.depth / 2 - WALK_RADIUS - Z0) / CELL)), z1 = Math.min(HEIGHT - 1, Math.floor((r.z + r.depth / 2 + WALK_RADIUS - Z0) / CELL));
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) grid[z * WIDTH + x] = 1;
  }
  return grid;
}
const cellPoint = (i: number): Point => [X0 + i % WIDTH * CELL, Z0 + Math.floor(i / WIDTH) * CELL];
function cellAt(p: Point) {
  const x = Math.max(1, Math.min(WIDTH - 2, Math.round((p[0] - X0) / CELL))), z = Math.max(1, Math.min(HEIGHT - 2, Math.round((p[1] - Z0) / CELL))), occupied = cells();
  for (let n = 0; n < 12; n++) for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) {
    const j = (z + dz) * WIDTH + x + dx;
    if (x + dx > 0 && x + dx < WIDTH - 1 && z + dz > 0 && z + dz < HEIGHT - 1 && !occupied[j] && segmentWalkable(p, cellPoint(j))) return j;
  }
  return -1;
}
const routes = new Map<string, Point[]>();
export const walkRouteStats = () => ({ size: routes.size, limit: 256 });
/** Bounded A* with corner clearance, followed by exact swept-circle shortcuts. */
export function safeWalkPath(startPoint: Point, endPoint: Point): Point[] {
  if (![...startPoint, ...endPoint].every(Number.isFinite)) throw new RangeError("Path coordinates must be finite");
  const start = nearestWalkable(startPoint), end = nearestWalkable(endPoint);
  if (segmentWalkable(start, end)) return [start, end];
  const key = `${start.join(",")}>${end.join(",")}`, cached = routes.get(key); if (cached) return cached;
  const first = cellAt(start), last = cellAt(end); if (first < 0 || last < 0) return [start];
  const cost = new Float64Array(SIZE); cost.fill(Infinity); cost[first] = 0;
  const previous = new Int32Array(SIZE); previous.fill(-1);
  const closed = new Uint8Array(SIZE), blocked = cells(), heap: { index: number; score: number }[] = [];
  function push(index: number, score: number) {
    const item = { index, score }; let i = heap.length; heap.push(item);
    while (i > 0) { const parent = (i - 1) >> 1; if (heap[parent].score <= score) break; heap[i] = heap[parent]; i = parent; } heap[i] = item;
  }
  function pop() {
    const top = heap[0], item = heap.pop()!; if (!heap.length) return top.index;
    let i = 0; while (i * 2 + 1 < heap.length) { let child = i * 2 + 1; if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++; if (heap[child].score >= item.score) break; heap[i] = heap[child]; i = child; } heap[i] = item; return top.index;
  }
  const heuristic = (i: number) => Math.hypot(i % WIDTH - last % WIDTH, Math.floor(i / WIDTH) - Math.floor(last / WIDTH));
  push(first, heuristic(first)); let visited = 0;
  while (heap.length && visited++ < 50000) {
    const i = pop(); if (closed[i]) continue; if (i === last) break; closed[i] = 1;
    const x = i % WIDTH, z = Math.floor(i / WIDTH);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dz) || x + dx < 1 || x + dx >= WIDTH - 1 || z + dz < 1 || z + dz >= HEIGHT - 1) continue;
      const j = i + dz * WIDTH + dx;
      if (blocked[j] || closed[j] || (dx && dz && (blocked[i + dx] || blocked[i + dz * WIDTH]))) continue;
      if (!segmentWalkable(cellPoint(i), cellPoint(j))) continue;
      const c = cost[i] + (dx && dz ? Math.SQRT2 : 1); if (c >= cost[j]) continue;
      cost[j] = c; previous[j] = i; push(j, c + heuristic(j));
    }
  }
  if (previous[last] < 0) return [start]; // Stop safely if unreachable, never cut through a wall.
  const path: Point[] = [end]; let i = last;
  while (i !== first && i >= 0) { path.unshift(cellPoint(i)); i = previous[i]; } path.unshift(start, cellPoint(first));
  const smooth: Point[] = [start]; let at = 0;
  while (at < path.length - 1) { let next = path.length - 1; while (next > at + 1 && !segmentWalkable(path[at], path[next])) next--; smooth.push(path[next]); at = next; }
  if (routes.size >= 256) routes.delete(routes.keys().next().value!); routes.set(key, smooth); return smooth;
}

type Walker = { position: Point; goal: Point; path: Point[]; next: number; idle: number; heading: number };
/** Continuous ground motion: maintain each route over polls and yield to actual cars.
 * Every step sweeps the footprint; interpolation never cuts a building corner. */
export class WalkDirector {
  private walkers = new Map<string, Walker>();
  private lastTime: number | null = null;
  private born = "";
  frame(world: World, input: Actor[], seconds: number, cars: TrafficVehicle[] = []): Actor[] {
    if (!Number.isFinite(seconds)) seconds = this.lastTime ?? 0;
    if (this.born !== world.born || (this.lastTime !== null && seconds < this.lastTime - 1)) { this.walkers.clear(); this.lastTime = null; this.born = world.born; }
    const dt = world.paused || this.lastTime === null ? 0 : Math.max(0, Math.min(.15, seconds - this.lastTime)); this.lastTime = seconds;
    const spaced = spaceActors(world, input);
    const destinations = spaceActors(world, input.map(a => {
      const end = a.path.at(-1) ?? a.position, core = world.people.findIndex(p => p.id === a.id);
      const offset: Point = core >= 0 ? [(core - 1) * 25, core * 7] : npcOffset(a.id);
      return { ...a, position: [end[0] + offset[0], end[1] + offset[1]] as Point, walking: false };
    }));
    return spaced.map((a, index) => {
      const goal = nearestWalkable(destinations[index].position);
      let s = this.walkers.get(a.id);
      if (!s) {
        const initial = a.walking ? nearestWalkable(a.position) : goal;
        s = { position: initial, goal, path: safeWalkPath(initial, goal), next: 1, idle: a.stationaryFor ?? 60, heading: 0 };
        this.walkers.set(a.id, s);
      } else if (distance(goal, s.goal) > 1) { s.goal = goal; s.path = safeWalkPath(s.position, goal); s.next = 1; s.idle = 0; }
      let budget = dt * 16;
      while (budget > 0 && s.next < s.path.length) {
        const target = s.path[s.next], length = distance(s.position, target), step = Math.min(length, budget);
        const proposed = along([s.position, target], step);
        if (cars.some(car => vehicleContains(car, proposed, WALK_RADIUS + 3) || vehicleContains(car, [(s!.position[0] + proposed[0]) / 2, (s!.position[1] + proposed[1]) / 2], WALK_RADIUS + 3))) break;
        if (!segmentWalkable(s.position, proposed)) break;
        if (step > .001) s.heading = Math.atan2(proposed[0] - s.position[0], proposed[1] - s.position[1]);
        s.position = proposed; budget -= step; if (length <= step + .001) s.next++; else break;
      }
      const moving = s.next < s.path.length && distance(s.position, s.goal) > .1;
      s.idle = moving ? 0 : s.idle + dt;
      return { ...a, position: [...s.position], path: s.path, walking: moving, transport: "walk", stationaryFor: s.idle, activity: moving ? `Đi đến ${a.location.toLowerCase()}` : a.activity };
    });
  }
}
function npcOffset(id: string): Point {
  let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } h >>>= 0;
  return [((h % 9) - 4) * 7, ((Math.floor(h / 9) % 7) - 3) * 5];
}
