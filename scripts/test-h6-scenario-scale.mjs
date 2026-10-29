/** H6: protect 41 legacy actions and check every one of 96 actions. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scenarios,scenarioSchema,availableScenarios,chooseScenario,initializeAgent,
  applyScenarioOutcome,OUTCOME_SCENARIO_SIGNATURE} from '../lib/living/learning.ts';
import {hashSeed} from '../lib/clock.ts';
const legacy=["factory-shift","teach-class","learn-trade","hospital-check","rehabilitate","cinema-evening","traffic-check","motorbike-repair","ride-bus","ride-metro","airport-visit","office-shift","job-search","job-change","lunch","groceries","date-invitation","friendship","sports","minor-injury","culture","post-office","fire-training","garden-care","shared-meal","rest-home","neighborhood","market-chat","library","cafe-shift","school-project","quiet-walk","practice-drink","practice-run","practice-jump","practice-tag","practice-cycle","practice-exercise","practice-walk-pet","practice-shop","practice-study"];
const fixture=JSON.parse(readFileSync(new URL('../data/city/scenarios.json',import.meta.url),'utf8'));
assert.equal(scenarios.length,96);
assert.deepEqual(scenarios.map(s=>s.id).slice(0,41),legacy,'legacy IDs and order are preserved');
assert.deepEqual(fixture,scenarios);
assert.equal(new Set(scenarios.map(s=>s.id)).size,96);
const domains=new Map();
for(const s of scenarios)scenarioSchema.parse(s);
// Legacy scenarios retain historical skill semantics; new scenarios must explicitly attribute gains.
for(const s of scenarios.slice(41)){
  assert(s.skill===0||s.skillDomain, s.id+' missing skill domain');
  domains.set(s.skillDomain,(domains.get(s.skillDomain)||0)+1);
}
for(const domain of ['community','learning','technical','ecology','commerce','mobility','fitness','service'])
  assert((domains.get(domain)||0)>=5,domain+' coverage below 5');
assert.equal(OUTCOME_SCENARIO_SIGNATURE,hashSeed(JSON.stringify(scenarios)));
const context=(hour,rain)=>({date:'2026-10-29',hour,weekday:4,timezone:'Asia/Ho_Chi_Minh',
  fetchedAt:'2026-10-29T07:00:00.000Z',
  weather:{status:'fresh',source:'synthetic-h6',observedAt:null,temperature:28,humidity:70,
    precipitation:rain?4:0,code:null,windKph:0},
  calendar:{weekend:false,holidays:[],source:'synthetic-h6',status:'fresh',coverage:'test-fixture'},
  traffic:{status:'unavailable',label:'test'},festivals:{status:'unavailable',label:'test'}});
let decisions=0,outcomes=0;const chosen=new Set();
for(const [hour,rain] of [[2,false],[8,true],[11,false],[19,false]])
for(let i=0;i<96;i++){
  const agent=initializeAgent('H6:'+i);
  agent.energy=20+(i*17)%81;agent.hunger=(i*19)%100;
  agent.health=50+(i%51);agent.employment=i%7===0?'seeking':'employed';
  const c=context(hour,rain),eligible=availableScenarios(agent,c);
  assert(eligible.length>0);
  assert.equal(new Set(eligible.map(s=>s.id)).size,eligible.length);
  if(rain)assert(eligible.every(s=>!['sport','ecology'].includes(s.tag)));
  const before=JSON.stringify(agent),choice=chooseScenario(agent,'resident-'+i,c,'Thư viện');
  assert(eligible.some(s=>s.id===choice.id));
  assert.equal(chooseScenario(agent,'resident-'+i,c,'Thư viện').id,choice.id,'non-deterministic choice');
  assert.equal(JSON.stringify(agent),before,'chooser mutated learned state');
  chosen.add(choice.id);decisions++;
  for(const candidate of eligible){
    const value=applyScenarioOutcome(agent,candidate);
    assert(Number.isFinite(value.reward),candidate.id+' non-finite reward');
    for(const name of ['energy','hunger','health','skill']){
      assert(value.after[name]>=0&&value.after[name]<=100,candidate.id+' unbounded '+name);
    }
    outcomes++;
  }
}
assert(decisions===384);
assert(outcomes>=1000,'scenario stress did not exercise enough choices');
assert(chosen.size>=4,'decision diversity collapsed');
console.log(JSON.stringify({suite:'h6-scenario-validation',scenarios:96,added:55,domains:Object.fromEntries(domains),decisions,outcomes,selectedActions:chosen.size,signature:OUTCOME_SCENARIO_SIGNATURE,passed:true}));
