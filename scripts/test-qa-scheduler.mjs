import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QA_LIVING_CRON, QA_LIVING_HOSTNAME, qaLivingCronEnabled } from "../lib/living/qa-scheduler.ts";
const conf = {
  XOM_RULE_SCHEDULER: "true",
  XOM_QA_HOSTNAME: QA_LIVING_HOSTNAME,
  XOM_QA_ACCESS_AUD: "qa-test-aud",
  XOM_QA_ACCESS_TEAM_DOMAIN: "test.cloudflareaccess.com",
};
assert.equal(QA_LIVING_CRON,"*/5 * * * *");
assert.equal(qaLivingCronEnabled(conf,QA_LIVING_CRON),true);
assert.equal(qaLivingCronEnabled({...conf,XOM_RULE_SCHEDULER:"false"},QA_LIVING_CRON),false);
assert.equal(qaLivingCronEnabled({...conf,XOM_RULE_SCHEDULER:undefined},QA_LIVING_CRON),false);
assert.equal(qaLivingCronEnabled({...conf,XOM_QA_HOSTNAME:"other.workers.dev"},QA_LIVING_CRON),false);
assert.equal(qaLivingCronEnabled({...conf,XOM_QA_ACCESS_AUD:undefined},QA_LIVING_CRON),false);
assert.equal(qaLivingCronEnabled({...conf,XOM_QA_ACCESS_TEAM_DOMAIN:undefined},QA_LIVING_CRON),false);
assert.equal(qaLivingCronEnabled(conf,"* * * * *"),false);
const deploy=readFileSync(new URL("./configure-cloudflare-qa.mjs",import.meta.url),"utf8");
assert.match(deploy,/cfg\.name = "ai-living-qa"/);
assert.match(deploy,/ai_living_qa/);
assert.match(deploy,/cfg\.triggers = \{ crons: \[QA_LIVING_CRON\] \}/);
assert.match(deploy,/XOM_RULE_SCHEDULER: "true"/);
assert.match(deploy,/cfg\.preview_urls = false/);
const entry=readFileSync(new URL("../worker/index.ts",import.meta.url),"utf8");
assert.match(entry,/qaLivingCronEnabled\(settings, event\.cron\)/);
assert.match(entry,/runCoalescedPulse\(env\.DB/);
assert.match(entry,/qa_cron_pulse/);
console.log("PASS: QA Cron is opt-in, QA-only, and shares browser D1 pulse lease.");
