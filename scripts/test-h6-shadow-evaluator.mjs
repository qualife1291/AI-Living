/** H6.1 cryptographic release and decision isolation regression tests.
 * Uses synthetic ephemeral keys; never accesses QA, D1 or any network service.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initializeAgent, chooseScenario, scenarios } from "../lib/living/learning.ts";
import { CATALOG_SIGNATURE, HIERARCHY_CATALOG } from "../lib/living/hierarchical-prior.ts";
import { REWARD_VERSION, FEATURE_VERSION } from "../lib/living/reward-evidence.ts";
import { hashSeed } from "../lib/clock.ts";
import { verifyH6ShadowArtifact, evaluateH6ShadowPair } from "../lib/living/h6-shadow-evaluator.ts";
import { withQaH6Shadow, captureH6ShadowProposal } from "../lib/living/h6-shadow-runtime.ts";
const shadow = JSON.parse(readFileSync(new URL("../data/training/h6-scenario-catalog.json", import.meta.url), "utf8"));
const inactive = JSON.parse(readFileSync(new URL("../data/training/h6-shadow-runtime.json", import.meta.url), "utf8"));
assert.equal(inactive.artifact, null, "Never ship an unreviewed signed model to runtime");
assert.equal(inactive.signature, null);
assert.equal(scenarios.length, 41);
assert.equal(shadow.length, 96);
assert.deepEqual(shadow.slice(0, 41), scenarios);
const diag = Array(21).fill(0);
for (let i = 0; i < 6; i++) diag[i * 6 - i * (i + 1) / 2 + i] = .5;
const arm = { version: 1, samples: 10, inverse: diag, b: [0, 0, 0, 0, 0, 0] };
const prior = {
  version: "hierarchical-linucb-v1", source: "synthetic-H4-training", profile: "ordinary-v1",
  scenarioSignature: hashSeed(JSON.stringify(shadow)), catalogSignature: CATALOG_SIGNATURE,
  rewardVersion: REWARD_VERSION, featureVersion: FEATURE_VERSION, acceptedOutcomes: 100,
  rows: [{ roleKind: null, scenarioId: "rest-home", support: 10, donorActors: 5, donorSeeds: 2, model: arm }],
};
const provenance = { productionAccess: false, generator: "ephemeral-test-fixture" };
const keys = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
const publicKey = Buffer.from(await crypto.subtle.exportKey("raw", keys.publicKey)).toString("base64");
async function sign(newPrior = prior, newProvenance = provenance) {
  const body = JSON.stringify({ prior: newPrior, provenance: newProvenance });
  const sha256 = createHash("sha256").update(body).digest("hex");
  const signature = Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(sha256))).toString("base64");
  return { envelope: { artifact: { prior: newPrior, provenance: newProvenance, sha256 }, signature }, sha256 };
}
const { envelope, sha256 } = await sign();
const verified = await verifyH6ShadowArtifact(envelope, sha256, publicKey);
assert.equal(verified.sha256, sha256);
assert.equal(verified.rows.size, 1);
await assert.rejects(() => verifyH6ShadowArtifact(envelope, "a".repeat(64), publicKey), /pin mismatch/);
await assert.rejects(() => verifyH6ShadowArtifact({ ...envelope, signature: null }, sha256, publicKey), /not configured/);
await assert.rejects(() => verifyH6ShadowArtifact({ ...envelope, signature: Buffer.from("not-a-signature").toString("base64") }, sha256, publicKey));
const mutated = structuredClone(envelope);
mutated.artifact.prior.rows[0].model.b[0] = 99;
await assert.rejects(() => verifyH6ShadowArtifact(mutated, sha256, publicKey), /checksum mismatch/);
const invalidSig = await sign({ ...prior, scenarioSignature: 3 });
await assert.rejects(() => verifyH6ShadowArtifact(invalidSig.envelope, invalidSig.sha256, publicKey), /provenance or scenario signature/);
const invalidCov = await sign({ ...prior, rows: [{ ...prior.rows[0], model: { ...arm, inverse: Array(21).fill(-1) } }] });
await assert.rejects(() => verifyH6ShadowArtifact(invalidCov.envelope, invalidCov.sha256, publicKey), /row rejected/);
const untrusted = await sign(prior, { productionAccess: true });
await assert.rejects(() => verifyH6ShadowArtifact(untrusted.envelope, untrusted.sha256, publicKey), /provenance or scenario signature/);
const actor = initializeAgent("h6-test-actor");
const before = JSON.stringify(actor);
const context = { date: "2026-10-31", hour: 23, weather: { status: "fresh", precipitation: 0 } };
const baseline = chooseScenario(actor, "h6-test-actor", context, HIERARCHY_CATALOG.roles[0].place);
assert.equal(baseline.id, "rest-home");
const paired = evaluateH6ShadowPair({ agent: actor, actorId: "h6-test-actor", context, model: verified,
  rolePlace: HIERARCHY_CATALOG.roles[0].place, roleKind: HIERARCHY_CATALOG.roles[0].kind, observedScenarioId: "rest-home" });
assert.equal(paired.agreement, true);
// A single forced safe action must never be biased by a model prior.
assert.equal(paired.modelUsed, false);
assert.equal(paired.candidateLive, true);
const daylight = { ...context, hour: 10 };
const daylightBaseline = chooseScenario(actor, "h6-test-actor", daylight, HIERARCHY_CATALOG.roles[0].place);
const daytimePair = evaluateH6ShadowPair({ agent: actor, actorId: "h6-test-actor", context: daylight, model: verified,
  rolePlace: HIERARCHY_CATALOG.roles[0].place, roleKind: HIERARCHY_CATALOG.roles[0].kind, observedScenarioId: daylightBaseline.id });
assert.equal(daytimePair.baselineMatchesObserved, true);
assert.equal(daytimePair.modelUsed, true, "Prior should be applied to an eligible daytime candidate");
assert.equal(daytimePair.candidateLive, true);
assert.equal(JSON.stringify(actor), before, "Shadow altered personal learning state");
const mismatched = evaluateH6ShadowPair({ agent: actor, actorId: "h6-test-actor", context, model: verified,
  rolePlace: HIERARCHY_CATALOG.roles[0].place, roleKind: HIERARCHY_CATALOG.roles[0].kind, observedScenarioId: "lunch" });
assert.equal(mismatched.eligible, false);
assert.equal(mismatched.modelUsed, false);
assert.equal(await withQaH6Shadow({}, async () => { captureH6ShadowProposal({agent:actor,actorId:"h6-test-actor",
  context, rolePlace:"Phòng An", roleKind:"rest", baselineScenarioId:"rest-home"});return 41; }), 41);
assert.equal(await withQaH6Shadow({XOM_H6_MODE:"shadow-only",XOM_H6_SHADOW_EVAL_ENABLED:"true"}, async () => 42), 42,
  "An unsigned QA model must not block the original writer");
console.log(JSON.stringify({suite:"h6-shadow-evaluator",pass:true,signedModel:true,liveScenarios:41,
  shadowCandidates:96,unapprovedRuntimeModel:false,baselineMutations:0}));
