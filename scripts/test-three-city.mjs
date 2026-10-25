import assert from "node:assert/strict";
import {
  cityBuildings,
  pedestrianSegments,
  segmentDistance,
} from "../lib/city/three-layout.ts";
import { boulevards, venues } from "../lib/city/world.ts";
const buildings = cityBuildings();
assert.deepEqual(
  buildings,
  cityBuildings(),
  "Reloading must not move the city",
);
assert.ok(
  buildings.length >= 200 && buildings.filter((b) => b.tower).length >= 100,
  "Dense mixed skyline",
);
assert.ok(
  buildings.some((b) => b.height >= 300) &&
    buildings.some((b) => b.height < 50),
);
for (const b of buildings) {
  assert.ok([b.x, b.z, b.width, b.depth, b.height].every(Number.isFinite));
  assert.ok(b.width > 0 && b.depth > 0 && b.height > 0);
  const radius = Math.hypot(b.width, b.depth) / 2;
  for (const [a, c] of pedestrianSegments)
    assert.ok(
      segmentDistance(b.x, b.z, a, c) >= radius + 13,
      "No tower can obstruct a simulated pedestrian route",
    );
  for (const path of boulevards)
    for (let i = 1; i < path.length; i++)
      assert.ok(
        segmentDistance(b.x, b.z, path[i - 1], path[i]) >= radius + 34,
        "Road clearance",
      );
  for (const v of venues)
    assert.ok(
      Math.hypot(b.x - v.x, b.z - (v.y - 28)) >= radius + 100,
      "Preserve venue doors and gathering space",
    );
}
for (let i = 0; i < buildings.length; i++)
  for (let j = i + 1; j < buildings.length; j++) {
    const a = buildings[i],
      b = buildings[j];
    assert.ok(
      Math.abs(a.x - b.x) > (a.width + b.width) / 2 + 8 ||
        Math.abs(a.z - b.z) > (a.depth + b.depth) / 2 + 8,
      "Building podiums must not overlap",
    );
  }
console.log(
  `PASS: deterministic ${buildings.length}-building skyline, ${buildings.filter((b) => b.tower).length} towers, all pedestrian/road/venue clearances, finite geometry and separated podiums.`,
);
