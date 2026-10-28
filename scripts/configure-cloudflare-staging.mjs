#!/usr/bin/env node
/**
 * Configure the compiled Vinext Worker for an isolated Cloudflare staging upload.
 * Run AFTER npm run build, BEFORE wrangler versions upload.
 * Never use this for the ChatGPT Sites deployment.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

const location = resolve("dist/server/wrangler.json");
if (!existsSync(location)) throw Error("Vinext build not found; run npm run build first.");
const cfg = JSON.parse(readFileSync(location, "utf8"));

if (cfg.name !== "ai-living-staging") throw Error(`Wrong Worker name: ${cfg.name}`);
if (cfg.main !== "index.js" || !existsSync(resolve(dirname(location), cfg.main))) {
  throw Error("Unexpected/missing Vinext Worker entrypoint.");
}
if (!cfg.assets?.directory || !existsSync(resolve(dirname(location), cfg.assets.directory))) {
  throw Error("Compiled client assets are missing.");
}
if (!cfg.compatibility_flags?.includes("nodejs_compat")) {
  throw Error("Cloudflare nodejs_compat is required.");
}
if (!Array.isArray(cfg.d1_databases) || cfg.d1_databases.length !== 1 ||
    cfg.d1_databases[0]?.binding !== "DB") {
  throw Error("Unexpected D1 binding layout. Refusing to deploy.");
}
if (cfg.route || cfg.routes || cfg.triggers?.crons?.length) {
  throw Error("Unexpected production route or cron; staging must be isolated.");
}

// Public identifiers (not credentials). This DB was created for staging and contains
// NO imported ChatGPT Sites production history.
cfg.d1_databases = [{
  binding: "DB",
  database_name: "ai_living_staging",
  database_id: "a6253e00-4301-4f46-83bd-28af64c5fea4",
}];

// Do not enable public endpoints, including Version URLs. Cloudflare Access is
// NOT enabled yet and the app still uses Sites-specific authentication.
cfg.workers_dev = false;
cfg.preview_urls = false;
writeFileSync(location, JSON.stringify(cfg, null, 2) + "\n");
console.log(JSON.stringify({
  worker: cfg.name,
  d1_binding: cfg.d1_databases[0].binding,
  d1_database: cfg.d1_databases[0].database_name,
  publicRoute: cfg.workers_dev,
  versionUrls: cfg.preview_urls,
  mode: "isolated-version-upload-only",
}));
