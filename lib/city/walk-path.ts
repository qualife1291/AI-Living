/** Shared deterministic bounded navigation; no browser logging, frame state or Three.js. */
import prebuilt from "../../data/assets/walk-routes.json" with { type: "json" };
import type { Point } from "../life.ts";
import { WALK_RADIUS, groundObstacles, bodySegmentWalkable, nearestBodyPoint } from "./walk-ground.ts";
import { BICYCLE_RADIUS } from "./bicycle.ts";
const CELL = 12, X0 = -480, Z0 = -850, WIDTH = 300, HEIGHT = 240, SIZE = WIDTH * HEIGHT;
const grids = new Map<number, Uint8Array>();
function cells(radius: number) {
  const cached = grids.get(radius); if (cached) return cached;
  const grid = new Uint8Array(SIZE);
  for (const r of groundObstacles) {
    const x0 = Math.max(0, Math.ceil((r.x - r.width / 2 - radius - X0) / CELL)), x1 = Math.min(WIDTH - 1, Math.floor((r.x + r.width / 2 + radius - X0) / CELL));
    const z0 = Math.max(0, Math.ceil((r.z - r.depth / 2 - radius - Z0) / CELL)), z1 = Math.min(HEIGHT - 1, Math.floor((r.z + r.depth / 2 + radius - Z0) / CELL));
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) grid[z * WIDTH + x] = 1;
  }
  grids.set(radius, grid); return grid;
}
const cellPoint = (i: number): Point => [X0 + i % WIDTH * CELL, Z0 + Math.floor(i / WIDTH) * CELL];
function cellAt(p: Point, radius: number) {
  const x = Math.max(1, Math.min(WIDTH - 2, Math.round((p[0] - X0) / CELL))), z = Math.max(1, Math.min(HEIGHT - 2, Math.round((p[1] - Z0) / CELL))), occupied = cells(radius);
  for (let n = 0; n < 12; n++) for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) {
    const j = (z + dz) * WIDTH + x + dx;
    if (x + dx > 0 && x + dx < WIDTH - 1 && z + dz > 0 && z + dz < HEIGHT - 1 && !occupied[j] && bodySegmentWalkable(p, cellPoint(j), radius)) return j;
  }
  return -1;
}
const routes = new Map<string, Point[]>();
export const walkRouteStats = () => ({ size: routes.size, limit: 1024 });
export function computeWalkPath(startPoint: Point, endPoint: Point, radius = WALK_RADIUS, onMiss: () => void = () => {}): Point[] {
  if (![...startPoint, ...endPoint].every(Number.isFinite)) throw new RangeError("Path coordinates must be finite");
  if (radius !== WALK_RADIUS && radius !== BICYCLE_RADIUS) throw new RangeError("Unsupported body clearance");
  const clear = (a: Point, b: Point) => bodySegmentWalkable(a, b, radius);
  const start = nearestBodyPoint(startPoint, radius), end = nearestBodyPoint(endPoint, radius);
  if (clear(start, end)) return [start, end];
  const key = `${radius}:${start.join(",")}>${end.join(",")}`;
  const ready = radius === WALK_RADIUS && (prebuilt as unknown as Record<string, Point[]>)[`${start.join(",")}>${end.join(",")}`];
  if (ready && ready.every((p, i) => !i || clear(ready[i-1], p))) return ready.map(p => [...p] as Point);
  const cached = routes.get(key); if (cached) { routes.delete(key); routes.set(key, cached); return cached.map(p => [...p] as Point); }
  onMiss();
  const first = cellAt(start, radius), last = cellAt(end, radius); if (first < 0 || last < 0) return [start];
  const cost = new Float64Array(SIZE); cost.fill(Infinity); cost[first] = 0;
  const previous = new Int32Array(SIZE); previous.fill(-1);
  const closed = new Uint8Array(SIZE), blocked = cells(radius), heap: { index: number; score: number }[] = [];
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
      if (!clear(cellPoint(i), cellPoint(j))) continue;
      const c = cost[i] + (dx && dz ? Math.SQRT2 : 1); if (c >= cost[j]) continue;
      cost[j] = c; previous[j] = i; push(j, c + heuristic(j));
    }
  }
  if (previous[last] < 0) return [start]; // Stop safely if unreachable, never cut through a wall.
  const path: Point[] = [end]; let i = last;
  while (i !== first && i >= 0) { path.unshift(cellPoint(i)); i = previous[i]; } path.unshift(start, cellPoint(first));
  const smooth: Point[] = [start]; let at = 0;
  while (at < path.length - 1) { let next = path.length - 1; while (next > at + 1 && !clear(path[at], path[next])) next--; smooth.push(path[next]); at = next; }
  if (routes.size >= 1024) routes.delete(routes.keys().next().value!); routes.set(key, smooth.map(p => [...p] as Point)); return smooth;
}

