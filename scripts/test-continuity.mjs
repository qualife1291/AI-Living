import assert from "node:assert/strict";
import { seed } from "../lib/world.ts";
import { computeSimMs, updateClock } from "../lib/clock.ts";
import { actorsAt, distance } from "../lib/life.ts";
import { applyEventToWorld } from "../lib/apply-event.ts";
import { speechAt } from "../lib/speech.ts";

const born = Date.parse("2026-10-24T00:00:00Z");
const world = { ...structuredClone(seed), born: new Date(born).toISOString() };
let w = structuredClone(world);
const before = computeSimMs(w.born, w.clock, born + 100_000);
w.clock = updateClock(w, born + 100_000, { speedScale: 10 });
assert.equal(computeSimMs(w.born, w.clock, born + 100_000), before);
assert.equal(computeSimMs(w.born, w.clock, born + 101_000), before + 10_000);
w.clock = updateClock(w, born + 101_000, { paused: true });
w.paused = true;
assert.equal(computeSimMs(w.born, w.clock, born + 500_000), before + 10_000);
w.clock = updateClock(w, born + 200_000, { speedScale: 2 });
assert.equal(computeSimMs(w.born, w.clock, born + 500_000), before + 10_000);
w.clock = updateClock(w, born + 500_000, { paused: false });
w.paused = false;
assert.equal(computeSimMs(w.born, w.clock, born + 501_000), before + 12_000);
assert.equal(computeSimMs("1970-01-01T00:00:00Z", undefined, 1000), 1000);

// Interrupt at many points along the graph, including an already active plan.
for (let seconds = 1; seconds < 700; seconds += 7) {
  const now = born + seconds * 1000;
  const input = {
    id: "continuity",
    revision: 0,
    source: "ai",
    title: "Ghé thư viện",
    summary: "Đọc sách",
    dialogue: [{ speaker: "an", text: "Mình đọc một lát nhé.", atSecond: 30 }],
    changes: world.people.map((p) => ({
      id: p.id,
      moneyDelta: 0,
      energyDelta: 0,
      hungerDelta: 0,
      skillDelta: 0,
      activity: "Đọc sách",
      location: "Thư viện",
      memory: "Hẹn đọc sách",
      plan: [
        {
          location: "Thư viện",
          activity: "Đọc sách",
          kind: "read",
          duration: 100,
        },
      ],
    })),
  };
  const result = applyEventToWorld(world, 0, input, now);
  assert.equal(result.ok, true);
  const oldActors = actorsAt(world, now),
    newActors = actorsAt(result.world, now);
  for (let i = 0; i < 3; i++)
    assert.ok(
      distance(oldActors[i].position, newActors[i].position) < 0.001,
      "Plan must start at exact current coordinates",
    );
  const again = applyEventToWorld(result.world, 0, input, now + 1000);
  for (let i = 0; i < 3; i++)
    assert.ok(
      distance(
        actorsAt(result.world, now + 1000)[i].position,
        actorsAt(again.world, now + 1000)[i].position,
      ) < 0.001,
    );
}
// New plans and dialogue share the accelerated clock and survive pause/resume.
const result = applyEventToWorld(
  world,
  0,
  {
    revision: 0,
    source: "ai",
    title: "Chào",
    summary: "Chào",
    dialogue: [{ speaker: "an", text: "Chào!", atSecond: 30 }],
    changes: [
      {
        id: "an",
        moneyDelta: 0,
        energyDelta: 0,
        hungerDelta: 0,
        skillDelta: 0,
        activity: "Đọc",
        location: "Thư viện",
        memory: "Đọc",
        plan: [
          {
            location: "Thư viện",
            activity: "Đọc",
            kind: "read",
            duration: 100,
          },
        ],
      },
    ],
  },
  born,
);
w = result.world;
w.clock = updateClock(w, born, { speedScale: 10 });
assert.equal(actorsAt(w, born + 9000)[0].source, "plan");
assert.equal(actorsAt(w, born + 11000)[0].source, "routine");
const event = {
  id: "speech",
  source: "ai",
  createdAt: world.born,
  simStartedAt: 0,
  dialogue: [{ speaker: "an", text: "Chào!", atSecond: 30 }],
};
const stationary = actorsAt(w, born + 3000).map((a) => ({
  ...a,
  walking: false,
}));
assert.equal(speechAt(w, stationary, [event], born + 3000)?.source, "ai");
w.clock = updateClock(w, born + 3000, { paused: true });
w.paused = true;
assert.equal(speechAt(w, stationary, [event], born + 90000)?.source, "ai");
w.clock = updateClock(w, born + 90000, { paused: false });
w.paused = false;
assert.equal(speechAt(w, stationary, [event], born + 90000)?.source, "ai");
console.log(
  "PASS: speed continuity, pause/resume at speed, epoch zero, exact plan interruption (100 positions × 3 actors), repeated interruption, plan and speech clock alignment.",
);
