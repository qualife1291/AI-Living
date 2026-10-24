import assert from "node:assert/strict";
import { actorsAt, distance } from "../lib/life.ts";
import { seed } from "../lib/world.ts";
import { dailyRoutine, routineAfterPlan } from "../lib/daily-routines.ts";
import { applyEventToWorld } from "../lib/apply-event.ts";
const born = Date.parse("2026-10-23T17:00:00Z"); // midnight Vietnam
const world = { ...structuredClone(seed), born: new Date(born).toISOString() };
for (const p of world.people) {
  assert.equal(
    dailyRoutine(p.id).reduce((sum, s) => sum + s.duration, 0),
    86400,
  );
  for (const second of [0, 1, 3600, 28799, 28800, 86399])
    assert.equal(
      routineAfterPlan(p.id, second).reduce((sum, s) => sum + s.duration, 0),
      86400,
    );
}
for (const hour of [0, 2, 4, 23])
  for (const a of actorsAt(world, born + hour * 3600000 + 60000)) {
    assert.equal(a.kind, "rest");
    assert.equal(a.walking, false);
    assert.match(a.location, /^Phòng /);
  }
for (const a of actorsAt(world, born + 8.5 * 3600000))
  assert.notEqual(a.kind, "rest");
for (const a of actorsAt(world, born + 12.5 * 3600000))
  assert.equal(a.kind, "rest");
// Every schedule edge, including midnight, remains continuous across viewers.
for (let second = 0; second < 86400; second++) {
  const aa = actorsAt(world, born + second * 1000),
    bb = actorsAt(world, born + (second + 1) * 1000);
  for (let i = 0; i < 3; i++)
    assert.ok(
      distance(aa[i].position, bb[i].position) < 30,
      "Daily boundary teleport",
    );
}
const now = born + 15 * 3600000;
const out = applyEventToWorld(
  world,
  0,
  {
    revision: 0,
    source: "ai",
    title: "Đọc sách",
    summary: "Đọc",
    dialogue: [],
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
  now,
);
const a = actorsAt(out.world, now + 99999)[0],
  b = actorsAt(out.world, now + 100000)[0];
assert.ok(
  distance(a.position, b.position) < 0.001,
  "Expired plan must return continuously to daily schedule",
);
console.log(
  "PASS: complete daily schedules, night and noon rest, daytime work, 86,400 daily boundaries × 3 residents, continuous AI-plan expiry.",
);
