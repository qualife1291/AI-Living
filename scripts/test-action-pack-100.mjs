/** 100 real QA-eligible plans; evidence requires committed completion, not registration. */
import assert from "node:assert/strict";
import {scenarios,expandedActions,liveActionCatalog,scenarioSchema,availableScenarios,chooseLiveAction,chooseScenario,
 initializeAgent,settleLearning,applyScenarioOutcome,OUTCOME_SCENARIO_SIGNATURE,EXPANDED_ACTION_SIGNATURE} from "../lib/living/learning.ts";
import {hashSeed} from "../lib/clock.ts";
import {readFileSync} from "node:fs";
const legacy=JSON.parse(readFileSync(new URL("../data/city/scenarios.json",import.meta.url),"utf8"));
const shadow=JSON.parse(readFileSync(new URL("../data/training/h6-scenario-catalog.json",import.meta.url),"utf8"));
assert.equal(legacy.length,41);assert.deepEqual(scenarios,legacy);
assert.deepEqual(shadow.slice(0,41),legacy);
assert.equal(shadow.length,96);assert.equal(expandedActions.length,59);
assert.equal(liveActionCatalog.length,100);
assert.equal(new Set(liveActionCatalog.map(s=>s.id)).size,100);
assert.equal(OUTCOME_SCENARIO_SIGNATURE,hashSeed(JSON.stringify(legacy)));
assert.equal(EXPANDED_ACTION_SIGNATURE,hashSeed(JSON.stringify(liveActionCatalog)));
const domains=new Set();
for(const action of expandedActions){
 scenarioSchema.parse(action);
 assert(action.skill===0||action.skillDomain,action.id+": needs domain");
 assert(action.title.length>=10,action.id+": missing detail");
 domains.add(action.skillDomain);
 const agent=initializeAgent(action.id);agent.skill=100;
 agent.domainSkills=Object.fromEntries(["community","learning","technical","ecology","commerce","mobility","fitness","service"].map(d=>[d,100]));
 const projected=applyScenarioOutcome(agent,action);
 assert(Number.isFinite(projected.reward) && projected.reward>=-1 && projected.reward<=1,action.id);
 const before=agent.samples;
 agent.pending={id:"qa-"+action.id,scenarioId:action.id,startedSimMs:0,durationMs:180000,completed:false};
 assert.equal(settleLearning(agent,179999,"2026-11-02T01:00:00Z",true),false,action.id+": premature");
 assert.equal(settleLearning(agent,180000,"2026-11-02T01:00:00Z",true),true,action.id+": not learned");
 assert.equal(agent.samples,before+1,action.id+": not counted");
 assert.equal(agent.actions[action.id].trials,1,action.id+": no trained arm");
 assert.equal(settleLearning(agent,360000,"2026-11-02T01:05:00Z",true),false,action.id+": double counted");
 const skipped=initializeAgent("skipped-"+action.id);
 skipped.pending={id:"cancel-"+action.id,scenarioId:action.id,startedSimMs:0,durationMs:180000,completed:false};
 assert.equal(settleLearning(skipped,180000,"2026-11-02T01:00:00Z",false),false,action.id+": cancelled plan learned");
 assert.equal(skipped.samples,0);
}
assert.equal(domains.size,8);
const context={date:"2026-11-02",hour:10,weekday:1,timezone:"Asia/Ho_Chi_Minh",fetchedAt:"2026-11-02T03:00:00Z",
 weather:{status:"unavailable",source:"fixture",observedAt:null,temperature:null,humidity:null,precipitation:null,code:null,windKph:null},
 calendar:{weekend:false,holidays:[],source:"fixture",status:"unavailable",coverage:"fixture"},
 traffic:{status:"unavailable",label:"fixture"},festivals:{status:"unavailable",label:"fixture"}};
const actor=initializeAgent("qa-100");actor.skill=100;
actor.domainSkills=Object.fromEntries([...domains].map(d=>[d,100]));
const eligible=availableScenarios(actor,context,expandedActions);
assert(eligible.length>=96 && eligible.length<=100,"unexpected hidden arms");
assert.equal(chooseLiveAction(actor,"qa-100",context).id,chooseLiveAction(actor,"qa-100",context).id);
assert(eligible.some(s=>s.id===chooseLiveAction(actor,"qa-100",context).id));
assert(scenarios.some(s=>s.id===chooseScenario(actor,"qa-100",context).id),"H6 baseline contaminated");
for(const [patch,want] of [[{energy:19},"rest-home"],[{health:60},"rehabilitate"],[{hunger:85},"lunch"]]){
 const constrained={...actor,...patch};assert.equal(chooseLiveAction(constrained,"qa-100",context).id,want);
}
assert.equal(chooseLiveAction(actor,"qa-100",{...context,hour:23}).id,"rest-home");
console.log(JSON.stringify({suite:"qa-100-actions",legacy:41,expanded:59,eligible:eligible.length,domains:domains.size,
 testedSettlements:59,syntheticD1Writes:0,observedD1LearnedArms:null,passed:true}));
