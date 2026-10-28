import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {HierarchyTrainer,compileHierarchy,hierarchyPriorSchema,hierarchyRole,hierarchyPrediction,selectHierarchyScenario} from '../lib/living/hierarchical-prior.ts';
import {runHierarchyRollout,compareHierarchyRollouts} from '../lib/living/hierarchy-harness.ts';
import {initializeAgent,chooseScenario,scenarios} from '../lib/living/learning.ts';
import {decisionContext,newArm} from '../lib/living/linucb.ts';
import {fixtureContext} from './learning-fixtures.mjs';
const profile='cold-stress-v1',seeds=[11,37],trainer=new HierarchyTrainer(profile,seeds,4,6);
let first;
const config={variant:'personal-v1',profile,agents:4,days:6,seeds,shiftDay:3};
runHierarchyRollout(config,undefined,(seed,outcome)=>{first??={seed,outcome:structuredClone(outcome)};trainer.observe(seed,outcome);});
const artifact=trainer.artifact(),before=JSON.stringify(artifact);
assert.equal(artifact.acceptedOutcomes,1152);assert(artifact.rows.some(r=>r.roleKind!==null));
assert(artifact.rows.every(r=>r.support===r.model.samples&&r.donorActors>=2&&r.donorSeeds>=2));
assert(!before.includes('resident:')&&!before.includes('memories'),'Only numeric aggregates and counts leave the trainer');
const compiled=compileHierarchy(artifact),context=fixtureContext(),agent=initializeAgent('fresh'),x=decisionContext(agent,context.weather);
const row=artifact.rows.find(r=>r.roleKind!==null),scenario=scenarios.find(s=>s.id===row.scenarioId);
const prior=compiled.predict(scenario.id,x,row.roleKind,'role-prior-v1');assert.equal(prior.scope,'role-kind');assert.equal(prior.effectiveConfidence,5);
assert.deepEqual(compiled.predict(scenario.id,x,'unknown-role','role-prior-v1'),compiled.predict(scenario.id,x,'unknown-role','global-prior-v1'));
assert.equal(compiled.predict('unknown-scenario',x,'read','role-prior-v1'),null);
assert.equal(compiled.predict(scenario.id,x,'read','personal-v1'),null);
assert.throws(()=>compiled.predict(scenario.id,x,'read','unknown'),/variant/);
assert.throws(()=>compiled.predict(scenario.id,[1,NaN],'read','role-prior-v1'),/context/);
const role=hierarchyRole('fresh',0,3),frozen=JSON.stringify(agent);
selectHierarchyScenario(agent,'fresh',context,role,'role-prior-v1',compiled);
assert.equal(JSON.stringify(agent),frozen,'Prior never installs donor samples, skills, memories or matrices');
assert.equal(agent.samples,0);assert.deepEqual(agent.domainSkills,{});assert.equal(agent.linear,undefined);
assert.equal(hierarchyPrediction(agent,scenario.id,x,row.roleKind,'role-prior-v1',compiled).weight,1);
const experienced=structuredClone(agent);experienced.linear={[scenario.id]:{...newArm(),samples:100}};
assert.equal(hierarchyPrediction(experienced,scenario.id,x,row.roleKind,'role-prior-v1',compiled).weight,5/105);
assert.equal(selectHierarchyScenario(agent,'fresh',context,role,'personal-v1').id,chooseScenario(agent,'fresh',context,role.place).id);
assert.equal(selectHierarchyScenario(agent,'fresh',context,role,'role-prior-v1',compileHierarchy({...artifact,rows:[]})).id,chooseScenario(agent,'fresh',context,role.place).id);
for(const [changes,hour,only] of [[{energy:19,hunger:100},9,'rest-home'],[{health:20},9,'rehabilitate'],[{hunger:99},9,'lunch'],[{},0,'rest-home'],[{employment:'seeking'},9,'job-search']]) {
 assert.equal(selectHierarchyScenario({...agent,...changes},'fresh',fixtureContext(hour),role,'role-prior-v1',{predict(){throw Error('Forced action cannot consult a prior');}}).id,only);
}
const choice=selectHierarchyScenario(agent,'fresh',context,role,'role-prior-v1',compiled);
assert(!choice.minDomainSkill,'Group knowledge cannot bypass a practice gate');
const ownSamples=JSON.stringify(experienced);selectHierarchyScenario(experienced,'fresh',context,role,'role-prior-v1',compiled);assert.equal(JSON.stringify(experienced),ownSamples);
const saved=compiled.predict(scenario.id,x,row.roleKind,'global-prior-v1');
artifact.rows.find(r=>r.roleKind===null&&r.scenarioId===scenario.id).model.b.fill(0);
assert.deepEqual(compiled.predict(scenario.id,x,row.roleKind,'global-prior-v1'),saved,'Compiled model is detached and immutable');
const intact=JSON.parse(before);
for(const mutate of [p=>p.source='synthetic-H2-training',p=>p.featureVersion='future',p=>p.rewardVersion='v2',p=>p.catalogSignature=0,
 p=>p.trainingSeeds=[11,11],p=>p.rows.push(p.rows[0]),p=>p.rows[0].model.inverse[0]=-1,p=>p.rows[0].model.b[0]=1e9,
 p=>p.rows[0].support++,p=>p.rows[0].donorSeeds=999,p=>p.rows[0].roleKind='unknown',p=>p.rows[0].privateMemory='secret']) {
 const copy=structuredClone(intact);mutate(copy);assert.throws(()=>hierarchyPriorSchema.parse(copy));
}
assert.equal(JSON.stringify(trainer.artifact()),before,'Compiled callers cannot rewrite trainer state');
assert.throws(()=>trainer.observe(first.seed,first.outcome),/duplicate/);
const replay=structuredClone(first.outcome);replay.id+='-renamed';assert.throws(()=>trainer.observe(first.seed,replay),/duplicate/);
const check=new HierarchyTrainer(profile,seeds,4,6),corrupt=structuredClone(first.outcome);
corrupt.plan.steps[0].activity='Changed plan';assert.throws(()=>check.observe(first.seed,corrupt),/Invalid/);
assert.throws(()=>check.observe(999,first.outcome),/ownership/);
const crossActor={...first.outcome,actorId:'other'};assert.throws(()=>check.observe(first.seed,crossActor),/ownership/);
assert.equal(check.artifact().acceptedOutcomes,0);
const evaluation={...config,seeds:[101,107]};
const baseline=runHierarchyRollout(evaluation),global=runHierarchyRollout({...evaluation,variant:'global-prior-v1'},intact);
const candidate=runHierarchyRollout({...evaluation,variant:'role-prior-v1'},intact);
assert.deepEqual(runHierarchyRollout({...evaluation,variant:'role-prior-v1'},intact),candidate);
assert(global.runs.every(r=>r.priorUseFraction>0&&r.meanPriorWeight<r.first24PlansMeanPriorWeight));
assert(candidate.raw.runs.every(r=>r.trainedSamples===r.completedPlans),'Only own outcomes contribute personal samples');
assert.equal(compareHierarchyRollouts(baseline,candidate).gates.enoughSeeds,false);
const misaligned=structuredClone(candidate);misaligned.runs.reverse();assert.throws(()=>compareHierarchyRollouts(baseline,misaligned),/misaligned/);
assert.throws(()=>runHierarchyRollout({...config,variant:'role-prior-v1'},intact),/overlap/);
assert.throws(()=>runHierarchyRollout({...evaluation,profile:'ordinary-v1',variant:'role-prior-v1'},intact),/profile/);
assert.throws(()=>runHierarchyRollout({...evaluation,variant:'role-prior-v1'}),/requires/);
assert.throws(()=>runHierarchyRollout(evaluation,intact),/baseline/);
assert.notEqual(hierarchyRole('fresh',0,3).id,hierarchyRole('fresh',3,3).id);
const temp=mkdtempSync(join(tmpdir(),'h4-cli-'));
try {
 const run=(script,args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
 const out=join(temp,'prior.json'),args=['--agents=4','--days=3','--seeds=2',`--out=${out}`];
 let result=run('scripts/train-hierarchical-prior.mjs',args);assert.equal(result.status,0,result.stderr);
 const bytes=readFileSync(out);result=run('scripts/train-hierarchical-prior.mjs',args);assert.equal(result.status,0,result.stderr);assert.deepEqual(readFileSync(out),bytes);
 const payload=JSON.parse(bytes);payload.sha256='0'.repeat(64);const bad=join(temp,'bad.json');writeFileSync(bad,JSON.stringify(payload));
 result=run('scripts/sim-hierarchy.mjs',['--variant=role-prior-v1',`--prior=${bad}`]);assert.notEqual(result.status,0);assert(result.stderr.includes('checksum'));
 result=run('scripts/sim-hierarchy.mjs',['--variant=role-prior-v1','--seed-start=3000',`--prior=${out}`]);assert.notEqual(result.status,0);assert(result.stderr.includes('overlap'));
 const report=join(temp,'report.json');writeFileSync(report,'{"sha256":"preserve"}\n');
 result=run('scripts/sim-hierarchy.mjs',['--variant=personal-v1','--agents=2','--days=3','--seeds=1',`--out=${report}`]);assert.notEqual(result.status,0);assert.equal(readFileSync(report,'utf8'),'{"sha256":"preserve"}\n');
} finally {rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({suite:'hierarchical-prior',auditedSyntheticOnly:true,roleKindFromCatalog:true,globalFallback:true,
 boundedConfidence:true,noEarnedSampleOrMatrixTransfer:true,emergencyAndSkillGuards:true,duplicatesAndCrossActorRejected:true,
 strictArtifactMatrixSchema:true,seedProfileIsolation:true,deterministic:true,trainingReportImmutable:true,productionAccess:false}));
