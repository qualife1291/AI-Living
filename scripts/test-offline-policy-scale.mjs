import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {scenarioSchema,scenarios,OUTCOME_SCENARIO_SIGNATURE,initializeAgent,availableScenarios,chooseScenario} from "../lib/living/learning.ts";
import {loadCandidateCatalogue,fitSyntheticBank} from "./train-offline-policy-scale.mjs";
const frozen=JSON.stringify(scenarios),signature=OUTCOME_SCENARIO_SIGNATURE;
const {bank,source,digest}=loadCandidateCatalogue();
assert.equal(scenarios.length,41);
assert.equal(bank.length,97);
assert.equal(source.scenarios.length,56);
assert.equal(digest.length,64);
for(const [i,s] of bank.entries()){
 assert.deepEqual(scenarioSchema.parse(s),s);
 assert.equal(s.id.toLowerCase(),s.id);
 assert(s.title.length>5);
 assert(s.energy>=-20&&s.energy<=20);
 assert(s.hunger>=-30&&s.hunger<=20);
 assert(s.skill<=3);
 if(i>=41)assert(s.skillDomain,"candidate should have domain");
}
assert.equal(new Set(bank.map(s=>s.id)).size,97);
assert.equal(new Set(bank.map(s=>s.skillDomain)).size,9); // 8 domains plus undefined
// Rejected boundary: Zod action cap is 100; 101 cannot slip through schema.
import {z} from "zod";
assert.doesNotThrow(()=>z.array(scenarioSchema).max(100).parse(bank));
assert.throws(()=>z.array(scenarioSchema).max(100).parse([...bank,...bank.slice(0,4)]),/Too big|too_big|100/);
const agent=initializeAgent("candidate-boundary");
const context={hour:9,weather:{status:"unavailable",precipitation:null}};
const before=availableScenarios(agent,context).map(s=>s.id);
assert.equal(before.length>0,true);
assert.deepEqual(availableScenarios(agent,context).map(s=>s.id),before);
assert(before.every(id=>scenarios.some(s=>s.id===id)));
assert.equal(JSON.stringify(scenarios),frozen,"frozen runtime catalogue must not change");
assert.equal(OUTCOME_SCENARIO_SIGNATURE,signature,"reward fingerprint unchanged");
const small=fitSyntheticBank({residents:3,trainPerAction:3,holdoutPerAction:2,serialize:false}).metrics;
const repeat=fitSyntheticBank({residents:3,trainPerAction:3,holdoutPerAction:2,serialize:false}).metrics;
assert.equal(small.arms,3*97);
assert.equal(small.trainingRecords,3*97*3);
assert.equal(small.heldout.records,3*97*2);
assert.deepEqual(small.heldout,repeat.heldout);
assert(small.peakRssBytes<1_500_000_000);
assert.throws(()=>fitSyntheticBank({residents:2049}),/bounded/);
assert.throws(()=>fitSyntheticBank({trainPerAction:17}),/bounded/);
assert.throws(()=>fitSyntheticBank({holdoutPerAction:9}),/bounded/);
console.log(JSON.stringify({suite:"L12-candidate-catalogue",runtimeActions:scenarios.length,
 candidateActions:source.scenarios.length,offlineArms:bank.length,
 stressBoundary:2048,holdoutRecords:small.heldout.records,productionAccess:false}));
