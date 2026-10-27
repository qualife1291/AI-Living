import assert from "node:assert/strict";
import { Vector3 } from "three";
import { createHumanGeometry, humanPose } from "../components/city/three/humans.ts";
import { HUMAN_SCALE } from "../lib/city/scale.ts";
import { simulationTime } from "../lib/life.ts";
import { updateClock } from "../lib/clock.ts";
import { socialFrame } from "../lib/living/social.ts";
import { seed } from "../lib/world.ts";

// Bounds protect physical scale when box-shaped figures become rounded figures.
const geometries = createHumanGeometry();
const triangles = {};
for (const [name, geometry] of Object.entries(geometries)) {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  for (const axis of ["x", "y", "z"]) {
    assert.ok(Math.abs(size[axis] - 1) < 1e-6, `${name}: unit ${axis} dimension`);
    assert.ok(Math.abs(center[axis]) < 1e-6, `${name}: centered ${axis}`);
  }
  for (const attribute of [geometry.attributes.position, geometry.attributes.normal]) {
    assert.ok(Array.from(attribute.array).every(Number.isFinite), `${name}: finite vertices/normals`);
  }
  triangles[name] = (geometry.index?.count ?? geometry.attributes.position.count) / 3;
  assert.ok(triangles[name] >= 12 && triangles[name] <= 300, `${name}: low-poly budget`);
}
assert.ok(Math.abs(40 * HUMAN_SCALE - 17.5) < 1e-9, "A unit geometry swap must preserve nominal human height");

const born = Date.parse("2026-10-25T05:00:00Z");
const world = { ...structuredClone(seed), born: new Date(born).toISOString() };
const actor = {
  id: "an", name: "An", position: [75, 100], from: "Sân chung",
  location: "Sân chung", activity: "Nghỉ tay", kind: "social", walking: false,
  progress: 1, source: "routine", path: [[100, 100]],
};
const partner = {
  ...actor, id: "binh", name: "Bình", position: [100, 107],
};
const actorBefore = structuredClone(actor);
const context = { gesture: "open-hand", speaking: true };

// Animation phase belongs to identity, so sorting the visible cast cannot jerk it.
assert.deepEqual(humanPose(actor, 12.3, 0, context), humanPose(actor, 12.3, 70, context));
assert.deepEqual(
  humanPose(actor, 12.3, 0, context),
  humanPose({ ...actor, source: "plan" }, 12.3, 0, context),
  "Visual movement must not manufacture or infer model provenance",
);
assert.notDeepEqual(humanPose(actor, 12.3, 0), humanPose(partner, 12.3, 0));

const states = [
  [actor, undefined],
  [{ ...actor, walking: true, kind: "walk", transport: "walk" }, undefined],
  [{ ...actor, walking: true, transport: "bus" }, undefined],
  [{ ...actor, kind: "read" }, undefined],
  [actor, context],
  [actor, { gesture: "wave", speaking: true }],
  [actor, { gesture: "point", speaking: true }],
  [actor, { gesture: "listen", speaking: false }],
];
let samples = 0;
for (const [resident, social] of states) {
  for (let seconds = 0; seconds < 86_400; seconds += 11.37) {
    const pose = humanPose(resident, seconds, 0, social);
    assert.ok(Object.values(pose).every(Number.isFinite), "Every pose component remains finite across a day");
    assert.ok(pose.blink >= 0.0799 && pose.blink <= 1, "Blink never inverts the face");
    assert.ok(Math.abs(pose.breath) <= 0.120001, "Breathing stays restrained");
    assert.ok(Math.abs(pose.headTilt) < 0.15 && Math.abs(pose.headTurn) < 0.1, "Head gestures stay restrained");
    assert.ok(Math.abs(pose.leftArm) <= 1.3 && Math.abs(pose.rightArm) <= 1.3, "Arms stay within conversational range");
    samples++;
  }
}
for (const seconds of [NaN, Infinity, -Infinity, -1]) {
  assert.ok(Object.values(humanPose(actor, seconds, 0, context)).every(Number.isFinite));
}
assert.deepEqual(actor, actorBefore, "Rendering does not change the actor projection");

// Use the production clock contract: body/eye/gesture animation freezes together.
world.clock = updateClock(world, born + 123_000, { paused: true });
world.paused = true;
const stoppedTime = simulationTime(world, born + 123_000) / 1000;
const stoppedPose = humanPose(actor, stoppedTime, 0, context);
for (const now of [born + 124_000, born + 600_000, born + 86_400_000]) {
  assert.deepEqual(humanPose(actor, simulationTime(world, now) / 1000, 0, context), stoppedPose);
}
world.clock = updateClock(world, born + 600_000, { paused: false });
world.paused = false;
assert.notDeepEqual(humanPose(actor, simulationTime(world, born + 601_000) / 1000, 0, context), stoppedPose);

// Staging and the animation consume provenance; they do not promote rules to AI.
const snapshot = JSON.stringify(world);
for (const source of ["ai", "routine"]) {
  const speech = { speaker: "an", text: "Bình, nghỉ tay một lát nhé.", source, key: "human-visual-source-fixture" };
  // All dialogue here is an isolated test fixture, never a claim of inference.
  const fixture = {
    ...world,
    livingTurn: { residentId: partner.id, title: "Source-labelled test fixture" },
  };
  const fixtureBefore = JSON.stringify(fixture);
  const frame = socialFrame(fixture, [actor, partner], [], born + 601_000, speech);
  assert.equal(frame.exchanges.length, 1);
  assert.equal(frame.exchanges[0].source, source === "ai" ? "ai" : "script");
  assert.equal(frame.poses.get("an").speaking, true);
  assert.equal(frame.poses.get("binh").speaking, false);
  assert.deepEqual(humanPose(actor, stoppedTime, 0, frame.poses.get("an")), humanPose(actor, stoppedTime, 9, frame.poses.get("an")));
  assert.equal(JSON.stringify(fixture), fixtureBefore);
}
assert.equal(JSON.stringify(world), snapshot, "Viewing source-labelled dialogue never changes saved world/history");
for (const geometry of Object.values(geometries)) geometry.dispose();
console.log(JSON.stringify({ suite: "human-visuals", triangles, poseSamples: samples, dimensions: "unit", pause: "frozen", provenance: "preserved" }));
