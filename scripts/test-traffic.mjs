import assert from "node:assert/strict";
import {
  trafficAt, trafficYieldAt, vehicleContains, vehicleCorners, TrafficDirector,
  trafficRouteVertices, trafficJunctions, TRAFFIC_COUNT, TRAFFIC_SPEED,
  TRAFFIC_ROUTE_LENGTH, TRAFFIC_PERIOD_SECONDS,
} from "../lib/city/traffic.ts";
import { boulevards } from "../lib/city/world.ts";
import { cityBuildings } from "../lib/city/three-layout.ts";
import { venueObstacles } from "../lib/city/footprints.ts";

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const roads = boulevards.flatMap(path => path.slice(1).map((b, i) => {
  const a = path[i], length = distance(a, b);
  return { a, b, length, dx: (b[0] - a[0]) / length, dz: (b[1] - a[1]) / length };
}));
function paved(point) {
  return trafficJunctions.some(j => distance(j.position, point) <= j.radius + 1e-8) || roads.some(r => {
    const dx = point[0] - r.a[0], dz = point[1] - r.a[1];
    const along = dx * r.dx + dz * r.dz;
    const lateral = Math.abs(dx * r.dz - dz * r.dx);
    // Match runtime road43 and its length + width*.25 cap extension.
    return along >= -43 * .125 && along <= r.length + 43 * .125 && lateral <= 43 / 2 + 1e-8;
  });
}
const vehicleAxes = v => [[Math.cos(v.yaw), -Math.sin(v.yaw)], [Math.sin(v.yaw), Math.cos(v.yaw)]];
function intersects(a, b, padding = 0) {
  // Independent separating-axis test, not the module's pedestrian point helper.
  const axesA = vehicleAxes(a), axesB = vehicleAxes(b);
  const difference = [b.position[0] - a.position[0], b.position[1] - a.position[1]];
  for (const axis of [...axesA, ...axesB]) {
    const radius = (v, axes) => (v.width / 2 + padding) * Math.abs(axis[0] * axes[0][0] + axis[1] * axes[0][1]) + (v.length / 2 + padding) * Math.abs(axis[0] * axes[1][0] + axis[1] * axes[1][1]);
    if (Math.abs(difference[0] * axis[0] + difference[1] * axis[1]) >= radius(a, axesA) + radius(b, axesB) - 1e-8) return false;
  }
  return true;
}
const buildings = [...cityBuildings(), ...venueObstacles].map(b => ({
  id: b.id ?? `${b.x},${b.z}`,
  position: [b.x, b.z], yaw: 0, width: b.width, length: b.depth,
}));
function noCarOverlap(cars) {
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    if (distance(cars[i].position, cars[j].position) > 65) continue;
    assert.equal(intersects(cars[i], cars[j], 1), false, `Car overlap: ${cars[i].id}/${cars[j].id}`);
  }
}
function noBuildingOverlap(car) {
  for (const building of buildings) {
    if (Math.abs(car.position[0] - building.position[0]) > 85 || Math.abs(car.position[1] - building.position[1]) > 85) continue;
    assert.equal(intersects(car, building, .75), false, `${car.id} intersects ${building.id}`);
  }
}

assert.equal(trafficAt(0).length, TRAFFIC_COUNT);
assert.ok(TRAFFIC_ROUTE_LENGTH / TRAFFIC_COUNT > 150, "Wide initial following headway");
assert.ok(trafficAt(0).every(v => v.type === "car"), "Do not draw long bus/metro vehicles on unproven tight/dead-end routes");
let sweptVehicles = 0;
for (let time = 0; time < TRAFFIC_PERIOD_SECONDS * 2; time += .1) {
  const cars = trafficAt(time);
  const next = trafficAt(time + .001);
  noCarOverlap(cars);
  for (const [index, car] of cars.entries()) {
    assert.ok([...car.position, car.yaw, car.speed].every(Number.isFinite));
    near(distance(car.position, next[index].position), TRAFFIC_SPEED * .001, 2e-5);
    assert.ok(angleDistance(car.yaw, next[index].yaw) < .002, "Continuous tangent, including wrap/turn junctions");
    noBuildingOverlap(car);
    for (const point of vehicleCorners(car, .75)) assert.ok(paved(point), `Body corner leaves pavement at ${time}: ${point}`);
    // The whole body must fit the road union, not just its four extreme corners.
    const [right, forward] = vehicleAxes(car);
    for (const lateral of [-.5, -.25, 0, .25, .5]) for (const along of [-.5, -.25, 0, .25, .5]) {
      assert.ok(paved([
        car.position[0] + right[0] * car.width * lateral + forward[0] * car.length * along,
        car.position[1] + right[1] * car.width * lateral + forward[1] * car.length * along,
      ]), "Interior of oriented car footprint stays paved");
    }
    if (trafficRouteVertices.every(v => distance(v, car.position) > 90)) {
      const closest = roads.map(r => {
        const dx = car.position[0] - r.a[0], dz = car.position[1] - r.a[1];
        const along = Math.max(0, Math.min(r.length, dx * r.dx + dz * r.dz));
        const point = [r.a[0] + r.dx * along, r.a[1] + r.dz * along];
        return { point, distance: distance(point, car.position) };
      }).sort((a, b) => a.distance - b.distance)[0];
      near((car.position[0] - closest.point[0]) * right[0] + (car.position[1] - closest.point[1]) * right[1], 10, 1e-5);
    }
    sweptVehicles++;
  }
}
for (const time of [0, 1, 11.4, 50, 94.744]) {
  const a = trafficAt(time), b = trafficAt(time + TRAFFIC_PERIOD_SECONDS);
  for (let i = 0; i < a.length; i++) {
    near(distance(a[i].position, b[i].position), 0);
    near(angleDistance(a[i].yaw, b[i].yaw), 0);
  }
}
for (const time of [NaN, Infinity, -1, 10 ** 9]) assert.ok(trafficAt(time).every(v => [...v.position, v.yaw].every(Number.isFinite)));

const first = trafficAt(10)[0];
assert.equal(vehicleContains(first, first.position), true);
assert.equal(vehicleContains(first, [first.position[0] + 500, first.position[1] + 500], 3), false);
assert.equal(trafficYieldAt(10, first.position, first.position, 3, .1), true);
assert.equal(trafficYieldAt(10, [0, 0], [1, 1], 3, .1), false);

// A pedestrian blocks a straight part of the lane. Every follower must queue,
// without driving through the stopped leader, and then resume when it is clear.
const director = new TrafficDirector();
let previous = director.frame(0);
const pedestrian = [1800, 440];
let queueFrames = 0;
for (let time = .05; time < 180; time += .05) {
  const cars = director.frame(time, [pedestrian]);
  noCarOverlap(cars);
  for (const [index, car] of cars.entries()) {
    assert.ok(distance(car.position, previous[index].position) <= TRAFFIC_SPEED * .05 + 1e-6, "No frame teleport");
    assert.equal(vehicleContains(car, pedestrian, 3), false, "Stop before the walker");
    noBuildingOverlap(car);
  }
  if (time > 170) {
    assert.ok(cars.every(c => c.speed < .01), "Whole lane queues behind a stopped leader");
    queueFrames++;
  }
  previous = cars;
}
const leader = previous.filter(c => Math.abs(c.position[1] - 440) < 1 && c.position[0] < pedestrian[0]).sort((a, b) => b.position[0] - a.position[0])[0];
assert.ok(leader);
assert.ok(pedestrian[0] - leader.position[0] - leader.length / 2 - 3 >= 10, "At least ten units clear between the front bumper and pedestrian disc");
const paused = director.frame(180, [pedestrian]);
for (let i = 0; i < 10; i++) {
  const frozen = director.frame(180, [pedestrian]);
  assert.deepEqual(frozen.map(v => [v.id, v.position, v.yaw]), paused.map(v => [v.id, v.position, v.yaw]));
}
for (let time = 180.05; time < 240; time += .05) {
  const cars = director.frame(time, []);
  noCarOverlap(cars);
  previous = cars;
}
assert.ok(previous.every(c => c.speed > 23.9), "Traffic resumes after the crossing clears");
const beforeSleep = previous;
const afterSleep = director.frame(100_000, []);
assert.ok(afterSleep.every((c, i) => distance(c.position, beforeSleep[i].position) <= TRAFFIC_SPEED * .1 + 1e-6), "Long tab sleep advances at most one bounded step");

// Cooperative crossing: cars see the last actual walker position; the walker
// advances only when the returned actual car footprints leave room.
const crossingDirector = new TrafficDirector();
let walker = [1800, 405];
crossingDirector.frame(0, [walker]);
for (let time = .05; time < 70; time += .05) {
  const cars = crossingDirector.frame(time, [walker]);
  noCarOverlap(cars);
  assert.ok(cars.every(c => !vehicleContains(c, walker, 3)), "Actual car/walker footprints never overlap");
  const candidate = [walker[0], Math.min(475, walker[1] + 7 * .05)];
  if (cars.every(c => !vehicleContains(c, candidate, 3.5))) walker = candidate;
}
assert.ok(walker[1] >= 475, "Walker can cross and traffic does not create a permanent deadlock");
console.log(JSON.stringify({ suite: "traffic", cars: TRAFFIC_COUNT, routeLength: Math.round(TRAFFIC_ROUTE_LENGTH), sweptVehicles, queueFrames, buildings: buildings.length, collisionCount: 0, continuous: true, crossing: "complete", pause: "frozen" }));
