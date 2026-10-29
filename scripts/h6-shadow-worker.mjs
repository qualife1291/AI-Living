/** Offline only. Train hierarchical priors on completed synthetic outcomes,
 * check provenance, holdout isolation, tamper resistance and cohort metrics.
 * No network, database writes, runtime activation, or donor-memory imports. */
import assert from 'node:assert/strict';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {resourceUsage,memoryUsage} from 'node:process';
import {hashSeed} from '../lib/clock.ts';
import {scenarios,OUTCOME_SCENARIO_SIGNATURE} from '../lib/living/learning.ts';
import {HierarchyTrainer,compileHierarchy,hierarchyPriorSchema,CATALOG_SIGNATURE} from '../lib/living/hierarchical-prior.ts';
import {runHierarchyRollout,compareHierarchyRollouts} from '../lib/living/hierarchy-harness.ts';

assert.equal(process.env.H6_SHADOW_SANDBOX,'true','H6 model trainer cannot run against live catalog');
const {values}=parseArgs({options:{tier:{type:'string',default:'ci'},out:{type:'string',default:'.h6-offline-results'}}});
const budgets={
  smoke:{trainSeeds:2,trainAgents:6,trainDays:7,testSeeds:2,testAgents:6,testDays:7},
  ci:{trainSeeds:5,trainAgents:16,trainDays:21,testSeeds:6,testAgents:16,testDays:21},
  heavy:{trainSeeds:12,trainAgents:32,trainDays:45,testSeeds:20,testAgents:24,testDays:60},
  extreme:{trainSeeds:32,trainAgents:64,trainDays:90,testSeeds:20,testAgents:24,testDays:60},
};
const budget=budgets[values.tier];
if(!budget)throw Error('Unknown resource tier');
assert.equal(scenarios.length,96,'H6 scenario catalog required');
const since=performance.now(),profiles=[];
for(const [profileIndex,profile] of ['ordinary-v1','cold-stress-v1'].entries()){
  const trainSeeds=Array.from({length:budget.trainSeeds},(_,i)=>hashSeed('H1-seed:'+(10000+profileIndex*1000+i)));
  const validationSeeds=Array.from({length:Math.max(6,Math.min(10,budget.testSeeds))},(_,i)=>hashSeed('H1-seed:'+(15000+profileIndex*1000+i)));
  const testSeeds=Array.from({length:budget.testSeeds},(_,i)=>hashSeed('H1-seed:'+(20000+profileIndex*1000+i)));
  assert.equal(new Set([...trainSeeds,...validationSeeds,...testSeeds]).size,trainSeeds.length+validationSeeds.length+testSeeds.length,'Train/validation/holdout leakage');
  const trainer=new HierarchyTrainer(profile,trainSeeds,budget.trainAgents,budget.trainDays);
  const transcript=createHash('sha256');
  const profileStart=performance.now();
  const options={variant:'personal-v1',profile,agents:budget.trainAgents,days:budget.trainDays,seeds:trainSeeds,shiftDay:Math.floor(budget.trainDays/2)};
  const trainReport=runHierarchyRollout(options,undefined,(seed,outcome)=>{
    const record=trainer.observe(seed,outcome);
    transcript.update(JSON.stringify({seed,record})+'\n');
  });
  const prior=hierarchyPriorSchema.parse(trainer.artifact());
  assert.equal(prior.profile,profile);
  assert.equal(prior.scenarioSignature,OUTCOME_SCENARIO_SIGNATURE);
  assert.equal(prior.catalogSignature,CATALOG_SIGNATURE);
  assert.equal(prior.trainingSeeds.length,trainSeeds.length);
  assert.equal(prior.acceptedOutcomes,budget.trainSeeds*budget.trainAgents*budget.trainDays*24);
  assert(prior.rows.length>0 && prior.rows.length<=1000);
  assert(prior.rows.every(x=>x.support===x.model.samples&&x.donorActors>=2&&x.donorSeeds>=2));
  const priorText=JSON.stringify(prior);
  assert(!priorText.includes('resident:')&&!priorText.includes('memories'),'Raw donor identity/memory leaked into model');
  const copy=structuredClone(prior);copy.rows[0].model.inverse[0]=-1;
  assert.throws(()=>hierarchyPriorSchema.parse(copy),'Invalid covariance was accepted');
  const compiled=compileHierarchy(prior);
  assert(compiled,'Could not compile model');
  const artifact={prior,provenance:{generator:'H6-synthetic-completed-linucb-v1',transcriptSha256:transcript.digest('hex'),
    trainedFrom:'verified-contextual, monotonic per-actor outcomes',productionAccess:false,
    trainSeeds,validationSeeds,holdoutSeeds:testSeeds}};
  const sha256=createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
  const outdir=join(values.out,values.tier);mkdirSync(outdir,{recursive:true});
  const modelPath=join(outdir,profile+'.model.json');
  writeFileSync(modelPath,JSON.stringify({...artifact,sha256})+'\n');
  const saved=JSON.parse(readFileSync(modelPath,'utf8'));const {sha256:savedHash,...body}=saved;
  assert.equal(savedHash,createHash('sha256').update(JSON.stringify(body)).digest('hex'),'Artifact checksum mismatch');
  // Validation-only algorithm selection. Never select on the final holdout.
  // A synthetic shared prior can be worse than the personal model under stress.
  const valOptions={variant:'personal-v1',profile,agents:budget.testAgents,
    days:budget.testDays,seeds:validationSeeds,shiftDay:Math.floor(budget.testDays/2)};
  const valBaseline=runHierarchyRollout(valOptions);
  const validations=[];
  for(const variant of ['global-prior-v1','role-prior-v1']){
    const candidate=runHierarchyRollout({...valOptions,variant},prior);
    const comparison=compareHierarchyRollouts(valBaseline,candidate);
    const ci95=comparison.differences?.returnPerAgentDay?.ci95;
    validations.push({variant,delta:comparison.differences?.returnPerAgentDay?.mean??null,
      lower95:ci95?.[0]??null,upper95:ci95?.[1]??null});
  }
  // Fail closed to personal LinUCB unless an independent validation CI excludes a loss.
  const viable=validations.filter(x=>x.lower95!==null&&x.lower95>0).sort((a,b)=>b.lower95-a.lower95);
  const selectedVariant=viable[0]?.variant??'personal-v1';
  const evalOptions={variant:'personal-v1',profile,agents:budget.testAgents,days:budget.testDays,
    seeds:testSeeds,shiftDay:Math.floor(budget.testDays/2)};
  const baseline=runHierarchyRollout(evalOptions);
  const candidate=selectedVariant==='personal-v1'?baseline:
    runHierarchyRollout({...evalOptions,variant:selectedVariant},prior);
  const comparison=compareHierarchyRollouts(baseline,candidate);
  assert(candidate.runs.every(r=>Number.isFinite(r.blendedMSE)&&Number.isFinite(r.firstDayReturnPerAgent)));
  assert(candidate.raw.runs.every(r=>r.trainedSamples===r.completedPlans),
    'Donor outcomes changed personal samples');
  assert(candidate.runs.every(r=>r.priorUseFraction>=0&&r.priorUseFraction<=1));
  if(selectedVariant!=='personal-v1')assert(candidate.runs.some(r=>r.priorUseFraction>0),'Prior never exercised');
  assert.deepEqual(baseline.config.seeds,candidate.config.seeds,'Holdout mismatch');
  const holdoutConfidence=comparison.differences?.returnPerAgentDay?.ci95;
  const noHoldoutRegression=selectedVariant==='personal-v1' ||
    (holdoutConfidence!==null&&holdoutConfidence!==undefined&&holdoutConfidence[0]>=0);
  // This is a *separate* promotion condition from CI/provenance gate success.
  // Short CI cohorts cannot pass full 20-seed / 24-agent / 60-day acceptance.
  const strictFullPromotionPassed=selectedVariant!=='personal-v1'&&
    comparison.passesProposedOfflineGates===true;
  const result={profile,training:{sha256,rows:prior.rows.length,accepted:prior.acceptedOutcomes,
      signatures:{scenario:OUTCOME_SCENARIO_SIGNATURE,catalog:CATALOG_SIGNATURE}},
    evaluation:{validationSeeds:validationSeeds.length,selectedVariant,validation:validations,
      holdoutSeeds:budget.testSeeds,agents:budget.testAgents,days:budget.testDays,
      baselineReturn:baseline.raw.summary.returnPerAgentDay?.mean??null,
      candidateReturn:candidate.raw.summary.returnPerAgentDay?.mean??null,
      confidence:comparison.differences?.returnPerAgentDay?.ci95??null,
      candidatePriorUse:candidate.summary.priorUseFraction?.mean??null,
      noHoldoutRegression,strictFullPromotionPassed,
      fullProfileGate:comparison.gates?.fullProfile??false,
      enoughSeeds:comparison.gates?.enoughSeeds??false},
    seconds:Number(((performance.now()-profileStart)/1000).toFixed(2))};
  profiles.push(result);
  console.log(JSON.stringify({event:'h6-profile',tier:values.tier,...result}));
}
const summary={phase:'H6',tier:values.tier,modelType:'hierarchical-linucb-v1',
  scenarios:scenarios.length,budget,profiles,productionAccess:false,runtimeActivated:false,
  promotionAllowed:profiles.every(x=>x.evaluation.strictFullPromotionPassed),
  allHoldoutSafetyPassed:profiles.every(x=>x.evaluation.noHoldoutRegression),
  runnerResources:{peakRSSKB:resourceUsage().maxRSS,cpuUserMicros:resourceUsage().userCPUTime,
    cpuSystemMicros:resourceUsage().systemCPUTime,heapUsedBytes:memoryUsage().heapUsed},
  limits:'Synthetic cohorts are not real-user experiences; full 20-seed 24-agent 60-day gates required for promotion',
  elapsedSeconds:Number(((performance.now()-since)/1000).toFixed(2))};
mkdirSync(values.out,{recursive:true});writeFileSync(join(values.out,values.tier+'-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({event:'h6-acceptance',summary}));

if(!summary.allHoldoutSafetyPassed){
  console.error('FAIL H6: holdout regression in one or more profiles. Do not merge or promote.');
  process.exitCode=2;
}
