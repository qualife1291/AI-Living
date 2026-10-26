import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { seed } from "../lib/world.ts";
import { distance } from "../lib/life.ts";
import { standingOffset } from "../lib/living/social.ts";
import { WalkDirector, walkable, segmentWalkable, nearestWalkable, safeWalkPath, WALK_RADIUS, PERSONAL_SPACE } from "../lib/city/walkability.ts";
import { sceneryTrees, sceneryObstacles, venueSceneryPose } from "../lib/city/scenery.ts";
import { venues } from "../lib/city/world.ts";
import { openVenue } from "../lib/city/footprints.ts";
import { buildingAllowed, cityBuildings } from "../lib/city/three-layout.ts";

const results = [], metrics = {};
function test(name, run) {
  const started = performance.now();
  try { run(); results.push({ name, ok: true, milliseconds: Math.round(performance.now() - started) }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
}
function fixture(count) {
  const world = { ...structuredClone(seed), born: "2026-10-26T05:00:00Z" };
  world.people = Array.from({ length: count }, (_, i) => ({ ...structuredClone(seed.people[i % 3]), id: `walker-${String(i).padStart(2, "0")}`, name: `Người ${i}` }));
  return world;
}
function actor(world, index, from, to, walking = true) {
  const person = world.people[index], slot = standingOffset(world, person.id);
  const rawStart = [from[0] - slot[0], from[1] - slot[1]], rawEnd = [to[0] - slot[0], to[1] - slot[1]];
  return { id: person.id, name: person.name, from: "Sân chung", location: "Quảng trường", activity: "Đi dạo", kind: "social", source: "plan", walking, transport: "walk", stationaryFor: walking ? 0 : 60, progress: 0,
    position: [rawStart[0] + (index - 1) * 25, rawStart[1] + index * 7], path: [rawStart, rawEnd] };
}
function closestSweep(a0, a1, b0, b1) {
  const x = a0[0] - b0[0], z = a0[1] - b0[1];
  const dx = a1[0] - a0[0] - b1[0] + b0[0], dz = a1[1] - a0[1] - b1[1] + b0[1];
  const time = Math.max(0, Math.min(1, -(x * dx + z * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x + dx * time, z + dz * time);
}
function verifyFrame(output, previous, dt) {
  const before = new Map(previous?.map(a => [a.id, a]) ?? []);
  for (const a of output) {
    assert.ok(walkable(a.position), `${a.id} intersects scenery at ${a.position}`);
    const old = before.get(a.id);
    if (old) {
      assert.ok(distance(old.position, a.position) <= dt * 16 + 1e-6, `${a.id} teleports`);
      assert.ok(segmentWalkable(old.position, a.position), `${a.id} sweeps through scenery`);
    }
  }
  for (let i = 0; i < output.length; i++) for (let j = i + 1; j < output.length; j++) {
    const a = output[i], b = output[j], gap = distance(a.position, b.position);
    assert.ok(gap >= PERSONAL_SPACE - 1e-6, `${a.id}/${b.id} overlap at distance ${gap}`);
    if (before.has(a.id) && before.has(b.id)) assert.ok(closestSweep(before.get(a.id).position, a.position, before.get(b.id).position, b.position) >= PERSONAL_SPACE - 1e-6, "Moving discs intersect between frames");
  }
}
function runScenario(world, input, seconds, { reorder = true } = {}) {
  const director = new WalkDirector(), dt = 1 / 30;
  const snapshot = JSON.stringify(world);
  let previous;
  const frameTimes = [];
  for (let frame = 0; frame <= seconds * 30; frame++) {
    const started = performance.now();
    const output = director.frame(world, reorder && frame % 2 ? [...input].reverse() : input, frame * dt);
    frameTimes.push(performance.now() - started);
    verifyFrame(output, previous, dt);
    previous = output;
  }
  assert.equal(JSON.stringify(world), snapshot, "Visual avoidance must not change durable world/history");
  frameTimes.sort((a, b) => a - b);
  return { output: previous, frameP95Ms: frameTimes[Math.floor(frameTimes.length * .95)], frames: frameTimes.length };
}

test("shared trees match venue scenery poses and seeded placements", () => {
  const expected = [], buildings = cityBuildings();
  for (const venue of venues) {
    const v = venueSceneryPose(venue);
    if (openVenue(v)) expected.push({ x: v.x - 45, z: v.y - 47, seed: 1 }, { x: v.x + 45, z: v.y - 47, seed: 2 });
    else expected.push({ x: v.x - 66, z: v.y - 14, seed: 3 });
  }
  for (let i = 0; i < 140; i++) {
    const x = (i * 379 + 41) % 2430, z = (i * 193 + 110) % 1480;
    if (buildingAllowed(x, z, 6) && !buildings.some(b => Math.abs(x - b.x) < b.width / 2 + 17 && Math.abs(z - b.z) < b.depth / 2 + 17)) expected.push({ x, z, seed: i });
  }
  assert.deepEqual(sceneryTrees.map(({ x, z, seed: treeSeed }) => ({ x, z, seed: treeSeed })), expected);
  assert.equal(new Set(sceneryObstacles.map(r => r.id)).size, sceneryObstacles.length);
  for (const tree of sceneryTrees) {
    const trunk = sceneryObstacles.find(r => r.id === `${tree.id}:trunk`);
    assert.deepEqual([trunk.x, trunk.z, trunk.width, trunk.depth], [tree.x, tree.z, 3, 3]);
  }
  metrics.scenery = { trees: sceneryTrees.length, obstacles: sceneryObstacles.length };
});

test("every prop/trunk blocks its exact footprint and all venues retain a free activity endpoint", () => {
  for (const rect of sceneryObstacles) {
    assert.equal(walkable([rect.x, rect.z]), false, rect.id);
    assert.ok(walkable(nearestWalkable([rect.x, rect.z])), rect.id);
  }
  for (const venue of venues) assert.ok(walkable(nearestWalkable([venue.x, venue.y])), venue.name);
  let detours = 0;
  for (const rect of sceneryObstacles.filter(r => !r.id.startsWith("building:"))) {
    const start = [rect.x - rect.width / 2 - WALK_RADIUS - 10, rect.z], end = [rect.x + rect.width / 2 + WALK_RADIUS + 10, rect.z];
    if (!walkable(start) || !walkable(end)) continue;
    const route = safeWalkPath(start, end);
    assert.ok(distance(route.at(-1), end) < .01, rect.id);
    for (let i = 1; i < route.length; i++) assert.ok(segmentWalkable(route[i - 1], route[i]), rect.id);
    detours++;
  }
  assert.ok(detours > 50);
  metrics.scenery.detours = detours;
});

test("63 overlapping stationary spawns/goals get deterministic personal space without world mutation", () => {
  const world = fixture(63), input = world.people.map((_, i) => actor(world, i, [380, 286], [380, 286], false));
  const snapshot = JSON.stringify(world), a = new WalkDirector(), b = new WalkDirector();
  const first = a.frame(world, input, 0), reversed = b.frame(world, [...input].reverse(), 0);
  verifyFrame(first, null, 0);
  assert.deepEqual(first.map(p => [p.id, p.position]).sort(), reversed.map(p => [p.id, p.position]).sort());
  let previous = first;
  for (let frame = 1; frame <= 120; frame++) {
    const output = a.frame(world, frame % 2 ? [...input].reverse() : input, frame / 30);
    verifyFrame(output, previous, 1 / 30); previous = output;
  }
  world.paused = true;
  const frozen = a.frame(world, input, 5);
  for (const at of [10, 100, 1000]) assert.deepEqual(a.frame(world, input, at).map(p => [p.id, p.position]), frozen.map(p => [p.id, p.position]));
  world.paused = false;
  assert.equal(JSON.stringify(world), snapshot);
});

test("opposite walkers pass on different sides and reach both original goals", () => {
  const world = fixture(2), goals = [[-180, -700], [-420, -700]];
  const input = [actor(world, 0, goals[1], goals[0]), actor(world, 1, goals[0], goals[1])];
  const result = runScenario(world, input, 45);
  for (let i = 0; i < goals.length; i++) assert.ok(distance(result.output.find(a => a.id === input[i].id).position, goals[i]) < .1, JSON.stringify(result.output.map(a => a.position)));
  metrics.headOn = result;
  delete metrics.headOn.output;
});

test("four crossing streams avoid swept intersections and finish", () => {
  const world = fixture(4), starts = [[-420, -680], [-180, -680], [-300, -800], [-300, -560]];
  const goals = [starts[1], starts[0], starts[3], starts[2]];
  const input = starts.map((start, i) => actor(world, i, start, goals[i]));
  const result = runScenario(world, input, 65);
  for (let i = 0; i < goals.length; i++) assert.ok(distance(result.output.find(a => a.id === input[i].id).position, goals[i]) < .1, JSON.stringify(result.output.map(a => a.position)));
  metrics.fourWay = { frames: result.frames, frameP95Ms: result.frameP95Ms };
});

test("16 head-on walkers in adjacent rows do not deadlock or overlap", () => {
  const world = fixture(16), goals = [];
  const input = world.people.map((_, i) => {
    const row = i % 8, from = [i < 8 ? -420 : -150, -800 + row * 14], to = [i < 8 ? -150 : -420, from[1]];
    goals.push(to); return actor(world, i, from, to);
  });
  const result = runScenario(world, input, 80);
  const unfinished = input.filter(a => {
    const actual = result.output.find(b => b.id === a.id);
    return actual.walking || actual.stationaryFor < 1 || distance(actual.position, actual.path.at(-1)) > .1;
  });
  assert.equal(unfinished.length, 0, `Unfinished: ${unfinished.map(a => a.id)}`);
  // Nearby requested endpoints are spread to leave a person-wide passage; the
  // assigned reachable goal must remain in the same small gathering area.
  for (let i = 0; i < input.length; i++) assert.ok(distance(result.output.find(a => a.id === input[i].id).position, goals[i]) < 70);
  metrics.denseHeadOn = { frames: result.frames, frameP95Ms: result.frameP95Ms };
});

test("a crowded shared destination gets separate goals and newcomers do not move existing walkers", () => {
  const world = fixture(12), center = [-300, -680];
  const input = world.people.map((_, i) => actor(world, i, [center[0] + Math.cos(i / 12 * Math.PI * 2) * 100, center[1] + Math.sin(i / 12 * Math.PI * 2) * 100], center));
  const result = runScenario(world, input, 90);
  assert.ok(result.output.every(a => !a.walking && a.stationaryFor > 1), JSON.stringify(result.output.map(a => ({ id: a.id, p: a.position, idle: a.stationaryFor }))));
  const director = new WalkDirector();
  const first = director.frame(world, [input[0]], 0);
  const added = actor(world, 1, first[0].position, first[0].position, false);
  const next = director.frame(world, [input[0], added], 0);
  assert.deepEqual(next.find(a => a.id === first[0].id).position, first[0].position);
  verifyFrame(next, first, 0);
  metrics.sharedDestination = { frames: result.frames, frameP95Ms: result.frameP95Ms };
});

for (const result of results) console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.ok ? ` (${result.milliseconds}ms)` : `: ${result.error}`}`);
console.log(JSON.stringify({ suite: "personal-space", cases: results.length, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, metrics }));
if (results.some(r => !r.ok)) process.exitCode = 1;
