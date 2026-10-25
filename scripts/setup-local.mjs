import { readFileSync, appendFileSync, existsSync } from "node:fs";
import "./sites-env.mjs";
import { spawnSync } from "node:child_process";

function execute(args) {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "dist/server/wrangler.json",
      "--persist-to",
      ".wrangler/state",
      ...args,
    ],
    { encoding: "utf8", env: process.env },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    throw new Error("Local migration failed; existing data was preserved.");
  }
  return result.stdout;
}
const rows = JSON.parse(
  execute([
    "--json",
    "--command",
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('worlds','episodes')",
  ]),
);
const tables = rows[0].results.map((r) => r.name);
if (tables.length === 0) execute(["--file", "drizzle/0000_deep_firebird.sql"]);
else if (tables.length !== 2)
  throw new Error("Partial base schema; inspect and back up before repair.");
execute(["--file", "drizzle/0001_living_world_and_training.sql"]);
execute(["--file", "drizzle/0002_living_context_and_turns.sql"]);
execute(["--file", "drizzle/0003_agent_experiences.sql"]);
execute(["--file", "drizzle/0004_release_schema_reconciliation.sql"]);
console.log(
  "Local D1 schema ready; existing snapshots and episodes preserved.",
);

if (process.env.HTTPS_PROXY) {
  const file = ".dev.vars";
  const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (!/^XOM_CONTEXT_RELAY=/m.test(existing))
    appendFileSync(file, "\nXOM_CONTEXT_RELAY=http://127.0.0.1:8091\n");
}

execute([
  "--command",
  "INSERT OR IGNORE INTO agent_experiences (id,actor_id,created_at,data) SELECT json_extract(value,'$.id'),json_extract(value,'$.actorId'),json_extract(value,'$.at'),value FROM worlds,json_each(worlds.data,'$.living.experiences') WHERE worlds.id='home'",
]);

// Explicit local-only authorization. Worker also requires a loopback URL.
const localVars = existsSync(".dev.vars") ? readFileSync(".dev.vars", "utf8") : "";
if (!/^XOM_LOCAL_ADMIN=/m.test(localVars)) appendFileSync(".dev.vars", "\nXOM_LOCAL_ADMIN=true\n");
