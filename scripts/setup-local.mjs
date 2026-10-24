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
console.log(
  "Local D1 schema ready; existing snapshots and episodes preserved.",
);
