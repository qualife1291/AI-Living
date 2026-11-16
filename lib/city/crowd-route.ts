import { distance, type Point } from "../life.ts";
import { bodyWalkable, bodySegmentWalkable } from "./walk-ground.ts";

type Body = { position: Point; radius: number };

/** Viewer-only bounded visibility graph through real crowd gaps. Every edge
 * sweeps static geometry and occupied discs; nobody is displaced or retargeted. */
export function crowdDetour(start: Point, goal: Point, occupied: Body[], radius: number): Point[] | null {
  const free = (p: Point) => bodyWalkable(p, radius) &&
    occupied.every(other => distance(p, other.position) >= radius + other.radius + .45);
  const candidates: Point[] = [];
  for (let i = 0; i < occupied.length; i++) for (let j = i + 1; j < occupied.length; j++) {
    const a = occupied[i], b = occupied[j], gap = distance(a.position, b.position);
    if (gap < 2 * radius + a.radius + b.radius + .8 || gap > 50) continue;
    const midpoint: Point = [(a.position[0] + b.position[0]) / 2, (a.position[1] + b.position[1]) / 2];
    if (free(midpoint)) candidates.push(midpoint);
  }
  for (const width of [20, 40, 60]) for (let k = 0; k < 12; k++) {
    const p: Point = [start[0] + Math.cos(k * Math.PI / 6) * width, start[1] + Math.sin(k * Math.PI / 6) * width];
    if (free(p)) candidates.push(p);
  }
  candidates.sort((a, b) => (distance(start, a) + distance(a, goal)) - (distance(start, b) + distance(b, goal)));
  const nodes: Point[] = [start, goal, ...candidates.slice(0, 96)];
  const clear = (a: Point, b: Point) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], length2 = dx * dx + dz * dz;
    if (!bodySegmentWalkable(a, b, radius)) return false;
    for (const other of occupied) {
      const t = length2 ? Math.max(0, Math.min(1, ((other.position[0] - a[0]) * dx + (other.position[1] - a[1]) * dz) / length2)) : 0;
      const x = a[0] + t * dx - other.position[0], z = a[1] + t * dz - other.position[1];
      // A safe but tightly spaced starting pair must be allowed to separate.
      const spacing = Math.min(radius + other.radius + .45, distance(a, other.position) - 1e-7);
      if (x * x + z * z < spacing * spacing - 1e-7) return false;
    }
    return true;
  };
  const cost = nodes.map(() => Infinity), parent = nodes.map(() => -1), closed = new Set<number>();
  cost[0] = 0;
  for (let count = 0; count < nodes.length; count++) {
    let at = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const score = cost[i] + distance(nodes[i], goal);
      if (!closed.has(i) && score < best) { at = i; best = score; }
    }
    if (at < 0) return null;
    if (at === 1) {
      const path: Point[] = [goal];
      while (at !== 0) { at = parent[at]; path.unshift(nodes[at]); }
      return path;
    }
    closed.add(at);
    for (let next = 0; next < nodes.length; next++) {
      if (closed.has(next)) continue;
      const length = distance(nodes[at], nodes[next]);
      if ((length > 90 && next !== 1) || cost[at] + length >= cost[next] || !clear(nodes[at], nodes[next])) continue;
      cost[next] = cost[at] + length; parent[next] = at;
    }
  }
  return null;
}
