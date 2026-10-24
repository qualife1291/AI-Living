import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN || "http://localhost:4173";
if (
  !["localhost", "127.0.0.1", "[::1]", "terminal.local"].includes(
    new URL(origin).hostname,
  ) &&
  process.env.ALLOW_REMOTE_TEST_WRITES !== "1"
)
  throw Error(
    "Remote test writes disabled. Use an isolated local test database.",
  );
async function read() {
  const r = await fetch(origin + "/api/world");
  assert.equal(r.status, 200);
  return r.json();
}
async function post(path, data) {
  return fetch(origin + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
}
let s = await read();
if (s.world.paused) {
  await post("/api/world", { revision: s.revision, paused: false });
  s = await read();
}
const event = {
  id: "test-" + Date.now(),
  revision: s.revision,
  source: "opening",
  title: "Bữa cơm đầu tiên",
  summary:
    "Chi rủ hai người bạn nấu bữa cơm chung. Bình đề nghị ghi rõ tiền chợ, An nhận phần rửa bát.",
  dialogue: [
    {
      speaker: "chi",
      text: "Tối nay mình nấu chung nhé? Có rau húng quế mình vừa trồng.",
    },
    {
      speaker: "binh",
      text: "Được đó. Mình ghi tiền chợ để cả ba cùng biết nhé.",
    },
    {
      speaker: "an",
      text: "Mình rửa bát! Với lại… cho mình thử công thức trà húng quế được không?",
    },
  ],
  changes: [
    {
      id: "chi",
      moneyDelta: -10000,
      energyDelta: -5,
      hungerDelta: -10,
      skillDelta: 1,
      activity: "Chuẩn bị cơm tối",
      location: "Bếp chung",
      memory: "An nhận rửa bát, Bình sẽ ghi chi phí bữa cơm chung.",
    },
  ],
  relationship: {
    a: "an",
    b: "chi",
    delta: 2,
    note: "Bắt đầu chia sẻ việc bếp",
  },
};
assert.equal((await post("/api/events", event)).status, 200);
const after = await read();
assert.equal(after.revision, s.revision + 1);
assert.equal(after.world.people[2].money, s.world.people[2].money - 10000);
assert.equal((await post("/api/events", event)).status, 200);
assert.equal((await read()).revision, after.revision);
assert.equal(
  (await post("/api/events", { ...event, id: event.id + "stale" })).status,
  409,
);
assert.equal(
  (
    await post("/api/events", {
      ...event,
      id: event.id + "bad",
      revision: after.revision,
      changes: [{ ...event.changes[0], moneyDelta: -999999 }],
    })
  ).status,
  400,
);
assert.equal(
  (await post("/api/world", { revision: after.revision, paused: true })).status,
  200,
);
const paused = await read();
assert.equal(
  (
    await post("/api/events", {
      ...event,
      id: event.id + "paused",
      revision: paused.revision,
    })
  ).status,
  409,
);
assert.equal(
  (await post("/api/world", { revision: paused.revision, paused: false }))
    .status,
  200,
);
const cross = await fetch(origin + "/api/world", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: "https://example.invalid",
  },
  body: JSON.stringify({ revision: 0, paused: true }),
});
assert.equal(cross.status, 403);
console.log(
  "PASS: persistence, bounded effects, idempotency, stale revision, pause/resume, origin guard.",
);

// Controls are validated before any database update.
for (const invalid of [
  null,
  [],
  { revision: 0, speedScale: 0 },
  { revision: 0, speedScale: 61 },
  { revision: 0, speedScale: "10" },
  { revision: 0, weatherOverride: "storm" },
  { revision: 0, paused: "false" },
]) {
  assert.equal((await post("/api/world", invalid)).status, 400);
}
s = await read();
const beforeClock = s.world.clock;
assert.equal(
  (await post("/api/world", { revision: s.revision, speedScale: 5 })).status,
  200,
);
let accelerated = await read();
assert.ok(
  Math.abs(accelerated.worldTime.simMs - s.worldTime.simMs) < 2000,
  "Speed change must preserve current simulated time",
);
assert.equal(
  (
    await post("/api/world", {
      revision: accelerated.revision,
      speedScale: beforeClock?.scale ?? 1,
    })
  ).status,
  200,
);
console.log(
  "PASS: invalid control payloads rejected; speed control preserves simulated time.",
);
