#!/usr/bin/env node
/**
 * Configure the compiled Vinext Worker for an isolated Cloudflare QA deploy.
 * Run AFTER npm run build, BEFORE wrangler deploy.
 * Never use this for the ChatGPT Sites or staging deployment.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

const location = resolve("dist/server/wrangler.json");
if (!existsSync(location)) throw Error("Vinext build not found; run npm run build first.");
const cfg = JSON.parse(readFileSync(location, "utf8"));

if (!["ai-living-staging", "ai-living-qa"].includes(cfg.name)) throw Error(`Unexpected Vinext source Worker name: ${cfg.name}`);
cfg.name = "ai-living-qa";
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
  throw Error("Unexpected route or cron; QA must be isolated.");
}

// Public identifiers (not credentials). This DB was created for QA and contains
// NO imported ChatGPT Sites production history.
cfg.d1_databases = [{
  binding: "DB",
  database_name: "ai_living_qa",
  database_id: "21347bba-caaf-4ba5-9d80-d849958192d1",
}];

// Only enable workers.dev behind verified Cloudflare Access. Disable Version URLs. Cloudflare Access is enabled for this QA Worker: owner or scoped service token.
// No unauthenticated access is allowed; never remove its Access policy.
cfg.workers_dev = true;
cfg.preview_urls = false;
/**
 * Public Access application audience tag (not a secret). Only the QA Worker
 * may recognize this value, and only from trusted ctx.access rather than
 * user-supplied headers. The Access policy must stay attached to the Worker.
 */
cfg.vars = {
  ...cfg.vars,
  XOM_QA_ACCESS_AUD: "b8469783daed50bde5fa858047ce0c78643c8aa97b3edbc9d4dc8e7941a732f9",
  XOM_QA_HOSTNAME: "ai-living-qa.hoanglonglea1mtl.workers.dev",
  XOM_QA_ACCESS_TEAM_DOMAIN: "super-snow-e21e.cloudflareaccess.com",
};
if (cfg.vars.XOM_OWNER_PRIVATE_ORIGIN || cfg.vars.XOM_ADMIN_USER_ID || cfg.vars.XOM_LOCAL_ADMIN === "true")
  throw Error("Unsafe Sites authorization variables must not be used in QA");

// QA only: capture HTTP statuses and uncaught errors. Do not enable on Sites A.
cfg.observability = { enabled: true, logs: { invocation_logs: true, head_sampling_rate: 1 } };
writeFileSync(location, JSON.stringify(cfg, null, 2) + "\n");
console.log(JSON.stringify({
  worker: cfg.name,
  d1_binding: cfg.d1_databases[0].binding,
  d1_database: cfg.d1_databases[0].database_name,
  workersDevViaAccess: cfg.workers_dev,
  versionUrls: cfg.preview_urls,
  mode: "access-protected-qa-deploy",
}));
