import assert from "node:assert/strict";
import {
  initializeLiving,
  population,
  planLivingTurn,
  localDate,
  turnId,
  crowdAt,
  livingSpeechAt,
} from "../lib/living/engine.ts";
import { catalogSchema, proposalSchema } from "../lib/living/schema.ts";
import { seed } from "../lib/world.ts";
import { realContext, observedWeather } from "../lib/living/realtime.ts";
const now = Date.parse("2026-10-25T02:00:00Z");
const rows = new Map();
let calls = 0;
const cache = {
  read: async (k) => rows.get(k) ?? null,
  write: async (k, data, expires_at) => {
    rows.set(k, { data, expires_at });
  },
};
const fetcher = async (url) => {
  calls++;
  return Response.json(
    String(url).includes("visithcmc")
      ? { items: [], unparsed: 0 }
      : String(url).includes("open-meteo")
        ? {
            current: {
              time: "2026-10-25T09:00",
              temperature_2m: 29,
              relative_humidity_2m: 80,
              precipitation: 2,
              weather_code: 63,
              wind_speed_10m: 10,
            },
          }
        : [
            {
              date: "2026-10-25",
              localName: "Test fixture holiday",
              global: true,
              types: ["Public"],
            },
          ],
  );
};
let context = await realContext(now, cache, fetcher);
assert.equal(context.date, "2026-10-25");
assert.equal(context.hour, 9);
assert.equal(context.calendar.weekend, true);
assert.equal(context.weather.status, "fresh");
assert.equal(observedWeather(context).kind, "rain");
assert.equal(context.traffic.status, "unavailable");
await realContext(now + 1000, cache, fetcher);
assert.equal(calls, 3, "cache must prevent extra provider requests");
const failed = async () => {
  throw Error("offline");
};
context = await realContext(now + 2 * 3600000, cache, failed);
assert.equal(context.weather.status, "stale");
assert.equal(
  observedWeather(context),
  null,
  "Stale data must not become live weather",
);
context = await realContext(now + 3 * 86400000, cache, failed);
assert.equal(context.weather.status, "unavailable");
assert.equal(localDate(Date.parse("2026-10-24T17:00:00Z")), "2026-10-25");
const state = initializeLiving(now);
assert.equal(state.residents.length, 24);
state.residents[0].memories.push("Một ký ức có thật trong fixture");
const expanded = population(state, "2026-12-25");
assert.ok(expanded.length > 24 && expanded.length <= 240);
assert.equal(expanded[0].id, state.residents[0].id);
assert.equal(expanded[0].memories[0], state.residents[0].memories[0]);
assert.equal(population(state, "2030-01-01").length, 240);
state.catalog.roles.push({
  ...state.catalog.roles[0],
  id: "new-art-role",
  label: "Người dạy vẽ",
});
assert.ok(
  population(state, "2026-10-25").some((r) => r.roleId === "new-art-role"),
);
assert.equal(
  catalogSchema.safeParse({ ...state.catalog, maxPopulation: 99999 }).success,
  false,
);
assert.equal(
  catalogSchema.safeParse({
    ...state.catalog,
    roles: [...state.catalog.roles, state.catalog.roles[0]],
  }).success,
  false,
);
const world = {
  ...structuredClone(seed),
  born: "2026-10-24T00:00:00Z",
  living: state,
};
context = await realContext(now, cache, fetcher);
const before = JSON.stringify(world);
const result = planLivingTurn(world, context, now);
assert.equal(JSON.stringify(world), before, "planner must not mutate source");
assert.equal(result.turn.generator, "rules");
assert.equal(result.turn.context.traffic.status, "unavailable");
assert.equal(
  result.world.people[0].money,
  world.people[0].money,
  "Plans cannot award unearned money",
);
assert.equal(
  result.world.people[0].memories.length,
  world.people[0].memories.length,
  "Plans do not create completed memories",
);
assert.equal(result.turn.id, turnId(now));
assert.ok(result.state.energy >= 0 && result.state.energy <= 100);
for (const actor of crowdAt(result.state, result.world, now))
  assert.ok(actor.position.every(Number.isFinite));
const paused = {
  ...result.world,
  paused: true,
  clock: { pausedAt: now, pausedMs: 0 },
};
assert.deepEqual(
  crowdAt(result.state, paused, now),
  crowdAt(result.state, paused, now + 10000),
);
const night = planLivingTurn(world, { ...context, hour: 23 }, now);
assert.equal(night.turn.location, "Phòng An");
assert.equal(night.turn.dialogue.length, 0);
assert.equal(
  proposalSchema.safeParse({
    title: "A",
    summary: "B",
    dialogue: [{ speaker: "an", text: "Hi" }],
  }).success,
  false,
);
console.log(
  "PASS: real-time provenance/cache/staleness/outages, Vietnam day boundary, stable growing population/caps, data-driven role expansion, pure planning, no unearned rewards, bounded needs, paused crowd and night rest.",
);

// A generated encounter is physically projected before any speech is emitted.
assert.equal(livingSpeechAt(result.world, now), null);
assert.equal(livingSpeechAt(result.world, now + 120000)?.speaker, "an");
assert.equal(
  livingSpeechAt(result.world, now + 127000)?.speaker,
  result.turn.residentId,
);
const peerBefore = crowdAt(result.state, world, now).find(
  (a) => a.id === result.turn.residentId,
);
const peerAfter = crowdAt(result.state, result.world, now).find(
  (a) => a.id === result.turn.residentId,
);
assert.ok(
  Math.hypot(
    peerBefore.position[0] - peerAfter.position[0],
    peerBefore.position[1] - peerAfter.position[1],
  ) < 0.001,
);
console.log(
  "PASS: NPC encounter continuity, co-location and timed two-way speech.",
);

// New roles participate in the planner without adding any activity-specific code.
let metNewRole = false;
for (let day = 0; day < 20; day++)
  for (let hour = 6; hour < 22; hour += 0.25) {
    const t = now + day * 86400000 + hour * 3600000;
    const ctx = {
      ...context,
      date: localDate(t),
      hour,
      weekday: 2,
      fetchedAt: new Date(t).toISOString(),
      weather: { ...context.weather, precipitation: 0 },
      calendar: { ...context.calendar, weekend: false, holidays: [] },
    };
    const plan = planLivingTurn(world, ctx, t);
    const person = plan.state.residents.find(
      (r) => r.id === plan.turn.residentId,
    );
    if (person.roleId === "new-art-role") metNewRole = true;
  }
assert.ok(metNewRole, "Data-added roles must be selected for real encounters");
const clear = {
  ...context,
  weather: { ...context.weather, precipitation: 0 },
  calendar: { ...context.calendar, weekend: false, holidays: [] },
};
const tired = {
  ...structuredClone(world),
  living: {
    ...structuredClone(state),
    energy: 10,
    lastTickAt: new Date(now).toISOString(),
  },
};
assert.equal(planLivingTurn(tired, clear, now).turn.location, "Phòng khám");
const hungry = {
  ...structuredClone(world),
  living: {
    ...structuredClone(state),
    hunger: 90,
    lastTickAt: new Date(now).toISOString(),
  },
};
assert.equal(planLivingTurn(hungry, clear, now).turn.kind, "eat");
console.log("PASS: new-role encounters, rest/health and meal priorities.");
