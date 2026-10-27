import { boulevards, metroLine, venues } from "./world.ts";
import { cityBuildings, pedestrianSegments } from "./three-layout.ts";
import { venueSceneryPose } from "./scenery.ts";
import { trafficJunctions } from "./traffic.ts";

const pads = [
  ...venues.map(venueSceneryPose).map(v => ({ x: v.x, z: v.y - 25, w: 125, d: 112, top: 2 })),
  ...cityBuildings().map(b => ({ x: b.x, z: b.z, w: b.width + 12, d: b.depth + 12, top: 2.2 })),
];
const strips = [
  ...boulevards.flatMap(road => [{ road, width: 68, top: .75 }, { road, width: 43, top: 1.25 }]),
  ...pedestrianSegments.map(road => ({ road, width: 8, top: 1.75 })),
  { road: metroLine, width: 10, top: 3.25 }, { road: metroLine, width: 5, top: 3.75 },
].flatMap(({ road, width, top }) => road.slice(1).map((end, i) => {
  const start = road[i], dx = end[0] - start[0], dz = end[1] - start[1], length = Math.hypot(dx, dz);
  return { x: start[0], z: start[1], dx: dx / length, dz: dz / length, length, width, top };
}));
/** Match the actual flat grass, paving, platform and road tops drawn by runtime. */
export function groundElevation(x: number, z: number) {
  let height = -.5;
  for (const p of pads) if (Math.abs(x - p.x) <= p.w / 2 && Math.abs(z - p.z) <= p.d / 2) height = Math.max(height, p.top);
  for (const p of strips) {
    const dx = x - p.x, dz = z - p.z, along = dx * p.dx + dz * p.dz;
    if (along >= -p.width * .125 && along <= p.length + p.width * .125 && Math.abs(dx * p.dz - dz * p.dx) <= p.width / 2) height = Math.max(height, p.top);
  }
  if (trafficJunctions.some(j => Math.hypot(x - j.position[0], z - j.position[1]) <= j.radius)) height = Math.max(height, 1.35);
  return height;
}
