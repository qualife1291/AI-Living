import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN ?? "http://127.0.0.1:5173";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname))
  throw Error("Local integration tests only");
async function read(path = "/api/living") {
  const r = await fetch(origin + path);
  assert.equal(r.status, 200);
  return r.json();
}
const post = async (path, body, headers = {}) => {
  const response = await fetch(origin + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text };
};
let before = await read();
assert.ok(before.living.residents.length >= 24);
assert.equal(before.context.timezone, "Asia/Ho_Chi_Minh");
const replies = await Promise.all(
  Array.from({ length: 8 }, () => post("/api/living/tick", {})),
);
for (const r of replies) assert.equal(r.status, 200, r.body);
const after = await read();
assert.ok(after.revision <= before.revision + 1);
assert.equal(new Set(after.turns.map((t) => t.id)).size, after.turns.length);
assert.equal(
  (await post("/api/living/tick", {}, { origin: "https://evil.invalid" }))
    .status,
  403,
);
assert.equal(
  (await post("/api/living/tick", { proposal: { title: "bad" } })).status,
  400,
);
assert.equal((await post("/api/living/tick", { arbitrary: "x" })).status, 400);
assert.equal(
  (
    await post("/api/living/catalog", {
      revision: after.revision,
      catalog: { ...after.living.catalog, maxPopulation: 50000 },
    })
  ).status,
  400,
);
const saved = await read("/api/living/catalog");
const role = {
  id: "qa-artist",
  label: "Người hướng dẫn vẽ (kiểm thử local)",
  place: "Lớp học cộng đồng",
  kind: "read",
  activity: "Cùng học nét vẽ",
  greeting: "Mình cùng thử nét vẽ này nhé.",
};
const catalog = {
  ...saved.catalog,
  roles: saved.catalog.roles.some((r) => r.id === role.id)
    ? saved.catalog.roles
    : [...saved.catalog.roles, role],
};
assert.equal(
  (await post("/api/living/catalog", { revision: saved.revision, catalog }))
    .status,
  200,
);
assert.ok(
  (await read("/api/living/catalog")).catalog.roles.some(
    (r) => r.id === role.id,
  ),
);
assert.equal(
  (await post("/api/living/catalog", { revision: saved.revision, catalog }))
    .status,
  409,
);
const restored = await read();
for (const original of before.living.residents) {
  const current = restored.living.residents.find((r) => r.id === original.id);
  assert.ok(current);
  assert.deepEqual(current.memories, original.memories);
}
const health = await read("/api/health");
assert.equal(health.ok, true);
console.log(
  "PASS: living readback, eight concurrent idempotent requests, origin/schema checks, catalog extension and persistence, stale revision and resident memory preservation.",
);
