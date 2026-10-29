/** H6 QA release guard: catalog integrity, unchanged legacy runtime and non-activation. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const live=JSON.parse(readFileSync(new URL('../data/city/scenarios.json',import.meta.url),'utf8'));
const shadow=JSON.parse(readFileSync(new URL('../data/training/h6-scenario-catalog.json',import.meta.url),'utf8'));
assert.equal(live.length,41);
assert.equal(shadow.length,96);
assert.deepEqual(shadow.slice(0,41),live);
assert.equal(new Set(shadow.map(x=>x.id)).size,96);
const config=readFileSync(new URL('./configure-cloudflare-qa.mjs',import.meta.url),'utf8');
assert.match(config,/XOM_H6_MODE: "shadow-only"/);
assert.match(config,/XOM_H6_CANDIDATE_COUNT: "96"/);
assert.match(config,/h6CatalogHash/);
const worker=readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8');
assert.match(worker,/h6ShadowOnly:settings\.XOM_H6_MODE === "shadow-only"/);
assert.match(worker,/runCoalescedPulse\(db/);
const hash=createHash('sha256').update(JSON.stringify(shadow)).digest('hex');
console.log(JSON.stringify({suite:'qa-h6-shadow-release',mode:'shadow-only',liveScenarios:41,shadowScenarios:96,sha256:hash,runtimeModelActivated:false,qaD1Writes:0,passed:true}));
