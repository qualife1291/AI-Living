#!/usr/bin/env node
/**
 * Configure the compiled Vinext Worker for an isolated Cloudflare QA deploy.
 * Run AFTER npm run build, BEFORE wrangler deploy.
 * Never use this for the ChatGPT Sites or staging deployment.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { QA_LIVING_CRON } from "../lib/living/qa-scheduler.ts";

// H6 is versioned QA shadow metadata only; the live 41-scenario registry is NOT changed.
const src = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const liveCatalog = JSON.parse(readFileSync(resolve(src, "data/city/scenarios.json"), "utf8"));
const h6CandidateCatalog = JSON.parse(readFileSync(resolve(src, "data/training/h6-scenario-catalog.json"), "utf8"));
if (liveCatalog.length !== 41 || h6CandidateCatalog.length !== 96 ||
    JSON.stringify(h6CandidateCatalog.slice(0, 41)) !== JSON.stringify(liveCatalog))
  throw Error("H6 shadow/live catalog compatibility failed; refusing QA deploy.");
const h6CatalogHash = createHash("sha256").update(JSON.stringify(h6CandidateCatalog)).digest("hex");
const location = resolve("dist/server/wrangler.json");
if (!existsSync(location)) throw Error("Vinext build not found; run npm run build first.");
const cfg = JSON.parse(readFileSync(location, "utf8"));

if (!["site-creator-vinext-starter", "ai-living-staging", "ai-living-qa"].includes(cfg.name)) throw Error(`Unexpected Vinext source Worker name: ${cfg.name}`);
const alreadyQa = cfg.name === "ai-living-qa";
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
const existingCrons = cfg.triggers?.crons ?? [];
if (cfg.route || cfg.routes || existingCrons.length && !(alreadyQa && existingCrons.length === 1 && existingCrons[0] === QA_LIVING_CRON)) {
  throw Error("Unexpected existing route or cron; refusing to overwrite.");
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
// ONE Cron trigger, UTC; app computes its own Asia/Ho_Chi_Minh world time.
cfg.triggers = { crons: [QA_LIVING_CRON] };
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
  XOM_RULE_SCHEDULER: "true",
  XOM_SYSTEM_LOGS: "true",
  XOM_H6_MODE: "shadow-only",
  // Explicitly fail closed on every normal QA deployment. Separate signed promotion
  // and QA rollout authorization are required before any resident treatment.
  XOM_H6_SHADOW_EVAL_ENABLED: "false",
  XOM_H6_CANARY_ENABLED: "false",
  XOM_H6_CANARY_KILL_SWITCH: "true",
  XOM_H6_CANDIDATE_COUNT: "96",
  XOM_H6_CATALOG_SHA256: h6CatalogHash,
};
if (cfg.vars.XOM_OWNER_PRIVATE_ORIGIN || cfg.vars.XOM_ADMIN_USER_ID || cfg.vars.XOM_LOCAL_ADMIN === "true")
  throw Error("Unsafe Sites authorization variables must not be used in QA");

// QA only: capture HTTP statuses and uncaught errors. Do not enable on Sites A.
cfg.observability = { enabled: true, logs: { invocation_logs: true, head_sampling_rate: 1 } };
cfg.version_metadata = { binding: "CF_VERSION_METADATA" };
writeFileSync(location, JSON.stringify(cfg, null, 2) + "\n");
console.log(JSON.stringify({
  worker: cfg.name,
  d1_binding: cfg.d1_databases[0].binding,
  d1_database: cfg.d1_databases[0].database_name,
  workersDevViaAccess: cfg.workers_dev,
  versionUrls: cfg.preview_urls,
  cron: cfg.triggers.crons[0],
  schedulerEnabled: cfg.vars.XOM_RULE_SCHEDULER,
  mode: "access-protected-qa-deploy",
  h6Mode: cfg.vars.XOM_H6_MODE,
  h6Candidates: cfg.vars.XOM_H6_CANDIDATE_COUNT,
  h6CatalogSha256: cfg.vars.XOM_H6_CATALOG_SHA256,
}));
