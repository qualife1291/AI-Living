import { boulevards, venues } from "./world.ts";
import { route, type Point } from "../life.ts";

export type CityBuilding = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  tower: boolean;
};
export const pedestrianSegments: [Point, Point][] = [];
const seen = new Set<string>();
for (const a of venues)
  for (const b of venues) {
    const path = route(a.name, b.name);
    for (let i = 1; i < path.length; i++) {
      const key = [path[i - 1].join(","), path[i].join(",")].sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        pedestrianSegments.push([path[i - 1], path[i]]);
      }
    }
  }
export function segmentDistance(
  x: number,
  z: number,
  a: number[],
  b: number[],
) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)),
  );
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
export function buildingAllowed(x: number, z: number, radius: number) {
  if (venues.some((v) => Math.hypot(x - v.x, z - (v.y - 28)) < radius + 100))
    return false;
  if (
    pedestrianSegments.some(
      ([a, b]) => segmentDistance(x, z, a, b) < radius + 13,
    )
  )
    return false;
  return !boulevards.some((path) =>
    path
      .slice(1)
      .some((b, i) => segmentDistance(x, z, path[i], b) < radius + 34),
  );
}
/** Fictional skyline: seeded dimensions, never represented as surveyed HCMC heights. */
export function cityBuildings(): CityBuilding[] {
  const result: CityBuilding[] = [];
  for (let row = 0; row < 19; row++)
    for (let col = 0; col < 24; col++) {
      const seed = (row * 179 + col * 313 + 71) % 997;
      const x = -115 + col * 115,
        z = -460 + row * 110;
      const width = 48 + (seed % 22),
        depth = 45 + (seed % 24);
      if (!buildingAllowed(x, z, Math.hypot(width, depth) / 2 + 5)) continue;
      const tower = z < 0 || (x > 1150 && z < 1000);
      result.push({
        x,
        z,
        width,
        depth,
        height: tower ? 110 + (seed % 220) : 30 + (seed % 56),
        tower,
        color: (tower
          ? ["#9ab3b3", "#b1c4c4", "#d2d7c7", "#9baab9", "#b4c4aa"]
          : ["#e3c6a2", "#d5b7a7", "#c7d2b5", "#d5d9c6", "#b4c8bf"])[seed % 5],
      });
    }
  return result;
}
