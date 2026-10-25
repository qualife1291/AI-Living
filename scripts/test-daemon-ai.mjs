// End-to-end local model + daemon fixture, with no database or production writes.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { initializeLiving } from "../lib/living/engine.ts";
import { proposalSchema } from "../lib/living/schema.ts";
import { seed } from "../lib/world.ts";
const now = Date.parse("2026-10-25T02:00:00Z");
let proposal;
const context = {
  date: "2026-10-25",
  hour: 9,
  weekday: 0,
  timezone: "Asia/Ho_Chi_Minh",
  fetchedAt: new Date(now).toISOString(),
  weather: {
    status: "unavailable",
    source: "test fixture",
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
    source: "test fixture",
    status: "unavailable",
    coverage: "fixture",
  },
  traffic: { status: "unavailable", label: "fixture" },
  festivals: { status: "unavailable", label: "fixture" },
};
const view = {
  serverNow: new Date(now).toISOString(),
  context,
  living: initializeLiving(now),
  world: {
    ...structuredClone(seed),
    born: new Date(now - 86400000).toISOString(),
  },
};
const server = createServer(async (req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.url === "/api/living") {
    res.end(JSON.stringify(view));
    return;
  }
  if (req.url === "/api/living/tick") {
    const chunks = [];
    for await (const b of req) chunks.push(b);
    proposal = JSON.parse(Buffer.concat(chunks).toString()).proposal;
    res.end(
      JSON.stringify({
        ok: true,
        id: "fixture-only",
        generator: proposal ? "local-llm" : "rules",
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end("{}");
});
await new Promise((resolve) => server.listen(5198, "127.0.0.1", resolve));
try {
  const child = spawn(
    process.execPath,
    ["scripts/living-daemon.mjs", "--once"],
    {
      env: { ...process.env, XOM_ORIGIN: "http://127.0.0.1:5198" },
      stdio: "inherit",
    },
  );
  const code = await new Promise((resolve) => child.on("exit", resolve));
  assert.equal(code, 0);
  const valid = proposalSchema.parse(proposal);
  assert.ok(valid.newRole, "daily role expansion must be generated");
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        mode: "fixture only; no DB writes",
        role: valid.newRole,
        dialogue: valid.dialogue,
      },
      null,
      2,
    ),
  );
} finally {
  server.close();
}
