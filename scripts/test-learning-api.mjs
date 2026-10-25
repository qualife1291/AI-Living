import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN;
if (
  !origin ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)
)
  throw Error("Set TEST_ORIGIN to an isolated local fixture server");
const read = async (path) => {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200);
  return response.json();
};
const post = async () => {
  const response = await fetch(origin + "/api/living/learning", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const data = await response.json();
  return { status: response.status, data };
};
const before = await read("/api/living/learning");
assert.equal(
  Object.values(before.models).reduce((sum, a) => sum + a.samples, 0),
  0,
  "Use a fresh fixture, not a real world",
);
const replies = await Promise.all(Array.from({ length: 8 }, () => post()));
assert.ok(replies.every((r) => [200, 409].includes(r.status)));
const after = await read("/api/living/learning");
const samples = Object.values(after.models).reduce(
  (sum, a) => sum + a.samples,
  0,
);
assert.ok(samples > 0);
assert.ok(
  Object.values(after.animalModels).reduce((sum, a) => sum + a.samples, 0) > 0,
);
const again = await post();
assert.equal(again.status, 200);
assert.equal(again.data.updated, 0);
const stable = await read("/api/living/learning");
assert.equal(
  Object.values(stable.models).reduce((sum, a) => sum + a.samples, 0),
  samples,
);
let cursor = 0,
  records = [];
for (;;) {
  const response = await fetch(
    `${origin}/api/living/learning?format=jsonl&limit=2&after=${cursor}`,
  );
  assert.equal(response.status, 200);
  const text = await response.text();
  if (!text.trim()) break;
  records.push(
    ...text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line)),
  );
  const next = Number(response.headers.get("X-Next-Cursor"));
  assert.ok(next > cursor);
  cursor = next;
}
assert.equal(records.length, samples);
assert.equal(new Set(records.map((r) => r.id)).size, records.length);
assert.ok(records.every((r) => r.source === "simulation"));
assert.equal(
  (await fetch(origin + "/api/living/learning?format=jsonl&limit=1000000"))
    .status,
  400,
);
assert.equal(
  (
    await fetch(origin + "/api/living/learning", {
      method: "POST",
      headers: { origin: "https://evil.invalid" },
    })
  ).status,
  403,
);
console.log(
  "PASS: eight concurrent learning requests, one set of outcomes, model readback, animal training, idempotent retries, atomic dataset retention, cursor pagination, source labels and invalid/origin guards.",
);
