import prebuilt from "../../data/assets/walk-routes.json" with { type: "json" };
import { distance, type Actor, type Point } from "../life.ts";
import { spaceActors } from "../living/social.ts";
import type { World } from "../world";
import type { TrafficVehicle } from "./traffic.ts";
import { vehicleContains } from "./traffic.ts";

export { WALK_RADIUS, groundObstacles, walkable, segmentWalkable, nearestWalkable } from "./walk-ground.ts";
import { WALK_RADIUS, groundObstacles, walkable, segmentWalkable, nearestWalkable } from "./walk-ground.ts";
import { logClient } from "../diagnostics.ts";
import { TagDirector } from "./tag-game.ts";
import { PetWalkDirector } from "./pet-walk.ts";
const CELL = 12, X0 = -480, Z0 = -850, WIDTH = 300, HEIGHT = 240, SIZE = WIDTH * HEIGHT;
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
export const walkRouteStats = () => ({ size: routes.size, limit: 1024 });
/** Bounded A* with corner clearance, followed by exact swept-circle shortcuts. */
export function safeWalkPath(startPoint: Point, endPoint: Point): Point[] {
  const began = performance.now();
  try { return computeWalkPath(startPoint, endPoint); }
  finally { const ms = performance.now() - began; if (ms > 8) logClient("route_slow", { ms }); }
}
function computeWalkPath(startPoint: Point, endPoint: Point): Point[] {
  if (![...startPoint, ...endPoint].every(Number.isFinite)) throw new RangeError("Path coordinates must be finite");
  const start = nearestWalkable(startPoint), end = nearestWalkable(endPoint);
  if (segmentWalkable(start, end)) return [start, end];
  const key = `${start.join(",")}>${end.join(",")}`;
  const ready = (prebuilt as unknown as Record<string, Point[]>)[key];
  if (ready && ready.every((p, i) => !i || segmentWalkable(ready[i-1], p))) return ready.map(p => [...p] as Point);
  const cached = routes.get(key); if (cached) { routes.delete(key); routes.set(key, cached); return cached.map(p => [...p] as Point); }
  logClient("route_miss");
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
  if (routes.size >= 1024) routes.delete(routes.keys().next().value!); routes.set(key, smooth.map(p => [...p] as Point)); return smooth;
}

export const PERSONAL_SPACE = WALK_RADIUS * 2 + .35;
type Walker = { position: Point; requested: Point; goal: Point; path: Point[]; next: number; idle: number; heading: number; velocity: Point; blocked: number; replanIn: number };
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1];
const delta = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
/** Exact closest approach for two discs moving linearly during one interval. */
function separation(relativePosition: Point, relativeMovement: Point, duration = 1) {
  const speed2 = dot(relativeMovement, relativeMovement);
  const at = speed2 > 1e-12 ? Math.max(0, Math.min(duration, -dot(relativePosition, relativeMovement) / speed2)) : 0;
  return Math.hypot(relativePosition[0] + relativeMovement[0] * at, relativePosition[1] + relativeMovement[1] * at);
}
function identityPhase(id: string) {
  let hash = 2166136261; for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967296 * Math.PI * 2;
}
function reserveFree(point: Point, occupied: Point[], id: string, spacing = PERSONAL_SPACE + .15): Point {
  const initial = nearestWalkable(point);
  const available = (p: Point) => walkable(p) && occupied.every(other => distance(p, other) >= spacing);
  if (available(initial)) return initial;
  const phase = identityPhase(id);
  // This runs only on spawn/goal changes, never as a per-frame collision push.
  for (let ring = 1; ring <= 32; ring++) {
    const radius = ring * (PERSONAL_SPACE + 1), count = Math.max(8, Math.ceil(Math.PI * 2 * radius / (PERSONAL_SPACE + .2)));
    for (let at = 0; at < count; at++) {
      const angle = phase + at / count * Math.PI * 2;
      const candidate: Point = [initial[0] + Math.cos(angle) * radius, initial[1] + Math.sin(angle) * radius];
      if (available(candidate)) return candidate;
    }
  }
  // An impossible placement must stay explicit rather than spawn inside someone.
  throw new RangeError(`No unoccupied ground position for ${id}`);
}
/** Continuous ground motion: maintain each route over polls and yield to actual cars.
 * Every step sweeps static footprints and every other moving actor's disc.
 * Right-side steering and bounded side-pass replans resolve head-on encounters. */
export class WalkDirector {
  private tag = new TagDirector();
  private pets = new PetWalkDirector();
  private walkers = new Map<string, Walker>();
  private lastTime: number | null = null;
  private born = "";
  frame(world: World, input: Actor[], seconds: number, cars: TrafficVehicle[] = [], companions: Actor[] = []): Actor[] {
    if (!Number.isFinite(seconds)) seconds = this.lastTime ?? 0;
    if (this.born !== world.born || (this.lastTime !== null && seconds < this.lastTime - 1)) { this.walkers.clear(); this.tag.reset(); this.pets.reset(); this.lastTime = null; this.born = world.born; }
    const dt = world.paused || this.lastTime === null ? 0 : Math.max(0, Math.min(.15, seconds - this.lastTime)); this.lastTime = seconds;
    // Animals have direct projected coordinates, without legacy human offsets.
    const spaced = [...spaceActors(world, input), ...companions];
    const games = this.tag.frame(spaced.map(a => ({ ...a, position: this.walkers.get(a.id)?.position ?? a.position })), dt);
    const petWalk = this.pets.frame(world, input, companions, this.walkers);
    const destinations = [...spaceActors(world, input.map(a => {
      const end = a.path.at(-1) ?? a.position, core = world.people.findIndex(p => p.id === a.id);
      const offset: Point = core >= 0 ? [(core - 1) * 25, core * 7] : npcOffset(a.id);
      return { ...a, position: [end[0] + offset[0], end[1] + offset[1]] as Point, walking: false };
    })), ...companions.map(a => ({ ...a, position: a.path.at(-1) ?? a.position, walking: false }))];
    const records = spaced.map((actor, i) => ({ actor, requested: nearestWalkable(games.get(actor.id)?.goal ?? petWalk.goals.get(actor.id) ?? destinations[i].position) })).sort((a, b) => a.actor.id.localeCompare(b.actor.id));
    const activeIds = new Set(records.map(record => record.actor.id));
    const reserved: Point[] = [];
    const goals = new Map<string, Point>();
    // Preserve existing reservations before allocating any newcomer/changed goal.
    for (const { actor, requested } of records) {
      const walker = this.walkers.get(actor.id);
      if (walker && distance(requested, walker.requested) <= 1) { goals.set(actor.id, walker.goal); reserved.push(walker.goal); }
    }
    for (const { actor, requested } of records) if (!goals.has(actor.id)) {
      // Leave a person-wide passage between resting residents, so early arrivals
      // cannot form an impassable ring around somebody else's inner goal.
      const goal = reserveFree(requested, reserved, actor.id, PERSONAL_SPACE * 2 + .5); goals.set(actor.id, goal); reserved.push(goal);
    }
    const occupied = [...this.walkers].filter(([id]) => activeIds.has(id)).map(([, walker]) => walker.position);
    for (const { actor: a, requested } of records) {
      const goal = goals.get(a.id)!;
      let s = this.walkers.get(a.id);
      if (!s) {
        const initial = reserveFree(a.walking || petWalk.links.has(a.id) ? a.position : goal, occupied, a.id);
        s = { position: initial, requested, goal, path: safeWalkPath(initial, goal), next: 1, idle: distance(initial, goal) > .1 ? 0 : a.stationaryFor ?? 60, heading: 0, velocity: [0, 0], blocked: 0, replanIn: 0 };
        this.walkers.set(a.id, s); occupied.push(initial);
      } else if (distance(requested, s.requested) > 1) {
        s.requested = requested; s.goal = goal; s.path = safeWalkPath(s.position, goal); s.next = 1; s.idle = 0; s.blocked = 0;
      }
    }
    const starts = new Map(records.map(({ actor }) => [actor.id, [...this.walkers.get(actor.id)!.position] as Point]));
    const ends = new Map<string, Point>();
    const output = new Map<string, Actor>();
    for (const { actor: a } of records) {
      const s = this.walkers.get(a.id)!;
      s.replanIn = Math.max(0, s.replanIn - dt);
      while (s.next < s.path.length && distance(s.position, s.path[s.next]) <= .05) s.next++;
      if (s.next < s.path.length && !segmentWalkable(s.position, s.path[s.next]) && s.replanIn <= 0) {
        s.path = safeWalkPath(s.position, s.goal); s.next = 1; s.replanIn = .8;
      }
      const start = starts.get(a.id)!;
      const neighbors = records.filter(({ actor }) => actor.id !== a.id && distance(start, starts.get(actor.id)!) < PERSONAL_SPACE + 28 * 2 + 4);
      const target = s.path[s.next];
      const pending = !!target && distance(s.position, s.goal) > .1;
      if (dt > 0 && pending) {
        const length = distance(start, target), step = Math.min(length, dt * (petWalk.holds.has(a.id) ? 0 : games.get(a.id)?.speed ?? (["run", "tag"].includes(a.kind) ? 28 : 16)));
        const direction: Point = [(target[0] - start[0]) / length, (target[1] - start[1]) / length];
        const straight: Point = [start[0] + direction[0] * step, start[1] + direction[1] * step];
        const carBlocked = cars.some(car => vehicleContains(car, straight, WALK_RADIUS + 3) || vehicleContains(car, [(start[0] + straight[0]) / 2, (start[1] + straight[1]) / 2], WALK_RADIUS + 3));
        let best: Point | null = null, bestScore = -Infinity;
        for (const angle of carBlocked ? [] : [0, .3, -.3, .6, -.6, .9, -.9, 1.2, -1.2, Math.PI / 2, -Math.PI / 2]) {
          const c = Math.cos(angle), sin = Math.sin(angle);
          // Positive angles turn toward the walker's right, so opposite walkers
          // choose opposite physical sides instead of mirroring into each other.
          const velocity: Point = [(direction[0] * c + direction[1] * sin) * step / dt, (-direction[0] * sin + direction[1] * c) * step / dt];
          const proposed: Point = [start[0] + velocity[0] * dt, start[1] + velocity[1] * dt];
          if (!segmentWalkable(start, proposed)) continue;
          if (cars.some(car => vehicleContains(car, proposed, WALK_RADIUS + 3) || vehicleContains(car, [(start[0] + proposed[0]) / 2, (start[1] + proposed[1]) / 2], WALK_RADIUS + 3))) continue;
          let closest = 30, safe = true;
          for (const { actor: other } of neighbors) {
            const otherStart = starts.get(other.id)!, otherEnd = ends.get(other.id) ?? otherStart;
            const relativePosition = delta(start, otherStart);
            const relativeStep = delta(delta(proposed, start), delta(otherEnd, otherStart));
            if (separation(relativePosition, relativeStep) < PERSONAL_SPACE - 1e-7) { safe = false; break; }
            const otherVelocity: Point = ends.has(other.id) ? [(otherEnd[0] - otherStart[0]) / dt, (otherEnd[1] - otherStart[1]) / dt] : this.walkers.get(other.id)!.velocity;
            const predicted = separation(relativePosition, delta(velocity, otherVelocity), .8);
            if (predicted < PERSONAL_SPACE + .1) { safe = false; break; }
            closest = Math.min(closest, predicted);
          }
          if (!safe) continue;
          const score = Math.cos(angle) * 3 + Math.min(20, closest) * .03 + (angle > 0 ? .02 : 0);
          if (score > bestScore) { best = proposed; bestScore = score; }
        }
        if (best) {
          s.position = best; s.velocity = [(best[0] - start[0]) / dt, (best[1] - start[1]) / dt];
          s.heading = Math.atan2(s.velocity[0], s.velocity[1]); s.blocked = 0;
        } else { s.velocity = [0, 0]; s.blocked += dt; }
        // A blocked pair gets a persistent side waypoint, rather than repeatedly
        // stopping on the same straight route. Replanning never changes position.
        if (s.blocked > .8 && s.replanIn <= 0 && neighbors.length) {
          const blocker = neighbors.map(({ actor }) => starts.get(actor.id)!).sort((p, q) => distance(start, p) - distance(start, q))[0];
          for (const sign of [1, -1]) {
            const waypoint: Point = [blocker[0] + direction[1] * (PERSONAL_SPACE + 5) * sign, blocker[1] - direction[0] * (PERSONAL_SPACE + 5) * sign];
            if (!walkable(waypoint) || !segmentWalkable(s.position, waypoint)) continue;
            const tail = safeWalkPath(waypoint, s.goal);
            if (distance(tail.at(-1)!, s.goal) > .1) continue;
            s.path = [[...s.position], waypoint, ...tail.slice(1)]; s.next = 1; s.blocked = 0; s.replanIn = 1.2; break;
          }
        }
      } else if (dt > 0) s.velocity = [0, 0];
      if (s.blocked >= 5) logClient("actor_stuck", { actor: a.id, seconds: s.blocked });
      if (!s.position.every(Number.isFinite)) logClient("position_nan", { actor: a.id });
      else if (!walkable(s.position)) logClient("footprint_overlap", { actor: a.id });
      ends.set(a.id, s.position);
      const moved = distance(start, s.position) > .001;
      const waiting = s.next < s.path.length && distance(s.position, s.goal) > .1;
      s.idle = waiting ? 0 : s.idle + dt;
      const game = games.get(a.id), peer = game && spaced.find(other => other.id === game.peerId);
      output.set(a.id, { ...a, tagGame: game ? { peerId: game.peerId, role: game.role, swaps: game.swaps } : undefined,
        petOwnerId: petWalk.links.get(a.id),
        position: [...s.position], path: s.path, walking: moved, transport: "walk", stationaryFor: s.idle,
        activity: petWalk.holds.has(a.id) ? "Chờ thú cưng tới gần" : petWalk.links.has(a.id) ? `Đi dạo cùng ${input.find(p => p.id === petWalk.links.get(a.id))?.name ?? "người chăm sóc"}` : game ? `${game.role === "chaser" ? "Đuổi theo" : "Chạy tránh"} ${peer?.name ?? "bạn"}` :
          waiting ? moved ? `Đi đến ${a.location.toLowerCase()}` : "Đang nhường lối" : a.kind === "tag" ? "Chờ bạn cùng chơi đuổi bắt" : a.activity });
    }
    return spaced.map(a => output.get(a.id)!);
  }
}
function npcOffset(id: string): Point {
  let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } h >>>= 0;
  return [((h % 9) - 4) * 7, ((Math.floor(h / 9) % 7) - 3) * 5];
}
