import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {initializeAgent,scenarios,settleLearning,expectedReward,advanceNeeds} from '../lib/living/learning.ts';
import {decisionContext} from '../lib/living/linucb.ts';
import {fixtureContext} from './learning-fixtures.mjs';
import {runLearningRollout,initializeRolloutAgent,applyStressLoad,compareLearningRollouts} from '../lib/living/sim-harness.ts';
import {fitResidualArm,residualBonus,newResidualState,observeResidual,selectResidualScenario,
 residualPrediction,indexPrior,priorSchema,priorKey,RESIDUAL_VERSION,SCENARIO_SIGNATURE} from '../lib/living/residual-policy.ts';
const begin=performance.now(),context=fixtureContext(),scenario=scenarios.find(s=>s.id==='learn-trade');
const agent=initializeAgent('owner-a'),memory=newResidualState('owner-a');
agent.needsUpdatedSimMs=0;
const receipt={version:RESIDUAL_VERSION,actorId:'owner-a',id:'real-receipt',scenarioId:scenario.id,
 sampleBefore:0,expected:expectedReward(agent,scenario),context:decisionContext(agent,context.weather),rolePlace:'Thư viện'};
agent.pending={id:receipt.id,scenarioId:scenario.id,startedSimMs:0,durationMs:180000,completed:false,context:[...receipt.context]};
assert.equal(observeResidual(memory,receipt,agent,true).learned,false,'No early residual samples');
assert.equal(settleLearning(agent,179999,'2026-10-28T02:00:00Z',true),false);
advanceNeeds(agent,'owner-a',180000,false);
assert.equal(settleLearning(agent,180000,'2026-10-28T02:00:00Z',true),true);
const frozenAgent=JSON.stringify(agent),frozenMemory=JSON.stringify(memory);
const observed=observeResidual(memory,receipt,agent,true);
assert.equal(observed.learned,true);assert.equal(observed.state.actions[scenario.id].n,1);
assert.equal(observed.state.lastSample,1);assert.equal(JSON.stringify(agent),frozenAgent);assert.equal(JSON.stringify(memory),frozenMemory);
assert.equal(observed.residual,agent.lastReward-receipt.expected);
assert.notEqual(observed.residual,0,'Residual includes the actual drift since the decision');
assert.equal(observeResidual(observed.state,receipt,agent,true).state,observed.state,'Replay does not fit again');
assert.equal(observeResidual(JSON.parse(JSON.stringify(observed.state)),receipt,agent,true).learned,false,'Resume preserves the checkpoint');
for(const bad of [{...receipt,actorId:'other'},{...receipt,id:'other'},{...receipt,scenarioId:'missing'},
 {...receipt,version:'unknown'},{...receipt,expected:NaN},{...receipt,expected:2},{...receipt,sampleBefore:1},
 {...receipt,context:[1,0,0,0,0,0]}])assert.equal(observeResidual(memory,bad,agent,true).learned,false);
assert.equal(observeResidual(memory,receipt,agent,false).learned,false);
assert.equal(observeResidual(newResidualState('owner-b'),receipt,agent,true).learned,false,'Actor models cannot leak');
const legacy=structuredClone(agent);legacy.samples=101;
const inherited=observeResidual(memory,{...receipt,sampleBefore:100},legacy,true);
assert.equal(inherited.state.actions[scenario.id].n,1,'Raw legacy trials are not invented residual history');
assert.equal(inherited.state.lastSample,101);
let arm;
for(let i=0;i<100;i++)arm=fitResidualArm(arm,1);
for(let i=0;i<20;i++)arm=fitResidualArm(arm,-1);
assert(arm.mean<-.6&&((100-20)/120)>.6,'EMA floor adapts in this controlled sign-change test');
assert.equal(arm.n,120);assert.equal(arm.history.length,20);assert(arm.variance>=0&&arm.variance<=4);
const before=JSON.stringify(arm);assert.deepEqual(JSON.parse(before),arm);
assert.throws(()=>fitResidualArm(arm,NaN),/Invalid residual/);assert.equal(JSON.stringify(arm),before);
assert.throws(()=>fitResidualArm({...arm,variance:-1},0),/Invalid residual/);
let stable;for(let i=0;i<500;i++)stable=fitResidualArm(stable,.2);
assert(residualBonus(stable)<1e-10);assert(residualBonus()>0);
const prior=priorSchema.parse({version:1,source:'synthetic-H2-training',expectedVersion:'scenario-outcome-v1',scenarioSignature:SCENARIO_SIGNATURE,
 profile:'cold-stress-v1',trainingSeeds:[100,101],rows:[{rolePlace:'Thư viện',scenarioId:scenario.id,mean:.4,support:25}]});
const index=indexPrior(prior),fresh=initializeAgent('new-owner'),freshMemory=newResidualState('new-owner');
const freshBefore=JSON.stringify(fresh);
assert.equal(residualPrediction(freshMemory,scenario.id,'Thư viện','residual-warm-v1',index),.4);
assert.equal(residualPrediction(freshMemory,scenario.id,'Thư viện','residual-ema-v1',index),0);
selectResidualScenario(fresh,'new-owner',context,'Thư viện','residual-warm-v1',freshMemory,index);
assert.equal(JSON.stringify(fresh),freshBefore);assert.deepEqual(freshMemory.actions,{});
assert.equal(fresh.samples,0);assert.deepEqual(fresh.domainSkills,{});
for(const bad of [{...prior,trainingSeeds:[1,1]},{...prior,scenarioSignature:0},
 {...prior,rows:[prior.rows[0],prior.rows[0]]},{...prior,rows:[{...prior.rows[0],support:0}]}])assert.throws(()=>priorSchema.parse(bad));
for(const changes of [{energy:19,hunger:100},{energy:0,health:20}]) {
 const needy={...fresh,...changes};
 assert.equal(selectResidualScenario(needy,'new-owner',context,'Thư viện','residual-warm-v1',freshMemory,index,Array(41).fill(999)).id,'rest-home');
}
const locked=scenarios.find(s=>s.minDomainSkill>0);
assert.notEqual(selectResidualScenario(fresh,'new-owner',context,'Thư viện','residual-warm-v1',freshMemory,new Map([[priorKey('Thư viện',locked.id),2]])).id,locked.id);
assert.throws(()=>selectResidualScenario(fresh,'different-owner',context,'Thư viện','model-prior-v1',freshMemory),/another actor/);
const stress=initializeRolloutAgent('fixture','cold-stress-v1');
assert.equal(stress.samples,0);assert(stress.energy<65&&stress.hunger>=55);assert.deepEqual(stress.actions,{});
const duplicate=structuredClone(stress),unchanged=JSON.stringify(stress);
applyStressLoad(stress,'fixture',30,0,30);assert.equal(JSON.stringify(stress),unchanged,'Night has no daytime fixture load');
applyStressLoad(stress,'fixture',30,6,30);applyStressLoad(duplicate,'fixture',30,6,30);assert.deepEqual(stress,duplicate);
const config={policy:'residual-ema-v1',profile:'cold-stress-v1',agents:2,days:6,seeds:[11,37],shiftDay:3};
const first=runLearningRollout(config);assert.deepEqual(runLearningRollout(config),first);
for(const run of first.runs) {
 assert.equal(run.study.residualUpdates,run.completedPlans);assert.equal(run.study.earnedResidualSamples,run.completedPlans);
 assert(run.study.firstDayNeedOk<.9,'The stress fixture must have headroom');
 assert(run.study.modelOnlyMSE>=0&&run.study.residualMSE>=0);
}
const baseline=runLearningRollout({...config,policy:'linucb'});
assert.equal(compareLearningRollouts(baseline,first).gates.fullProfile,false);
assert.throws(()=>runLearningRollout({...config,policy:'residual-warm-v1'}),/requires/);
assert.throws(()=>runLearningRollout({...config,policy:'residual-warm-v1'},undefined,{prior:{...prior,trainingSeeds:[11]}}),/overlap/);
assert.throws(()=>runLearningRollout({...config,policy:'residual-warm-v1'},undefined,{prior:{...prior,profile:'ordinary-v1'}}),/mismatch/);
const warm=runLearningRollout({...config,policy:'residual-warm-v1'},undefined,{prior});
assert.equal(warm.runs[0].study.earnedResidualSamples,warm.runs[0].completedPlans);
const old=JSON.parse(readFileSync('docs/validation/learning-linucb-full-v1.json','utf8'));
const preserved=runLearningRollout({...old.config,seeds:[old.config.seeds[0]]});
assert.deepEqual(preserved.runs[0],old.runs[0],'H1 baseline semantics must remain exact');
console.log(JSON.stringify({suite:'residual-policy',receiptOwnership:true,noEarlyOrDuplicateOrCancelled:true,rawModelsUntouched:true,
 legacyNotBackfilled:true,emaShift:true,warmPriorNotEarnedSamples:true,emergencyOverCap:true,coldStressHeadroom:true,
 deterministic:true,H1RowPreserved:true,seconds:+((performance.now()-begin)/1000).toFixed(3)}));
