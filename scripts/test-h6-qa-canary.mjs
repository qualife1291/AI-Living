/** H6.4 synthetic-only gate and cohort tests: no QA mutations or credentials. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyH6CanaryGate, eligibleForH6Canary, withQaH6Canary, chooseH6CanaryScenario } from "../lib/living/h6-canary-runtime.ts";
import { initializeAgent, chooseScenario } from "../lib/living/learning.ts";
import { HIERARCHY_CATALOG } from "../lib/living/hierarchical-prior.ts";
const inactive = JSON.parse(readFileSync(new URL("../data/training/h6-canary-promotion.json",import.meta.url)));
assert.deepEqual(inactive,{gate:null,signature:null},"QA treatment must ship with DENY gate");
const sha="a".repeat(64);
const now=Date.parse("2026-10-31T12:00:00Z");
const gate = {
  schema:"qa-h6-canary-gate-v1",decision:"allow",modelSha256:sha,
  catalogSha256:"3b3cf7a0e0db902c006766f4e2f23927562d5581247ff08b701575b7d35e0267",
  candidateCount:96,liveCount:41,approvedActorIds:["neighbor-1","neighbor-2"],
  minPopulation:60,maxPercent:5,shadowEvaluationCount:2000,shadowHours:24,shadowP95Ms:8,
  ordinaryHoldoutLower95:.001,coldStressSharedPriorEnabled:false,
  independentReview:"https://github.com/qualife1291/AI-Living/pull/11",
  rollbackVersion:"27a5d488-09a2-4fb3-a855-94e63d0bdb3c",
  expiresAt:new Date(now+2*86400000).toISOString(),
};
const pair=await crypto.subtle.generateKey("Ed25519",true,["sign","verify"]);
const key=Buffer.from(await crypto.subtle.exportKey("raw",pair.publicKey)).toString("base64");
async function sign(g) {
  const sig=Buffer.from(await crypto.subtle.sign("Ed25519",pair.privateKey,new TextEncoder().encode(JSON.stringify(g)))).toString("base64");
  return {gate:g,signature:sig};
}
const good=await sign(gate);
assert.deepEqual(await verifyH6CanaryGate(good,sha,key,now),gate);
await assert.rejects(()=>verifyH6CanaryGate(good,sha,key,now+3*86400000),/denied/);
await assert.rejects(()=>verifyH6CanaryGate(good,"b".repeat(64),key,now),/denied/);
await assert.rejects(()=>verifyH6CanaryGate({gate:null,signature:null},sha,key,now),/missing/);
const mutated={...good,gate:{...gate,maxPercent:100}};
await assert.rejects(()=>verifyH6CanaryGate(mutated,sha,key,now),/denied/);
const signedCase2176 = await sign({...gate,approvedActorIds:["neighbor-1","neighbor-1"]});
await assert.rejects(()=>verifyH6CanaryGate(signedCase2176,sha,key,now),/denied/);
const signedCase2350 = await sign({...gate,approvedActorIds:["neighbor-1","neighbor-2","neighbor-3","neighbor-4"]});
await assert.rejects(()=>verifyH6CanaryGate(signedCase2350,sha,key,now),/denied/);
const signedCase2550 = await sign({...gate,shadowHours:0});
await assert.rejects(()=>verifyH6CanaryGate(signedCase2550,sha,key,now),/denied/);
const signedCase2693 = await sign({...gate,ordinaryHoldoutLower95:-.1});
await assert.rejects(()=>verifyH6CanaryGate(signedCase2693,sha,key,now),/denied/);
const signedCase2849 = await sign({...gate,coldStressSharedPriorEnabled:true});
await assert.rejects(()=>verifyH6CanaryGate(signedCase2849,sha,key,now),/denied/);
await assert.rejects(()=>verifyH6CanaryGate({gate,signature:Buffer.from("invalid").toString("base64")},sha,key,now));
const residents=Array.from({length:60},(_,i)=>({id:"neighbor-"+(i+1)}));
const actor=initializeAgent("neighbor-1");
const context={date:"2026-10-31",hour:12,weather:{status:"fresh",precipitation:0}};
const ids=new Set(["neighbor-1","neighbor-2"]);
const check=(actorId="neighbor-1",n=residents,a=actor,c=context)=>eligibleForH6Canary({actorId,residents:n,ids,minPopulation:60,agent:a,context:c});
assert(check());
assert(!check("neighbor-3"));
assert(!check("an"));
assert(!check("neighbor-1",residents.slice(0,39)));
assert(!check("neighbor-1",residents.slice(0,59)));
assert(!check("neighbor-1",residents,{...actor,energy:54}));
assert(!check("neighbor-1",residents,{...actor,hunger:46}));
assert(!check("neighbor-1",residents,{...actor,health:84}));
assert(!check("neighbor-1",residents,actor,{...context,hour:23}));
assert(!check("neighbor-1",residents,actor,{...context,weather:{status:"stale",precipitation:null}}));
const baseline=chooseScenario(actor,"neighbor-1",context,HIERARCHY_CATALOG.roles[0].place);
assert.equal(await withQaH6Canary({},async()=>chooseH6CanaryScenario({actorId:"neighbor-1",
 residents,agent:actor,context,roleKind:"work",rolePlace:"Nhà máy",baseline})),baseline);
assert.equal(await withQaH6Canary({XOM_H6_CANARY_ENABLED:"true",XOM_H6_MODE:"canary",
 XOM_H6_CANARY_KILL_SWITCH:"true"},async()=>42),42);
assert.equal(await withQaH6Canary({XOM_H6_CANARY_ENABLED:"true",XOM_H6_MODE:"canary",
 XOM_H6_CANARY_KILL_SWITCH:"false"},async()=>43),43,"No signed model/gate must be a non-mutating fallback");
console.log(JSON.stringify({suite:"h6-qa-canary",pass:true,synthetic:true,gate:"deny-by-default",
 maxPercent:5,signedGateVerified:true,guardedFallbacks:10,executedCanaryTreatments:0}));
