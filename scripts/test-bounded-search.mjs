import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {warmConfigSchema,searchProtocolSchema,searchGrid,seedValues,warmConfigId,shortlistCandidates,selectValidationCandidate,
 runBoundedRollout,compareBoundedRollouts,selectBoundedScenario,warmPrediction} from '../lib/living/bounded-search.ts';
import {ReplayCorpus,replayExperience,fitReplay,compileReplay} from '../lib/living/outcome-replay.ts';
import {runReplayRollout} from '../lib/living/replay-harness.ts';
import {initializeAgent,chooseScenario,scenarios} from '../lib/living/learning.ts';
import {decisionContext} from '../lib/living/linucb.ts';
import {fixtureContext} from './learning-fixtures.mjs';
import {loadSearchInputs,optimizePolicyStage} from './optimize-policy.mjs';
const protocol=JSON.parse(readFileSync('docs/validation/learning-h10-protocol-v1.json'));
searchProtocolSchema.parse(protocol);assert.equal(searchGrid(protocol).length,9);
for(const change of [p=>p.budget.candidates=10,p=>p.grid.warmPlans=[6,6,24],p=>p.grid.priorK=[.5,2,50],p=>p.grid.warmPlans[0]=0,
 p=>p.search.seedIndices[0]=p.holdout.seedIndices[0],p=>p.validation.agents=12,p=>p.runtimeAutoPatch=true]) {
 const bad=structuredClone(protocol);change(bad);assert.throws(()=>searchProtocolSchema.parse(bad));
}
assert.equal(new Set(seedValues([...protocol.fit.seedIndices,...protocol.fit.pointValidationIndices,...protocol.search.seedIndices,...protocol.validation.seedIndices,...protocol.holdout.seedIndices])).size,48);
const config={warmPlans:6,priorK:.5};
for(const bad of [{...config,priorK:0},{...config,priorK:Infinity},{...config,warmPlans:73},{...config,reward:1}])assert.throws(()=>warmConfigSchema.parse(bad));
const scored=(params,relative=.01,changes={})=>({id:warmConfigId(params),params,profiles:['ordinary-v1','cold-stress-v1'].map(profile=>({profile,comparison:{relativeReturnDelta:relative,meanEntropyRatio:1,
 gates:{fullProfile:true,enoughSeeds:false,returnNonDecrease:true,needsNonDecrease:true,regretNonIncrease:true,entropyFloor:true,...changes}}}))});
const grid=searchGrid(protocol),scores=grid.map(c=>scored(c.params));
const shortlist=shortlistCandidates(scores),reverse=shortlistCandidates([...scores].reverse());assert.deepEqual(shortlist,reverse);
assert.equal(shortlist.length,2);assert.notEqual(shortlist[0].params.warmPlans,shortlist[1].params.warmPlans);
const diverse=scored({warmPlans:12,priorK:.5},.1);diverse.profiles[0].comparison.meanEntropyRatio=.79;
assert(!shortlistCandidates([diverse,scored(config)]).some(c=>c.id===diverse.id),'Action entropy constrains search eligibility');
assert.throws(()=>shortlistCandidates([scores[0],scores[0]]),/budget|uniqueness/);assert.throws(()=>shortlistCandidates(scores,3),/budget/);
const ids=shortlist.map(c=>c.id);assert(selectValidationCandidate(shortlist,ids),'Eight-seed validation uses performance gates; it is not a20seed holdout claim');
const failed=shortlist.map(c=>scored(c.params,.02,{needsNonDecrease:false}));assert.equal(selectValidationCandidate(failed,ids),null);
assert.equal(selectValidationCandidate([],[]),null);assert.throws(()=>selectValidationCandidate(shortlist,['outside','other']),/shortlist/);
assert.equal(selectValidationCandidate(shortlist.map(c=>scored(c.params,.1,{fullProfile:false})),ids),null,'Proxy search cannot be relabeled as full validation');
const builder=new ReplayCorpus({kind:'synthetic-cohort',trainingSeeds:[11,37],agents:2,days:4,shiftDay:2});
runReplayRollout({variant:'personal-v1',profile:'cold-stress-v1',agents:2,days:4,seeds:[11,37],shiftDay:2},undefined,(_s,o)=>builder.add(replayExperience(o)));
const corpus=builder.finish(),artifact=fitReplay(corpus,'curriculum',{kind:'synthetic-generator',sha256:'a'.repeat(64),acceptedDigest:'b'.repeat(64)},'cold-stress-v1'),model=compileReplay(artifact);
const id='H1:101:resident:0',agent=initializeAgent(id),context=fixtureContext(),x=decisionContext(agent,context.weather),scenario=scenarios.find(s=>artifact.rows.some(r=>r.scenarioId===s.id));
const before=JSON.stringify(agent);selectBoundedScenario(agent,id,context,'Thư viện',config,model);assert.equal(JSON.stringify(agent),before);
assert.equal(agent.samples,0);assert.equal(agent.linear,undefined);assert.deepEqual(agent.domainSkills,{});
const experienced=structuredClone(agent);experienced.samples=3;experienced.actions[scenario.id]={trials:3,meanReward:.2};
assert.equal(warmPrediction(model,config,experienced,id,scenario,x).weight,.5/3.5);
const expired={...agent,samples:6};assert.equal(selectBoundedScenario(expired,id,context,'Thư viện',config,model).id,chooseScenario(expired,id,context,'Thư viện').id);
assert.equal(warmPrediction(model,config,expired,id,scenario,x),null);
assert.equal(selectBoundedScenario({...agent,energy:5},id,context,'Thư viện',config,{assertActor(){},mean(){throw Error('Emergency cannot query prior');}}).id,'rest-home');
const options={profile:'cold-stress-v1',agents:2,days:4,seeds:[101,107],shiftDay:2,params:null};
const baseline=runBoundedRollout(options),candidate=runBoundedRollout({...options,params:config},artifact);
assert.deepEqual(runBoundedRollout({...options,params:config},artifact),candidate);assert(candidate.runs.every(r=>r.priorPredictionsAfterCutoff===0));
assert(candidate.raw.runs.every(r=>r.trainedSamples===r.completedPlans));assert.equal(compareBoundedRollouts(baseline,candidate).gates.enoughSeeds,false);
assert.throws(()=>runBoundedRollout({...options,seeds:[11],params:config},artifact),/overlap/);
assert.throws(()=>runBoundedRollout({...options,profile:'ordinary-v1',params:config},artifact),/profile/);
assert.throws(()=>runBoundedRollout(options,artifact),/baseline/);
const temp=mkdtempSync(join(tmpdir(),'h10-guards-'));
try {
 const path=join(temp,'protocol.json');writeFileSync(path,JSON.stringify(protocol));
 // A real but incompatible H6 fixture must be rejected before any search case.
 const models=join(temp,'models');for(const p of protocol.profiles){mkdirSync(join(models,p),{recursive:true});writeFileSync(join(models,p,'replay.json'),JSON.stringify({sha256:'0'.repeat(64)}));}
 assert.throws(()=>loadSearchInputs(path,models),/checksum/);
 const out=join(temp,'out');await assert.rejects(()=>optimizePolicyStage({stage:'unknown',protocolPath:path,modelsDir:models,out}),/Stage/);assert(!existsSync(out));
 const result=spawnSync(process.execPath,['scripts/optimize-policy.mjs','--stage=holdout',`--protocol=${path}`,`--models=${models}`,`--out=${out}`],{encoding:'utf8'});
 assert.notEqual(result.status,0);assert(!existsSync(out),'Invalid source cannot create holdout artifacts');
} finally {rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({suite:'bounded-search',finiteGridBudget:true,strictParameters:true,disjointCohorts:true,
 deterministicDiverseShortlist:true,validationCannotAddCandidates:true,noEligibleCandidateStopsSelection:true,
 noEarnedSampleSkillMatrixTransfer:true,cutoffExactFallback:true,emergencyAndSkillGuards:true,sourceHashAdmission:true,
 baselinePreserved:true,productionAccess:false,autoRuntimeActivation:false}));
