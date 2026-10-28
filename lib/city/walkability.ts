import { distance, type Actor, type Point } from "../life.ts";
import { spaceActors } from "../living/social.ts";
import type { World } from "../world";
import type { TrafficVehicle } from "./traffic.ts";
import { vehicleContains } from "./traffic.ts";

export { WALK_RADIUS, groundObstacles, walkable, segmentWalkable, nearestWalkable } from "./walk-ground.ts";
import { WALK_RADIUS } from "./walk-ground.ts";
import { computeWalkPath } from "./walk-path.ts";
export { walkRouteStats } from "./walk-path.ts";
import { logClient } from "../diagnostics.ts";
import { TagDirector } from "./tag-game.ts";
import { BICYCLE_RADIUS, BICYCLE_SPEED, BICYCLE_ACCELERATION } from "./bicycle.ts";
import { bodyWalkable, bodySegmentWalkable, nearestBodyPoint } from "./walk-ground.ts";
import { PetWalkDirector } from "./pet-walk.ts";
/** Bounded A* with corner clearance, followed by exact swept-circle shortcuts. */
export function safeWalkPath(startPoint: Point, endPoint: Point, radius = WALK_RADIUS): Point[] {
  const began = performance.now();
  try { return computeWalkPath(startPoint, endPoint, radius, () => logClient("route_miss")); }
  finally { const ms = performance.now() - began; if (ms > 8) logClient("route_slow", { ms }); }
}

export const PERSONAL_SPACE = WALK_RADIUS * 2 + .35;
type Walker = { position: Point; requested: Point; goal: Point; path: Point[]; next: number; idle: number; heading: number; velocity: Point; blocked: number; replanIn: number; radius: number; speed: number; distance: number };
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
function reserveFree(point: Point, occupied: { position: Point; radius: number }[], id: string, radius = WALK_RADIUS, extra = .5, cars: TrafficVehicle[] = []): Point {
  const initial = nearestBodyPoint(point, radius);
  const available = (p: Point) => bodyWalkable(p, radius) && cars.every(car => !vehicleContains(car, p, radius + 3)) && occupied.every(other => distance(p, other.position) >= radius + other.radius + extra);
  if (available(initial)) return initial;
  const phase = identityPhase(id);
  // This runs only on spawn/goal changes, never as a per-frame collision push.
  for (let ring = 1; ring <= 32; ring++) {
    const ringRadius = ring * (radius * 2 + 1.35), count = Math.max(8, Math.ceil(Math.PI * 2 * ringRadius / (radius * 2 + .55)));
    for (let at = 0; at < count; at++) {
      const angle = phase + at / count * Math.PI * 2;
      const candidate: Point = [initial[0] + Math.cos(angle) * ringRadius, initial[1] + Math.sin(angle) * ringRadius];
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
    const wantsBicycle = (actor: Actor) => {
      const walker = this.walkers.get(actor.id);
      return actor.kind === "cycle" || actor.transport === "bicycle" && (actor.walking || !!walker && walker.radius === BICYCLE_RADIUS && distance(walker.position, walker.goal) > .1);
    };
    const desiredRadius = (actor: Actor) => wantsBicycle(actor) ? BICYCLE_RADIUS : WALK_RADIUS;
    const records = spaced.map((actor, i) => ({ actor, requested: nearestBodyPoint(games.get(actor.id)?.goal ?? petWalk.goals.get(actor.id) ?? actor.homeAnchor ?? destinations[i].position, desiredRadius(actor)) })).sort((a, b) => a.actor.id.localeCompare(b.actor.id));
    const activeIds = new Set(records.map(record => record.actor.id));
    const reserved: { position: Point; radius: number }[] = [];
    const goals = new Map<string, Point>();
    // Preserve existing reservations before allocating any newcomer/changed goal.
    for (const { actor, requested } of records) {
      const walker = this.walkers.get(actor.id);
      if (walker && distance(requested, walker.requested) <= 1 && bodyWalkable(walker.goal, desiredRadius(actor))) { goals.set(actor.id, walker.goal); reserved.push({ position: walker.goal, radius: desiredRadius(actor) }); }
    }
    for (const { actor, requested } of records) if (!goals.has(actor.id)) {
      // Leave a person-wide passage between resting residents, so early arrivals
      // cannot form an impassable ring around somebody else's inner goal.
      const goal = reserveFree(requested, reserved, actor.id, desiredRadius(actor), PERSONAL_SPACE + .85); goals.set(actor.id, goal); reserved.push({ position: goal, radius: desiredRadius(actor) });
    }
    for (const { actor: a, requested } of records) {
      const goal = goals.get(a.id)!;
      let s = this.walkers.get(a.id);
      if (!s) {
        const radius = desiredRadius(a);
        const occupied = [...this.walkers].filter(([id]) => activeIds.has(id)).map(([, walker]) => ({ position: walker.position, radius: walker.radius }));
        const initial = reserveFree(a.walking || petWalk.links.has(a.id) ? a.position : goal, occupied, a.id, radius, .5, cars);
        s = { position: initial, requested, goal, path: safeWalkPath(initial, goal, radius), next: 1, idle: distance(initial, goal) > .1 ? 0 : a.stationaryFor ?? 60, heading: 0, velocity: [0, 0], blocked: 0, replanIn: 0, radius, speed: 0, distance: 0 };
        this.walkers.set(a.id, s);
      } else {
        const radius = desiredRadius(a);
        const canMount = radius <= s.radius || dt > 0 && bodyWalkable(s.position, radius) &&
          [...this.walkers].every(([id, other]) => id === a.id || !activeIds.has(id) || distance(s!.position, other.position) >= radius + other.radius + .35) &&
          cars.every(car => !vehicleContains(car, s!.position, radius + 3));
        if (canMount && s.radius !== radius) {
          s.radius = radius; s.speed = 0; s.distance = 0; s.goal = goal; s.requested = requested; s.path = safeWalkPath(s.position, goal, radius); s.next = 1;
        }
        if (distance(requested, s.requested) > 1) {
          s.requested = requested; s.goal = goal; s.path = safeWalkPath(s.position, goal, s.radius); s.next = 1; s.idle = 0; s.blocked = 0;
        }
      }
    }
    const starts = new Map(records.map(({ actor }) => [actor.id, [...this.walkers.get(actor.id)!.position] as Point]));
    const ends = new Map<string, Point>();
    const output = new Map<string, Actor>();
    for (const { actor: a } of records) {
      const s = this.walkers.get(a.id)!;
      s.replanIn = Math.max(0, s.replanIn - dt);
      while (s.next < s.path.length && distance(s.position, s.path[s.next]) <= .05) s.next++;
      if (s.next < s.path.length && !bodySegmentWalkable(s.position, s.path[s.next], s.radius) && s.replanIn <= 0) {
        s.path = safeWalkPath(s.position, s.goal, s.radius); s.next = 1; s.replanIn = .8;
      }
      const mounted = wantsBicycle(a) && s.radius === BICYCLE_RADIUS;
      const start = starts.get(a.id)!;
      const neighbors = records.filter(({ actor }) => actor.id !== a.id && distance(start, starts.get(actor.id)!) < s.radius + BICYCLE_RADIUS + 28 * 2 + 4);
      const target = s.path[s.next];
      const pending = !!target && distance(s.position, s.goal) > .1;
      if (dt > 0 && pending) {
        const length = distance(start, target);
        const speedLimit = mounted ? Math.min(BICYCLE_SPEED, Math.sqrt(40 * distance(start, s.goal))) : games.get(a.id)?.speed ?? (["run", "tag"].includes(a.kind) ? 28 : 16);
        s.speed = petWalk.holds.has(a.id) ? 0 : mounted ? Math.min(speedLimit, s.speed + BICYCLE_ACCELERATION * dt) : speedLimit;
        const step = Math.min(length, dt * s.speed);
        const direction: Point = [(target[0] - start[0]) / length, (target[1] - start[1]) / length];
        const straight: Point = [start[0] + direction[0] * step, start[1] + direction[1] * step];
        const carBlocked = cars.some(car => vehicleContains(car, straight, s.radius + 3) || vehicleContains(car, [(start[0] + straight[0]) / 2, (start[1] + straight[1]) / 2], s.radius + 3));
        let best: Point | null = null, bestScore = -Infinity;
        for (const angle of carBlocked ? [] : [0, .3, -.3, .6, -.6, .9, -.9, 1.2, -1.2, Math.PI / 2, -Math.PI / 2]) {
          const c = Math.cos(angle), sin = Math.sin(angle);
          // Positive angles turn toward the walker's right, so opposite walkers
          // choose opposite physical sides instead of mirroring into each other.
          const velocity: Point = [(direction[0] * c + direction[1] * sin) * step / dt, (-direction[0] * sin + direction[1] * c) * step / dt];
          const proposed: Point = [start[0] + velocity[0] * dt, start[1] + velocity[1] * dt];
          if (!bodySegmentWalkable(start, proposed, s.radius)) continue;
          if (cars.some(car => vehicleContains(car, proposed, s.radius + 3) || vehicleContains(car, [(start[0] + proposed[0]) / 2, (start[1] + proposed[1]) / 2], s.radius + 3))) continue;
          let closest = 30, safe = true;
          for (const { actor: other } of neighbors) {
            const otherStart = starts.get(other.id)!, otherEnd = ends.get(other.id) ?? otherStart;
            const relativePosition = delta(start, otherStart);
            const relativeStep = delta(delta(proposed, start), delta(otherEnd, otherStart));
            const spacing = s.radius + this.walkers.get(other.id)!.radius + .35;
            if (separation(relativePosition, relativeStep) < spacing - 1e-7) { safe = false; break; }
            const otherVelocity: Point = ends.has(other.id) ? [(otherEnd[0] - otherStart[0]) / dt, (otherEnd[1] - otherStart[1]) / dt] : this.walkers.get(other.id)!.velocity;
            const predicted = separation(relativePosition, delta(velocity, otherVelocity), .8);
            if (predicted < spacing + .1) { safe = false; break; }
            closest = Math.min(closest, predicted);
          }
          if (!safe) continue;
          const score = Math.cos(angle) * 3 + Math.min(20, closest) * .03 + (angle > 0 ? .02 : 0);
          if (score > bestScore) { best = proposed; bestScore = score; }
        }
        if (best) {
          s.position = best; s.velocity = [(best[0] - start[0]) / dt, (best[1] - start[1]) / dt];
          s.heading = Math.atan2(s.velocity[0], s.velocity[1]); s.blocked = 0;
        } else { s.velocity = [0, 0]; s.speed = 0; s.blocked += dt; }
        // A blocked pair gets a persistent side waypoint, rather than repeatedly
        // stopping on the same straight route. Replanning never changes position.
        if (s.blocked > .8 && s.replanIn <= 0 && neighbors.length) {
          const blocker = neighbors.map(({ actor }) => starts.get(actor.id)!).sort((p, q) => distance(start, p) - distance(start, q))[0];
          for (const sign of [1, -1]) {
            const waypoint: Point = [blocker[0] + direction[1] * (PERSONAL_SPACE + 5) * sign, blocker[1] - direction[0] * (PERSONAL_SPACE + 5) * sign];
            if (!bodyWalkable(waypoint, s.radius) || !bodySegmentWalkable(s.position, waypoint, s.radius)) continue;
            const tail = safeWalkPath(waypoint, s.goal, s.radius);
            if (distance(tail.at(-1)!, s.goal) > .1) continue;
            s.path = [[...s.position], waypoint, ...tail.slice(1)]; s.next = 1; s.blocked = 0; s.replanIn = 1.2; break;
          }
        }
      } else if (dt > 0) { s.velocity = [0, 0]; s.speed = 0; }
      if (s.blocked >= 5) logClient("actor_stuck", { actor: a.id, seconds: s.blocked });
      if (!s.position.every(Number.isFinite)) logClient("position_nan", { actor: a.id });
      else if (!bodyWalkable(s.position, s.radius)) logClient("footprint_overlap", { actor: a.id });
      ends.set(a.id, s.position);
      const travelled = distance(start, s.position); s.distance += travelled;
      const moved = travelled > .001;
      const waiting = s.next < s.path.length && distance(s.position, s.goal) > .1;
      s.idle = waiting ? 0 : s.idle + dt;
      const game = games.get(a.id), peer = game && spaced.find(other => other.id === game.peerId);
      output.set(a.id, { ...a, tagGame: game ? { peerId: game.peerId, role: game.role, swaps: game.swaps } : undefined,
        petOwnerId: petWalk.links.get(a.id),
        bicycle: mounted ? { yaw: s.heading, distance: s.distance, radius: s.radius } : undefined,
        position: [...s.position], path: s.path, walking: moved, transport: mounted ? "bicycle" : "walk", stationaryFor: s.idle,
        activity: petWalk.holds.has(a.id) ? "Chờ thú cưng tới gần" : petWalk.links.has(a.id) ? `Đi dạo cùng ${input.find(p => p.id === petWalk.links.get(a.id))?.name ?? "người chăm sóc"}` : [...petWalk.links.values()].includes(a.id) ? `Đi dạo cùng ${companions.filter(p => petWalk.links.get(p.id) === a.id).map(p => p.name).join(", ")}` : game ? `${game.role === "chaser" ? "Đuổi theo" : "Chạy tránh"} ${peer?.name ?? "bạn"}` :
          mounted ? waiting ? moved ? `Đạp xe đến ${a.location.toLowerCase()}` : "Dừng xe nhường lối" : "Dừng xe tại điểm đến" : a.kind === "cycle" ? "Tìm chỗ thoáng để lên xe" : waiting ? moved ? `Đi đến ${a.location.toLowerCase()}` : "Đang nhường lối" : a.kind === "tag" ? "Chờ bạn cùng chơi đuổi bắt" : a.activity });
    }
    return spaced.map(a => output.get(a.id)!);
  }
}
function npcOffset(id: string): Point {
  let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } h >>>= 0;
  return [((h % 9) - 4) * 7, ((Math.floor(h / 9) % 7) - 3) * 5];
}
