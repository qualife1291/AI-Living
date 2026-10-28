import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {learningFingerprint,outcomeFixtures,fixtureContext} from './learning-fixtures.mjs';
import {applyScenarioOutcome,expectedReward,availableScenarios,advanceNeeds,
 initializeAgent,scenarios,settleLearning,chooseScenario} from '../lib/living/learning.ts';
import {runLearningRollout,compareLearningRollouts,oracleReward,competenceDay,normalizedEntropy,summarize} from '../lib/living/sim-harness.ts';
const begin=performance.now();
const {reference_source,fixture,...golden}=JSON.parse(readFileSync('docs/validation/learning-golden.json'));
assert.equal(reference_source,'1fd62b7f1ac13cbf7594377ea2c65a509ccd4e56');
assert.equal(fixture,'boundary-grid-v1');
assert.deepEqual(learningFingerprint(),golden,'The runtime must match fingerprints captured BEFORE the refactor');
for(const {agent,scenario} of outcomeFixtures()) {
 const before=JSON.stringify(agent),outcome=applyScenarioOutcome(agent,scenario);
 assert.equal(JSON.stringify(agent),before,'Expected reward must not mutate data/models/pending');
 assert(outcome.reward>=-1&&outcome.reward<=1);
 const clone=structuredClone(agent);assert(settleLearning(clone,180000,'2026-10-28T02:00:00.000Z',true));
 assert.equal(expectedReward(agent,scenario),clone.lastReward);
 for(const key of ['energy','hunger','health','skill','employment','citations'])assert.equal(outcome.after[key],clone[key]);
}
const base=initializeAgent('oracle-fixture');base.needsUpdatedSimMs=0;
for(const [changes,context,only] of [
 [{hunger:100},fixtureContext(0),'rest-home'],[{energy:19,hunger:100},fixtureContext(),'rest-home'],
 [{health:64,hunger:100},fixtureContext(),'rehabilitate'],[{hunger:73},fixtureContext(),'lunch'],
 [{employment:'seeking'},fixtureContext(),'job-search'],
]) {
 const agent={...base,...changes},before=JSON.stringify(agent);
 assert.deepEqual(availableScenarios(agent,context).map(s=>s.id),[only]);
 const projected={...agent};advanceNeeds(projected,'oracle-fixture',180000,context.hour<6||context.hour>=22);
 assert.equal(oracleReward(agent,'oracle-fixture',context,0),expectedReward(projected,scenarios.find(s=>s.id===only)));
 assert.equal(JSON.stringify(agent),before,'Oracle must not update the policy');
}
const rainy=availableScenarios(base,fixtureContext(9,true));
assert(rainy.every(s=>!['sport','ecology'].includes(s.tag)&&!['minor-injury','traffic-check','job-change'].includes(s.id)));
assert(!rainy.some(s=>s.minDomainSkill>0),'Oracle cannot invent practice to bypass gates');
assert.equal(competenceDay([1,1,1]),3);assert.equal(competenceDay([0,0,0]),null);
assert.equal(competenceDay([1,1,1,0,0,0],3),null,'Pre-shift competence cannot count as post-shift recovery');
assert.equal(normalizedEntropy([24,...Array(40).fill(0)]),0);
assert(Math.abs(normalizedEntropy(Array(41).fill(1))-1)<1e-12);
assert.equal(summarize([]),null);assert.equal(summarize([4]).ci95,null);
assert.equal(summarize(Array(20).fill(1)).ci95[0],1);
const stats=summarize([1,2,3,4,5]);assert.equal(stats.mean,3);
assert(Math.abs(stats.ci95[0]-(3-2.776*Math.sqrt(.5)))<1e-12);
const config={policy:'linucb',agents:2,days:4,seeds:[11,37],shiftDay:2};
const first=runLearningRollout(config);assert.deepEqual(runLearningRollout(config),first);
assert.equal(first.acceptanceProfile,false);assert.equal(first.productionAccess,false);
assert.equal(first.socialDensity,null);assert.equal(first.diffusionDays,null);
for(const run of first.runs) {
 assert.equal(run.completedPlans,2*4*24);assert.equal(run.trainedSamples,run.completedPlans);
 assert(run.immediateRegretPerAgentDay>=0);assert(run.needOkRatio>=0&&run.needOkRatio<=1);
 assert(run.actionEntropy>=0&&run.actionEntropy<=1);assert(run.repeatRate>=0&&run.repeatRate<=1);
 assert.equal(run.dailyNeedOk.length,4);assert.equal(run.dailyReturn.length,4);
}
const alternate=runLearningRollout({...config,policy:'tabular'});
assert.deepEqual(alternate.config.seeds,first.config.seeds);
const identical=compareLearningRollouts(first,first);
assert.equal(identical.differences.returnPerAgentDay.mean,0);
assert.deepEqual(identical.differences.returnPerAgentDay.ci95,[0,0]);
assert.equal(identical.passesProposedOfflineGates,false,'Small fixtures cannot qualify a policy');
assert.equal(identical.activatesRuntimePolicy,false);
const mislabeled=structuredClone(first);mislabeled.acceptanceProfile=true;
assert.equal(compareLearningRollouts(mislabeled,mislabeled).gates.fullProfile,false,'A label cannot turn a small fixture into full evidence');
const mismatch=structuredClone(first);mismatch.config.shiftDay=1;
assert.throws(()=>compareLearningRollouts(first,mismatch),/profile/);
const missing=structuredClone(first);missing.runs.pop();
assert.throws(()=>compareLearningRollouts(first,missing),/seed/);
assert.throws(()=>runLearningRollout({...config,seeds:[1,1]}),/configuration/);
assert.throws(()=>runLearningRollout({...config,agents:0}),/configuration/);
assert.throws(()=>runLearningRollout({...config,shiftDay:4}),/configuration/);
assert.throws(()=>runLearningRollout(config,()=>scenarios.find(s=>s.id==='minor-injury')),/hard priority/);
const blocked=initializeAgent('cancel-fixture');blocked.pending={id:'cancelled',scenarioId:'learn-trade',startedSimMs:0,durationMs:180000,completed:false};
assert.equal(settleLearning(blocked,180000,'2026-10-28T02:00:00.000Z',false),false);assert.equal(blocked.samples,0);
assert.equal(settleLearning(blocked,360000,'2026-10-28T02:00:00.000Z',true),false);
assert.equal(chooseScenario(base,'oracle-fixture',fixtureContext()).id,chooseScenario(base,'oracle-fixture',fixtureContext(),undefined,'linucb').id);
console.log(JSON.stringify({suite:'learning-policy',goldenCases:golden.cases,goldenDecisions:golden.decisions,determinism:true,oracleFeasible:true,elapsedNeedsMatched:true,censoredCompetence:true,seedLevelIntervals:true,noFakeSocialMetrics:true,seconds:+((performance.now()-begin)/1000).toFixed(3)}));
