import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { groundObstacles, WALK_RADIUS, walkable, segmentWalkable, nearestWalkable, safeWalkPath, walkRouteStats, WalkDirector } from '../lib/city/walkability.ts';
import { containsPoint, segmentHits } from '../lib/city/footprints.ts';
import { venues } from '../lib/city/world.ts';
import { seed } from '../lib/world.ts';
import { distance, places } from '../lib/life.ts';
import { vehicleContains } from '../lib/city/traffic.ts';
import { VEHICLES } from '../lib/city/scale.ts';

const results = [], metrics = {};
function test(name, run) {
  try { run(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
}
const clearPoint = p => p.length === 2 && p.every(Number.isFinite) && !groundObstacles.some(r => containsPoint(r, p, WALK_RADIUS));
const clearSegment = (a, b) => !groundObstacles.some(r => segmentHits(r, a, b, WALK_RADIUS));
function verifyPath(path, start, end, label = '') {
  assert.ok(path.length >= 1, `${label}: empty path`);
  assert.ok(path.every(clearPoint), `${label}: nonfinite or occupied waypoint`);
  assert.ok(distance(path[0], nearestWalkable(start)) < 1e-7, `${label}: incorrect start`);
  assert.ok(distance(path.at(-1), nearestWalkable(end)) < 1e-7, `${label}: goal unreachable or incorrect`);
  for (let i = 1; i < path.length; i++) assert.ok(clearSegment(path[i - 1], path[i]), `${label}: swept actor intersects a building on segment ${i}`);
}
const percentile = (values, q) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * q))];
const born = '2026-10-25T17:00:00Z';
const world = { ...structuredClone(seed), born };

test('nearest walkable points clear every actual building center, edge and venue anchor', () => {
  assert.ok(groundObstacles.length > 200);
  assert.ok(WALK_RADIUS >= 4.2, 'Radius must include the rendered arm extent');
  let projected = 0;
  for (const r of groundObstacles) {
    assert.ok([r.x, r.z, r.width, r.depth].every(Number.isFinite));
    for (const point of [[r.x, r.z], [r.x + r.width / 2 - .1, r.z], [r.x, r.z - r.depth / 2 + .1]]) {
      const safe = nearestWalkable(point);
      assert.ok(clearPoint(safe), `No clear projection near ${JSON.stringify(point)}`);
      assert.ok(distance(point, safe) < Math.max(r.width, r.depth) + 100);
      projected++;
    }
  }
  for (const v of venues) assert.ok(clearPoint(nearestWalkable([v.x, v.y])), v.name);
  metrics.projectedPoints = projected + venues.length;
});

test('all 33 × 33 venue routes reach their actual goal with swept radius clearance and bounded cache', () => {
  assert.equal(venues.length, 33);
  const allTimes = [], astarTimes = [], failures = [];
  let detours = 0, maximumCache = 0, segments = 0;
  const startBatch = performance.now();
  for (const a of venues) for (const b of venues) {
    const start = [a.x, a.y], end = [b.x, b.y];
    const blocked = !clearSegment(nearestWalkable(start), nearestWalkable(end));
    const before = performance.now(), path = safeWalkPath(start, end), elapsed = performance.now() - before;
    allTimes.push(elapsed);
    if (blocked) { detours++; astarTimes.push(elapsed); }
    maximumCache = Math.max(maximumCache, walkRouteStats().size);
    assert.ok(walkRouteStats().size <= walkRouteStats().limit);
    try { verifyPath(path, start, end, `${a.name} → ${b.name}`); }
    catch (error) { failures.push(error.message); }
    segments += path.length - 1;
  }
  metrics.venueRoutes = { count: allTimes.length, detours, sweptSegments: segments, totalMs: Math.round(performance.now() - startBatch),
    venueRouteLatency: { count: astarTimes.length, p50Ms: +percentile(astarTimes, .5).toFixed(3), p95Ms: +percentile(astarTimes, .95).toFixed(3), maximumMs: +Math.max(...astarTimes).toFixed(3) }, maximumCache, failures: failures.slice(0, 8), failureCount: failures.length };
  assert.ok(detours > 256, 'Exercise obstacle detours, not only open straight routes');
  assert.equal(failures.length, 0, failures.slice(0, 5).join('\n'));
});

test('outside endpoints detour around occupied rectangles rather than crossing the body', () => {
  let checked = 0;
  for (const r of groundObstacles) {
    const start = [r.x - r.width / 2 - WALK_RADIUS - 12, r.z], end = [r.x + r.width / 2 + WALK_RADIUS + 12, r.z];
    if (!clearPoint(start) || !clearPoint(end)) continue;
    assert.equal(segmentHits(r, start, end, WALK_RADIUS), true);
    const path = safeWalkPath(start, end);
    verifyPath(path, start, end, `Rect ${r.id ?? `${r.x}/${r.z}`}`);
    assert.ok(path.length >= 3);
    if (++checked >= 24) break;
  }
  assert.equal(checked, 24);
  metrics.outsideEndpointDetours = checked;
});

test('Phòng An to Phòng Bình checks the shortcut from the exact start rather than its grid cell', () => {
  const start = [207, 228], end = [408, 183], path = safeWalkPath(start, end);
  const home = groundObstacles.find(r => r.id === 'Phòng An');
  assert.ok(home);
  assert.equal(segmentHits(home, start, [328, 214], WALK_RADIUS), true, 'The former first shortcut cut through the home');
  verifyPath(path, start, end, 'Exact-start reconstruction regression');
  assert.ok(path.length >= 3);
});

test('sub-unit endpoint changes cannot reuse a route with stale rounded endpoints', () => {
  const r = groundObstacles.find(r => clearPoint([r.x - r.width / 2 - WALK_RADIUS - 14, r.z]) && clearPoint([r.x + r.width / 2 + WALK_RADIUS + 14, r.z]));
  assert.ok(r);
  const a = [r.x - r.width / 2 - WALK_RADIUS - 14, r.z], b = [r.x + r.width / 2 + WALK_RADIUS + 14, r.z];
  verifyPath(safeWalkPath(a, b), a, b);
  const shiftedA = [a[0] + .125, a[1] + .125], shiftedB = [b[0] - .125, b[1] + .125];
  const shifted = safeWalkPath(shiftedA, shiftedB);
  verifyPath(shifted, shiftedA, shiftedB);
  assert.deepEqual(shifted[0], shiftedA);
  assert.deepEqual(shifted.at(-1), shiftedB);
  const cached = safeWalkPath([...shiftedA], [...shiftedB]);
  verifyPath(cached, shiftedA, shiftedB, 'Exact cache readback');
  assert.deepEqual(cached[0], shiftedA);
  assert.deepEqual(cached.at(-1), shiftedB);
});

test('spatial segment/point acceleration agrees with all actual obstacles for short and long sweeps', () => {
  let checks = 0;
  for (const r of groundObstacles) {
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const corner = [r.x + dx * (r.width / 2 + WALK_RADIUS), r.z + dz * (r.depth / 2 + WALK_RADIUS)];
      for (const shift of [-.25, .25]) {
        const a = [corner[0] + shift, corner[1] + shift], b = [a[0] + 12, a[1] - 9];
        assert.equal(walkable(a), clearPoint(a));
        assert.equal(segmentWalkable(a, b), clearSegment(a, b));
        checks++;
      }
    }
  }
  metrics.spatialOracleChecks = checks;
});

function actor(from, to, id = 'an') {
  const index = world.people.findIndex(p => p.id === id), start = typeof from === 'string' ? places[from] : from, end = typeof to === 'string' ? places[to] : to;
  return { id, name: world.people[index].name, from: typeof from === 'string' ? from : 'Sân chung', location: typeof to === 'string' ? to : 'Quảng trường',
    position: [start[0] + (index - 1) * 25, start[1] + index * 7], path: [start, end], walking: true, stationaryFor: 0, transport: 'walk', kind: 'social', activity: 'Đi đến nơi gặp bạn', source: 'plan', progress: 0 };
}

test('walker keeps continuous safe ground paths through plan changes, polls, reordering and pause', () => {
  const director = new WalkDirector(), w = structuredClone(world), dt = 1 / 30;
  let previous, frozen, traveled = 0;
  const started = performance.now();
  for (let frame = 0; frame <= 30 * 180; frame++) {
    const seconds = frame * dt, changed = seconds >= 40;
    const input = [actor('Sân chung', changed ? 'Thư viện' : 'Quán cà phê'), actor('Phòng Bình', 'Bếp chung', 'binh'), actor('Vườn nhỏ', changed ? 'Công viên' : 'Xưởng sáng tạo', 'chi')];
    if (changed) input[0].position = [1800, 200]; // A fresh snapshot must not teleport the rendered walker.
    if (frame % 2) input.reverse();
    w.paused = seconds >= 70 && seconds < 75;
    const output = director.frame(structuredClone(w), input, seconds);
    for (const a of output) {
      assert.ok(clearPoint(a.position), `${a.id} occupies a building at ${seconds}`);
      assert.ok(Number.isFinite(a.stationaryFor));
      if (previous) {
        const old = previous.find(b => b.id === a.id), moved = distance(old.position, a.position);
        assert.ok(moved <= 16 * dt + 1e-6, `${a.id} jumped ${moved} at ${seconds}`);
        assert.ok(clearSegment(old.position, a.position), `${a.id} swept through a wall at ${seconds}`);
        if (w.paused) assert.ok(moved < 1e-9);
        traveled += moved;
      }
    }
    if (frame === 30 * 71) frozen = output;
    if (frame === 30 * 74) assert.deepEqual(output.map(a => [a.id, a.position]).sort(), frozen.map(a => [a.id, a.position]).sort());
    previous = output;
  }
  assert.ok(traveled > 1000, 'Actual movement must be exercised');
  assert.ok(previous.some(a => !a.walking), 'At least one walker must finish its path');
  metrics.walkerFrames = { count: 30 * 180 + 1, actors: 3, totalMs: Math.round(performance.now() - started), distance: Math.round(traveled) };
});

test('a car blocks a walker before its footprint and removal allows travel to resume', () => {
  const director = new WalkDirector(), input = [actor([-400, -700], [-200, -700])], dt = 1 / 30;
  const car = { id: 'stationary-obstruction', position: [-350, -700], yaw: Math.PI / 2, type: 'car', ...VEHICLES.car, speed: 0 };
  let stopped;
  for (let frame = 0; frame < 30 * 20; frame++) {
    const output = director.frame(world, input, frame * dt, [car]);
    assert.equal(vehicleContains(car, output[0].position, WALK_RADIUS), false);
    if (frame > 30 * 10) assert.deepEqual(output[0].position, stopped);
    stopped = output[0].position;
  }
  assert.ok(stopped[0] < -375 && stopped[0] > -395, JSON.stringify(stopped));
  let last;
  for (let frame = 30 * 20; frame < 30 * 40; frame++) last = director.frame(world, input, frame * dt, []);
  assert.ok(distance(last[0].position, [-200, -700]) < .01);
  assert.equal(last[0].walking, false);
});

for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.ok ? '' : `: ${result.error}`}`);
console.log(JSON.stringify({ suite: 'walkability', cases: results.length, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, metrics }));
if (results.some(r => !r.ok)) process.exitCode = 1;
