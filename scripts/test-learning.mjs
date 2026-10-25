import assert from "node:assert/strict";
import {
  initializeAgent,
  fitAction,
  chooseScenario,
  settleLearning,
  scenarios,
  cohortIds,
} from "../lib/living/learning.ts";
import { initializeLiving, planLivingTurn } from "../lib/living/engine.ts";
import { seed } from "../lib/world.ts";
import { actorsAt, animalsAt, distance } from "../lib/life.ts";
const now = Date.parse("2026-10-25T02:00:00Z");
const context = {
  date: "2026-10-25",
  hour: 9,
  weekday: 0,
  timezone: "Asia/Ho_Chi_Minh",
  fetchedAt: new Date(now).toISOString(),
  weather: {
    status: "unavailable",
    source: "fixture",
    observedAt: null,
    temperature: null,
    humidity: null,
    precipitation: null,
    code: null,
    windKph: null,
  },
  calendar: {
    weekend: true,
    holidays: [],
    source: "fixture",
    status: "unavailable",
    coverage: "fixture",
  },
  traffic: { status: "unavailable", label: "fixture" },
  festivals: { status: "unavailable", label: "fixture" },
};
const a = initializeAgent("a"),
  b = initializeAgent("b");
for (const scenario of scenarios)
  for (let i = 0; i < 10; i++)
    fitAction(
      a,
      scenario.id,
      scenario.id === "learn-trade" ? 1 : -0.8,
      new Date(now).toISOString(),
    );
assert.equal(chooseScenario(a, "a", context).id, "learn-trade");
assert.equal(b.samples, 0);
assert.deepEqual(b.actions, {});
const samples = a.samples;
a.pending = {
  id: "p1",
  scenarioId: "minor-injury",
  startedSimMs: 0,
  durationMs: 180000,
  completed: false,
};
assert.equal(settleLearning(a, 1000, new Date(now).toISOString(), true), false);
assert.equal(a.samples, samples);
assert.equal(
  settleLearning(a, 180000, new Date(now).toISOString(), true),
  true,
);
assert.equal(a.health, 92);
assert.ok(a.lastReward < 0);
assert.equal(
  settleLearning(a, 360000, new Date(now).toISOString(), true),
  false,
);
assert.equal(a.samples, samples + 1);
a.pending = {
  id: "cancelled",
  scenarioId: "learn-trade",
  startedSimMs: 0,
  durationMs: 180000,
  completed: false,
};
assert.equal(
  settleLearning(a, 180000, new Date(now).toISOString(), false),
  false,
);
assert.equal(a.samples, samples + 1);
a.pending = {
  id: "restore",
  scenarioId: "rehabilitate",
  startedSimMs: 0,
  durationMs: 180000,
  completed: false,
};
settleLearning(a, 180000, new Date(now).toISOString(), true);
assert.equal(a.health, 100);
a.pending = {
  id: "career",
  scenarioId: "job-change",
  startedSimMs: 0,
  durationMs: 180000,
  completed: false,
};
settleLearning(a, 180000, new Date(now).toISOString(), true);
assert.equal(a.employment, "seeking");
assert.equal(chooseScenario(a, "a", context).id, "job-search");
const state = initializeLiving(now);
const coverage = new Set();
for (let slot = 0; slot < Math.ceil(state.residents.length / 12); slot++)
  for (const id of cohortIds(state, slot)) coverage.add(id);
assert.equal(coverage.size, state.residents.length);
let world = {
  ...structuredClone(seed),
  born: new Date(now - 86400000).toISOString(),
  living: state,
};
const initialPeople = world.people.map((p) => p.id);
const initialNpcs = state.residents.map((p) => p.id);
for (let step = 0; step < 8; step++) {
  const t = now + step * 900000,
    old = world;
  const result = planLivingTurn(
    world,
    { ...context, hour: 9 + step * 0.25, fetchedAt: new Date(t).toISOString() },
    t,
  );
  world = result.world;
  if (step === 0)
    for (const oldAnimal of animalsAt(old, t)) {
      const current = animalsAt(world, t).find((x) => x.id === oldAnimal.id);
      assert.ok(
        distance(oldAnimal.position, current.position) < 0.001,
        "Animal plan must start at exact previous location",
      );
    }
  for (const actor of actorsAt(world, t))
    assert.ok(actor.position.every(Number.isFinite));
}
for (const id of [...initialPeople, ...initialNpcs]) {
  assert.ok(
    world.living.learning[id].samples > 0,
    `${id} must learn from completed plans`,
  );
  assert.ok(
    world.living.learning[id].energy >= 0 &&
      world.living.learning[id].energy <= 100,
  );
}
for (const id of ["muop", "cun", "se"])
  assert.ok(
    world.living.animalLearning[id].samples > 0,
    `${id} animal policy must train`,
  );
assert.ok(
  world.living.experiences.length > 0 && world.living.experiences.length <= 200,
);
assert.equal(
  new Set(world.living.experiences.map((e) => e.id)).size,
  world.living.experiences.length,
);
assert.ok(
  world.living.experiences.every(
    (e) => e.source === "simulation" && e.reward >= -1 && e.reward <= 1,
  ),
);
const wet = planLivingTurn(
  world,
  {
    ...context,
    weather: { ...context.weather, status: "fresh", precipitation: 4 },
  },
  now + 9 * 900000,
);
for (const policy of Object.values(wet.state.animalLearning))
  assert.equal(policy.pending.action, "shelter");
console.log(
  "PASS: per-character fitted action values change choices; model isolation; no premature/double/cancelled learning; bounded injury/recovery and job transitions; full cohort coverage; all humans and animals train over eight completed slots; exact animal continuity, rain shelter and provenance-labelled experience export.",
);

for(const original of seed.people)assert.ok(world.living.learning[original.id].skill>=original.skill,"Existing character skills must be retained when introducing a learned policy");
