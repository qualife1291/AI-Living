import { boulevards, venues, type Venue } from "./world.ts";
import { openVenue, venueGeometry, type GroundRect } from "./footprints.ts";
import { buildingAllowed, cityBuildings } from "./three-layout.ts";
import { trafficJunctions } from "./traffic.ts";

export type SceneryTree = { id: string; x: number; z: number; seed: number };
/** Shared placements: the renderer must consume this list, never regenerate it. */
export const sceneryTrees: SceneryTree[] = [];
export const sceneryObstacles: GroundRect[] = [];
const obstacle = (id: string, x: number, z: number, width: number, depth: number) => sceneryObstacles.push({ id, x, z, width, depth });
const tree = (id: string, x: number, z: number, seed: number) => {
  sceneryTrees.push({ id, x, z, seed });
  // Raised foliage starts above the tallest person. Only the trunk blocks feet.
  obstacle(`${id}:trunk`, x, z, 3, 3);
};
const buildings = cityBuildings();

/** Keep the bus shelter/furniture on its forecourt, clear of the east lane. */
export function venueSceneryPose(venue: Venue): Venue {
  const body = venueGeometry(venue);
  return openVenue(venue)
    ? { ...venue, x: venue.x - (venue.type === "bus" ? 50 : 0) }
    : { ...venue, x: body.x, y: body.z + 47 };
}

for (const venue of venues) {
  const open = openVenue(venue), v = venueSceneryPose(venue);
  const prefix = `venue:${v.name}`;
  if (["cafe", "restaurant"].includes(v.type)) {
    for (const side of [-1, 1]) {
      const x = v.x + side * 65, z = v.y + 20;
      obstacle(`${prefix}:table:${side}`, x, z, 13, 13);
      for (const dz of [-10, 10]) obstacle(`${prefix}:chair:${side}:${dz}`, x, z + dz, 5, 5);
    }
  }
  if (["park", "square", "bus", "metro", "library"].includes(v.type)) {
    // Union of seat z±2.5 and backrest centered z-2 with depth1.5.
    obstacle(`${prefix}:bench`, v.x + 65, v.y + 12 - .125, 18, 5.25);
  }
  if (!open) {
    for (const side of [-1, 1]) obstacle(`${prefix}:planter:${side}`, v.x + side * 53, v.y - 4, 6, 6);
    obstacle(`${prefix}:front-plinth`, v.x, v.y - 10, 104, 2);
    obstacle(`${prefix}:front-step`, v.x, v.y - 7, 34, 12);
    if (["cafe", "restaurant", "market"].includes(v.type)) {
      for (const side of [-1, 1]) obstacle(`${prefix}:awning-post:${side}`, v.x + side * 49, v.y + 10, 1.4, 1.4);
    }
    tree(`${prefix}:tree`, v.x - 66, v.y - 14, 3);
  } else {
    tree(`${prefix}:tree:left`, v.x - 45, v.y - 47, 1);
    tree(`${prefix}:tree:right`, v.x + 45, v.y - 47, 2);
    if (["square", "park"].includes(v.type)) obstacle(`${prefix}:fountain`, v.x, v.y - 44, 25, 25);
    if (v.type === "sport") for (const dx of [-40, 40]) obstacle(`${prefix}:goal:${dx}`, v.x + dx, v.y - 35, 1.5, 20);
    if (["bus", "metro"].includes(v.type)) for (const dx of [-43, 43]) obstacle(`${prefix}:shelter-post:${dx}`, v.x + dx, v.y - 22, 2, 2);
  }
}
// The exact former runtime generation, now consumed by both graphics and motion.
for (let i = 0; i < 140; i++) {
  const x = (i * 379 + 41) % 2430, z = (i * 193 + 110) % 1480;
  if (buildingAllowed(x, z, 6) && !buildings.some(b => Math.abs(x - b.x) < b.width / 2 + 17 && Math.abs(z - b.z) < b.depth / 2 + 17)) tree(`street-tree:${i}`, x, z, i);
}
// Background shop awnings sit below head height and extend past the building.
for (const [i, b] of buildings.entries()) obstacle(`building:${i}:awning`, b.x, b.z + b.depth / 2 + 5, b.width + 5, 10);

const roads = boulevards.flatMap(road => road.slice(1).map((end, i) => ({ start: road[i], end })));
function offRoad(x: number, z: number) {
  return trafficJunctions.every(j => Math.hypot(x - j.position[0], z - j.position[1]) > j.radius + 4) && roads.every(({ start, end }) => {
    const dx = end[0] - start[0], dz = end[1] - start[1];
    const t = Math.max(0, Math.min(1, ((x - start[0]) * dx + (z - start[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - start[0] - dx * t, z - start[1] - dz * t) > 29;
  });
}
/** One lamp per junction coordinate; poles stand on the pavement, outside roads. */
export const sceneryLamps: { id: string; x: number; z: number }[] = [];
const seen = new Set<string>();
for (const road of boulevards) for (const point of road) {
  const key = point.join(":"); if (seen.has(key)) continue; seen.add(key);
  let chosen: { id: string; x: number; z: number } | undefined;
  for (const radius of [30, 48, 64, 80, 96, 112]) {
    for (let step = 0; step < 16; step++) {
      const angle = step / 16 * Math.PI * 2, x = point[0] + Math.cos(angle) * radius, z = point[1] + Math.sin(angle) * radius;
      if (!offRoad(x, z) || [...buildings, ...sceneryObstacles].some(r => Math.abs(x - r.x) < r.width / 2 + 4 && Math.abs(z - r.z) < r.depth / 2 + 4)) continue;
      chosen = { id: `street-lamp:${key}`, x, z }; break;
    }
    if (chosen) break;
  }
  if (!chosen) throw new Error(`No safe lamp position at ${key}`);
  sceneryLamps.push(chosen); obstacle(chosen.id, chosen.x, chosen.z, 1.4, 1.4);
}
