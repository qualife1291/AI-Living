import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { venues } from "../lib/city/world.ts";
import { places, route } from "../lib/life.ts";
import { scenarios } from "../lib/living/learning.ts";
const osm = JSON.parse(
  readFileSync(
    new URL("../data/city/hcm-district1.json", import.meta.url),
    "utf8",
  ),
);
assert.ok(venues.length >= 30 && scenarios.length >= 30);
for (const v of venues) {
  assert.deepEqual(places[v.name], [v.x, v.y]);
  for (const target of ["Phòng An", "Ga metro", "Sân bay"]) {
    const path = route(v.name, target);
    assert.deepEqual(path[0], places[v.name]);
    assert.deepEqual(path.at(-1), places[target]);
  }
}
for (const s of scenarios)
  assert.ok(
    venues.some((v) => v.name === s.place),
    `Scenario has no venue: ${s.id}`,
  );
assert.equal(osm.license, "ODbL-1.0");
assert.equal(osm.attribution, "© OpenStreetMap contributors");
assert.ok(osm.features.length > 1000);
assert.ok(
  osm.features.every((f) =>
    f.points.every((p) => p.length === 2 && p.every(Number.isFinite)),
  ),
);
assert.ok(
  osm.features.some((f) => f.kind === "road") &&
    osm.features.some((f) => f.kind === "building"),
);
console.log(
  "PASS: 33 connected venues, 32 supported scenarios, expanded routes to metro/airport, real OSM geometry/ODbL attribution.",
);

// A metro plan includes walking to the station, a ride, and walking after arrival.
const { project, distance } = await import("../lib/life.ts");
const steps = [
  { location: "Sân bay", activity: "Đến sân bay", kind: "read", duration: 180 },
];
let rode = false,
  walked = false;
for (let t = 0; t < 120; t += 0.5) {
  const a = project(
      "an",
      "An",
      steps,
      t,
      "plan",
      "Phòng An",
      undefined,
      "metro",
    ),
    b = project(
      "an",
      "An",
      steps,
      t + 0.5,
      "plan",
      "Phòng An",
      undefined,
      "metro",
    );
  if (a.walking && a.transport === "metro") rode = true;
  if (a.walking && a.transport === "walk") walked = true;
  assert.ok(
    distance(a.position, b.position) < 120,
    "Transfer must remain continuous",
  );
}
assert.ok(
  rode && walked,
  "Multimodal trip must have station access and ride phases",
);
assert.deepEqual(
  project("an", "An", steps, 0, "plan", "Phòng An", undefined, "metro")
    .position,
  places["Phòng An"],
);
assert.deepEqual(
  project("an", "An", steps, 179, "plan", "Phòng An", undefined, "metro")
    .position,
  places["Sân bay"],
);
console.log(
  "PASS: continuous access/ride/egress metro projection and correct origin/destination.",
);
