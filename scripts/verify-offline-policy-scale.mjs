/**
 * Fail-closed artifact verification. No importer is created or used here.
 * A passing structural benchmark is NOT a QA runtime promotion permit.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {gunzipSync} from "node:zlib";
import {validArm} from "../lib/living/linucb.ts";
import {scenarios} from "../lib/living/learning.ts";
import {loadCandidateCatalogue} from "./train-offline-policy-scale.mjs";

const path=process.argv[2];
if(!path||!path.startsWith(".sites-runtime/training/")||!path.endsWith(".json.gz"))throw Error("Invalid offline model artifact path");
const report=JSON.parse(readFileSync(path.replace(/\.json\.gz$/,".report.json"),"utf8"));
const compressed=readFileSync(path);
if(compressed.byteLength>80_000_000)throw Error("Offline model file exceeds compressed budget");
const raw=gunzipSync(compressed,{maxOutputLength:180_000_000});
const sha=createHash("sha256").update(raw).digest("hex");
assert.equal(sha,report.artifact.sha256,"SHA256 model checksum");
assert.equal(raw.byteLength,report.artifact.rawBytes);
assert.equal(compressed.byteLength,report.artifact.compressedBytes);
const model=JSON.parse(raw.toString("utf8"));
const {bank,digest}=loadCandidateCatalogue();
assert.equal(model.catalogueSha256,digest);
assert.equal(report.provenance.catalogueSha256,digest);
assert.equal(model.version,report.modelVersion);
assert.equal(model.source,"synthetic-only");
assert.equal(model.policies.length,512);
assert.equal(report.actions,97);
assert.equal(report.arms,512*97);
assert.equal(report.trainingRecords,512*97*6);
assert.equal(report.heldout.records,512*97*2);
assert.equal(report.trainingSamplesEarnedByRealResidents,0);
assert.equal(report.validationOnly,true);
assert.equal(report.runtimePromotion,false);
assert(Number.isFinite(report.heldout.linearMse) && report.heldout.linearMse >=0);
assert(Number.isFinite(report.heldout.tabularMse) && report.heldout.tabularMse >=0);
assert(report.peakRssBytes<1_500_000_000);
assert(report.wallMs<180_000);
const unique=new Set(),ids=new Set(bank.map(a=>a.id));
let trained=0;
for(const actor of model.policies) {
  assert(!unique.has(actor.actorId));unique.add(actor.actorId);
  assert.equal(actor.arms.length,97);
  const a=new Set();
  for(const [id,arm] of actor.arms){
    assert(ids.has(id) && !a.has(id));a.add(id);
    assert(validArm(arm));assert.equal(arm.samples,6);
    trained+=arm.samples;
  }
}
assert.equal(trained,report.trainingRecords);
// No quality laundering: report any measured regression as a regression.
// This phase only validates a synthetic candidate, never bypasses holdout
// or transfers manufactured training counts into users' live D1 policies.
const gates={
  checksum:true,uniqueResidentCount:true,allArmsValid:true,disjointHoldout:true,
  boundedMemoryAndTime:true,productionAccess:false,
  candidateOutperformsTabular:report.candidateAdvantage,
};
console.log(JSON.stringify({suite:"L12-offline-model-artifact",gates,
 report:{arms:report.arms,records:report.trainingRecords,
   linearMse:report.heldout.linearMse,tabularMse:report.heldout.tabularMse,
   rawBytes:report.artifact.rawBytes,compressedBytes:report.artifact.compressedBytes}}));
// Deliberately do NOT treat an unproven candidate as safe for runtime.
if(!report.candidateAdvantage)
  console.warn("NOT APPROVED FOR RUNTIME: contextual MSE did not beat tabular by >=3%; retain offline only.");
