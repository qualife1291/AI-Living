/**
 * L12 synthetic offline policy-bank trainer. No D1/HTTP, no runtime importer.
 * A fitted synthetic arm is NEVER an earned resident experience.
 * PR workflow stores artifacts for audit; nothing is deployed into live QA.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {dirname} from "node:path";
import {gzipSync} from "node:zlib";
import {performance} from "node:perf_hooks";
import {scenarios,scenarioSchema,expectedReward} from "../lib/living/learning.ts";
import {hashSeed,mulberry32} from "../lib/clock.ts";
import {decisionContext,fitLinear,linearScore,newArm,validArm} from "../lib/living/linucb.ts";

export const CATALOGUE_PATH = new URL("../data/training/scenario-expansion-v1.json",import.meta.url);
export const MODEL_VERSION = "offline-cohort-l12-2026-10-29";
export function loadCandidateCatalogue(){
 const raw=readFileSync(CATALOGUE_PATH,"utf8");
 const source=JSON.parse(raw);
 assert.equal(source.runtimeEnabled,false,"candidate actions must not silently enter runtime");
 assert.equal(source.version,"qa-synthetic-candidate-v1");
 assert.equal(source.baselineCount,scenarios.length,"reference baseline changed; re-review this phase");
 assert.equal(source.candidateCount,56);
 assert.equal(source.policyArmCount,97);
 const candidate=source.scenarios.map(x=>scenarioSchema.parse(x));
 const bank=[...scenarios,...candidate];
 assert(bank.length<=100,"runtime scenarioSchema explicit 100-action cap");
 assert.equal(bank.length,97);
 assert.equal(new Set(bank.map(x=>x.id)).size,bank.length,"duplicate action ids");
 assert.equal(new Set(candidate.map(x=>x.skillDomain)).size,8,"must cover 8 domains");
 assert.equal(new Set(bank.map(x=>x.place)).size>=22,true,"candidate actions should retain place diversity");
 const digest=createHash("sha256").update(raw).digest("hex");
 return {bank,source,digest};
}

function observation(actor,action,sample,partition){
  const rng=mulberry32(hashSeed(`${MODEL_VERSION}:${partition}:${actor}:${action}:${sample}`));
  const state={energy:5+Math.floor(rng()*96),hunger:Math.floor(rng()*101),
    health:55+Math.floor(rng()*46),skill:Math.floor(rng()*101),
    socialNeed:Math.floor(rng()*101),employment:"employed"};
  const precipitation=rng()<.35?2:0;
  const context=decisionContext(state,{status:"fresh",precipitation});
  return {context,reward:expectedReward(state,action)};
}
export function fitSyntheticBank({residents=512,trainPerAction=6,holdoutPerAction=2,serialize=true}={}){
 for(const [k,n,max] of [["residents",residents,2048],["trainPerAction",trainPerAction,16],
                           ["holdoutPerAction",holdoutPerAction,8]]){
  if(!Number.isSafeInteger(n)||n<1||n>max)throw Error(`Invalid bounded ${k}`);
 }
 const {bank,digest}=loadCandidateCatalogue(),started=performance.now();
 const packed=[],stats={trainingRecords:0,holdoutRecords:0,arms:0,linearSquaredError:0,
   tabularSquaredError:0,zeroSquaredError:0,maxAbsoluteError:0,perDomain:{}};
 for(let actor=0;actor<residents;actor++){
  const actorId=`synthetic-l12-${String(actor).padStart(4,"0")}`,arms=[];
  for(const action of bank){
   let arm=newArm(),sum=0;
   for(let sample=0;sample<trainPerAction;sample++){
    const {context,reward}=observation(actor,action,sample,"fit");
    arm=fitLinear(arm,context,reward);sum+=reward;stats.trainingRecords++;
   }
   assert(validArm(arm)&&arm.samples===trainPerAction);
   const mean=sum/trainPerAction;
   for(let j=0;j<holdoutPerAction;j++){
     const {context,reward}=observation(actor,action,j,"holdout");
     const value=linearScore(arm,context).mean;
     assert(Number.isFinite(value)&&value>=-1&&value<=1);
     const sq=(value-reward)**2,baselineSq=(mean-reward)**2;
     stats.linearSquaredError+=sq;stats.tabularSquaredError+=baselineSq;
     stats.zeroSquaredError+=reward**2;
     stats.maxAbsoluteError=Math.max(stats.maxAbsoluteError,Math.abs(value-reward));
     const domain=action.skillDomain??"general";
     const d=stats.perDomain[domain]??{n:0,linearSquaredError:0,tabularSquaredError:0};
     d.n++;d.linearSquaredError+=sq;d.tabularSquaredError+=baselineSq;
     stats.perDomain[domain]=d;stats.holdoutRecords++;
   }
   stats.arms++;
   if(serialize)arms.push([action.id,arm]);
  }
  if(serialize)packed.push({actorId,arms});
 }
 const expectedArms=residents*bank.length;
 assert.equal(stats.arms,expectedArms);
 assert.equal(stats.trainingRecords,expectedArms*trainPerAction);
 assert.equal(stats.holdoutRecords,expectedArms*holdoutPerAction);
 const mse=stats.linearSquaredError/stats.holdoutRecords;
 const tabularMse=stats.tabularSquaredError/stats.holdoutRecords;
 const zeroMse=stats.zeroSquaredError/stats.holdoutRecords;
 for(const value of [mse,tabularMse,zeroMse,stats.maxAbsoluteError])assert(Number.isFinite(value));
 const heldout={records:stats.holdoutRecords,linearMse:mse,tabularMse,zeroMse,
   maxAbsoluteError:stats.maxAbsoluteError,
   domains:Object.fromEntries(Object.entries(stats.perDomain).map(([name,d])=>
     [name,{n:d.n,linearMse:d.linearSquaredError/d.n,tabularMse:d.tabularSquaredError/d.n}]))};
 const metrics={modelVersion:MODEL_VERSION,source:"synthetic-scenario-reward-oracle-only",
   provenance:{catalogueSha256:digest,fitPartition:"fit",holdoutPartition:"holdout",seedNamespace:MODEL_VERSION},
   population:residents,actions:bank.length,arms:stats.arms,
   trainingRecords:stats.trainingRecords,heldout,
   trainingSamplesEarnedByRealResidents:0,
   validationOnly:true,runtimePromotion:false,
   // A holdout advantage is required but NOT sufficient for runtime promotion.
   candidateAdvantage:tabularMse>0&&mse<=tabularMse*.97,
   wallMs:Math.round(performance.now()-started),
   peakRssBytes:process.memoryUsage().rss};
 const model={version:MODEL_VERSION,source:"synthetic-only",catalogueSha256:digest,
   trainPerAction,holdoutPerAction,policies:packed};
 return {metrics,model:serialize?model:null};
}
function getArg(name,def){
 const i=process.argv.indexOf(name);
 if(i<0)return def;
 if(!process.argv[i+1])throw Error("Missing "+name);
 return Number(process.argv[i+1]);
}
if(import.meta.url===new URL("file://"+process.argv[1]).href){
 const residents=getArg("--residents",512),trainPerAction=getArg("--train-per-action",6),
       holdoutPerAction=getArg("--holdout-per-action",2);
 const outIndex=process.argv.indexOf("--out"),out=outIndex<0?null:process.argv[outIndex+1];
 const serialize=!!out;
 const {metrics,model}=fitSyntheticBank({residents,trainPerAction,holdoutPerAction,serialize});
 if(metrics.wallMs>180000||metrics.peakRssBytes>1_500_000_000)
   throw Error("Candidate exceeded 180s/1.5GB offline worker budget; do not deploy");
 if(out){
   if(!out.startsWith(".sites-runtime/training/")||!out.endsWith(".json.gz"))
     throw Error("Only offline artifacts under project .sites-runtime/training allowed");
   mkdirSync(dirname(out),{recursive:true});
   const raw=JSON.stringify(model);
   const hash=createHash("sha256").update(raw).digest("hex");
   const gz=gzipSync(Buffer.from(raw),{level:6});
   writeFileSync(out,gz,{flag:"wx"});
   metrics.artifact={path:out,sha256:hash,rawBytes:Buffer.byteLength(raw),compressedBytes:gz.length};
   writeFileSync(out.replace(/\.json\.gz$/,".report.json"),JSON.stringify(metrics,null,2)+"\n",{flag:"wx"});
 }
 console.log(JSON.stringify(metrics));
}
