/**
 * Independent H6 adversarial resource probe. Read-only, no network/D1.
 * Exercises 96-action choice and 4,096 actors' contextual posterior allocation.
 * Resource limits are process measurements, NOT Cloudflare Worker benchmarks.
 */
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {writeFileSync,mkdirSync} from "node:fs";
import {scenarios,scenarioSchema,initializeAgent,chooseScenario,availableScenarios,applyScenarioOutcome,OUTCOME_SCENARIO_SIGNATURE} from "../lib/living/learning.ts";
import {decisionContext,newArm,fitLinear,linearScore,validArm} from "../lib/living/linucb.ts";
import {hashSeed,mulberry32} from "../lib/clock.ts";

const OUTPUT=".h6-audit/independent-stress.json";
const start=performance.now();
assert.equal(scenarios.length,96);
assert.equal(new Set(scenarios.map(s=>s.id)).size,96);
for(const s of scenarios)assert.deepEqual(scenarioSchema.parse(s),s);
const f=(i,j)=>mulberry32(hashSeed("H6-adversarial-2026:"+i+":"+j));
const snapshot=JSON.stringify(scenarios);
const scenariosById=new Map(scenarios.map(s=>[s.id,s]));
const heldout={safeguard:0,weather:0,gate:0,selected:new Set(),rewardBounds:0,decisions:0,uniqueWorlds:0};
const contexts=[
  {hour:2,rain:false,emergency:"rest"},
  {hour:8,rain:true,emergency:"rain"},
  {hour:11,rain:false,emergency:"normal"},
  {hour:19,rain:true,emergency:"rain"},
];
const nDecisionActors=16384;
for(let i=0;i<nDecisionActors;i++){
  const rng=f(i,"choices");
  const ag=initializeAgent("h6-audit-"+i);
  ag.energy=Math.floor(rng()*101);ag.hunger=Math.floor(rng()*101);
  ag.health=Math.floor(rng()*101);ag.skill=Math.floor(rng()*101);
  ag.employment=i%23===0?"seeking":"employed";
  // Expensive extremes deliberately produce hard safety gates.
  const {hour,rain}=contexts[i%contexts.length];
  const ctx={hour,date:"2026-10-29",weather:{status:"fresh",precipitation:rain?3:0}};
  const choices=availableScenarios(ag,ctx);
  assert(choices.length>0 && choices.length<=96);
  if(hour<6||hour>=22||ag.energy<20){
    assert.equal(choices.length,1);
    assert.equal(choices[0].id,"rest-home");heldout.safeguard++;
  }else if(ag.health<65){
    assert.equal(choices.length,1);
    assert.equal(choices[0].id,"rehabilitate");heldout.safeguard++;
  }else if(ag.hunger>72){
    assert.equal(choices.length,1);
    assert.equal(choices[0].id,"lunch");heldout.safeguard++;
  }else if(ag.employment==="seeking"){
    assert.equal(choices.length,1);
    assert.equal(choices[0].id,"job-search");heldout.safeguard++;
  }
  if(rain){
    assert(choices.every(s=>!["ecology","sport"].includes(s.tag)));
    heldout.weather++;
  }
  const before=JSON.stringify(ag);
  const selected=chooseScenario(ag,"h6-audit-"+i,ctx,"Thư viện");
  assert(choices.some(x=>x.id===selected.id));
  assert.equal(JSON.stringify(ag),before,"Choice mutated a resident");
  heldout.selected.add(selected.id);heldout.decisions++;
  if(i%16===0){
    for(const scenario of choices){
      const result=applyScenarioOutcome(ag,scenario);
      assert(Number.isFinite(result.reward)&&Math.abs(result.reward)<=1);
      assert(["energy","hunger","health","skill"].every(k=>result.after[k]>=0&&result.after[k]<=100));
      heldout.rewardBounds++;
    }
  }
}
assert(heldout.safeguard>0&&heldout.weather>0&&heldout.rewardBounds>1000);
assert(heldout.selected.size>=8,"Large-scale selection collapsed to too few actions");
assert.equal(JSON.stringify(scenarios),snapshot);
const selectionMs=Math.round(performance.now()-start);

// Deliberate over-provision stress: a 4,096-resident × 96-action synthetic
// policy shape, measured offline, never persisted to an actual D1 database.
const actorCount=4096,armsPerActor=scenarios.length;
let trainedArms=0,totalFit=0,peakRss=process.memoryUsage().rss;
const summaries=[];
for(let actor=0;actor<actorCount;actor++){
 const rng=f(actor,"posterior"),scores=[];
 for(const scenario of scenarios){
  const energy=10+Math.floor(rng()*91),hunger=Math.floor(rng()*101);
  const context=decisionContext({energy,hunger,skill:Math.floor(rng()*101),socialNeed:Math.floor(rng()*101)},{status:"fresh",precipitation:rng()<.4?2:0});
  const reward=applyScenarioOutcome({energy,hunger,health:100,skill:Math.floor(rng()*100),employment:"employed"},scenario).reward;
  const model=fitLinear(newArm(),context,reward);
  assert(validArm(model)&&model.samples===1);
  const prediction=linearScore(model,context);
  assert(Number.isFinite(prediction.mean)&&Number.isFinite(prediction.uncertainty));
  scores.push([scenario.id,model]); // hold ALL 393,216 6D posteriors concurrently
  trainedArms++;totalFit++;
 }
 summaries.push({actor,arms:scores});
 if(actor%128===0)peakRss=Math.max(peakRss,process.memoryUsage().rss);
}
const elapsedMs=Math.round(performance.now()-start);
const outcome={phase:"H6-adversarial-independent",catalogueSignature:OUTCOME_SCENARIO_SIGNATURE,
 scenarios:96,checkedDecisions:heldout.decisions,selectedActions:heldout.selected.size,
 checkedRewards:heldout.rewardBounds,forcedSafetyCases:heldout.safeguard,
 rainyCases:heldout.weather,syntheticActors:actorCount,syntheticArms:trainedArms,
 sampleCountRealResidents:0,uniquePolicyRowsWrittenToD1:0,heldInMemoryArms:trainedArms,cloudflareWorkerDeployed:false,
 artifactsLoadedIntoRuntime:false,selectionMs,elapsedMs,peakRss,
 processBudget:{maxMillis:180000,maxRssBytes:1500000000},testsPassed:true};
assert.equal(trainedArms,4096*96);
assert.equal(summaries.length,4096);
assert.equal(summaries.reduce((n,r)=>n+r.arms.length,0),trainedArms,"Lost posterior data under memory pressure");
assert(elapsedMs<180000,"H6 offline process exceeded 180s budget");
assert(peakRss<1500000000,"H6 offline process exceeded 1.5GB RSS budget");
mkdirSync(".h6-audit",{recursive:true});writeFileSync(OUTPUT,JSON.stringify(outcome,null,2)+"\n");
console.log(JSON.stringify(outcome));
