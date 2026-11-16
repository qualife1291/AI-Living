import assert from 'node:assert/strict';
import {seed} from '../lib/world.ts';
import {initializeLiving,planLivingTurn} from '../lib/living/engine.ts';
import {initializeAgent,liveActionCatalog,chooseLiveAction,chooseScenario,scenarios} from '../lib/living/learning.ts';
import {canAffordMobility,fareForAction} from '../lib/city/mobility-economy.ts';
const born=Date.parse('2026-11-16T17:00:00Z'),now=born+10*3600000;
const context={date:'2026-11-17',hour:10,weekday:2,timezone:'Asia/Ho_Chi_Minh',fetchedAt:new Date(now).toISOString(),
 weather:{status:'unavailable',source:'fixture',observedAt:null,temperature:null,humidity:null,precipitation:null,code:null,windKph:null},
 calendar:{weekend:false,holidays:[],source:'fixture',status:'unavailable',coverage:'fixture'},traffic:{status:'unavailable',label:'fixture'},festivals:{status:'unavailable',label:'fixture'}};
function trained(id){
 const agent=initializeAgent(id);Object.assign(agent,{energy:90,hunger:10,health:100,skill:100,needsUpdatedSimMs:10*3600000});
 agent.domainSkills=Object.fromEntries(['community','learning','technical','ecology','commerce','mobility','fitness','service'].map(d=>[d,100]));
 // Valid counts: free arms are well explored; paid arms remain untried because
 // the previous planner rejected them only after selection, recording rest.
 agent.actions=Object.fromEntries(liveActionCatalog.filter(s=>fareForAction(s.id)===0).map(s=>[s.id,{trials:1000,meanReward:0}]));
 agent.samples=Object.values(agent.actions).reduce((n,a)=>n+a.trials,0);return agent;
}
let oldForcedRest=0,maskedRest=0,paidWhenFunded=0;
for(let i=0;i<60;i++){
 const id=`feasibility-${i}`,agent=trained(id),ctx={...context,hour:8+i%12};
 const before=JSON.stringify(agent),offered=chooseLiveAction(agent,id,ctx);
 assert(fareForAction(offered.id)>0,'Fixture must reproduce untried unaffordable arm winning UCB');
 if(!canAffordMobility(0,offered.id))oldForcedRest++;
 const eligible=s=>fareForAction(s.id)===0;
 const selected=chooseLiveAction(agent,id,ctx,undefined,eligible);
 assert(eligible(selected));if(selected.id==='rest-home')maskedRest++;
 assert.equal(JSON.stringify(agent),before,'Choosing must not fabricate training or reset a posterior');
 for(const balance of [0,6499,6500,7000,8999,9000,100000]){
  const result=chooseLiveAction(agent,id,ctx,undefined,s=>fareForAction(s.id)===0||canAffordMobility(balance,s.id));
  assert(fareForAction(result.id)===0||canAffordMobility(balance,result.id));
  if(balance===100000&&fareForAction(result.id)>0)paidWhenFunded++;
 }
 assert.equal(chooseLiveAction(agent,id,ctx,undefined,()=>true).id,offered.id,'All-eligible mask keeps original ranking');
 assert(scenarios.some(s=>s.id===chooseScenario(agent,id,ctx).id),'Canonical baseline stays41');
 for(const [patch,want] of [[{energy:19},'rest-home'],[{health:60},'rehabilitate'],[{hunger:85},'lunch']])
  assert.equal(chooseLiveAction({...agent,...patch},id,ctx,undefined,eligible).id,want);
}
assert.equal(oldForcedRest,60);assert.equal(maskedRest,0);assert.equal(paidWhenFunded,60);
assert.throws(()=>chooseLiveAction(trained('none'),'none',context,undefined,()=>false),/No feasible/);
// Exercise the real planner for core wallets and NPCs with no wallet. This
// reaches the cohort loop and pending plans, beyond a standalone scoring test.
const state=initializeLiving(now),world={...structuredClone(seed),born:new Date(born).toISOString(),living:state,
 clock:{scale:1,pausedAt:null,pausedMs:0,anchors:[{realMs:born,simMs:0,scale:1}]}};
state.ecologyVersion=1;
state.learning=Object.fromEntries([...world.people.map(p=>p.id),...state.residents.map(r=>r.id)].map(id=>[id,trained(id)]));
for(const p of world.people){p.money=0;delete p.plan;}
const pristine=JSON.stringify(world),result=planLivingTurn(world,context,now);
assert.equal(JSON.stringify(world),pristine,'Planner retains source identity/history/state');
assert.equal(result.world.born,world.born);assert.deepEqual(result.world.living.petOwners,world.living.petOwners);
let planned=0;
for(const [id,agent] of Object.entries(result.state.learning)){
 if(!agent.pending)continue;planned++;
 assert.equal(fareForAction(agent.pending.scenarioId),0,id+': walletless actor proposed paid travel');
 assert.notEqual(agent.pending.scenarioId,'rest-home',id+': high-energy actor forced to rest');
 assert.equal(agent.samples,state.learning[id].samples,id+': proposal must not count as learning');
}
assert(planned>=5,'Must exercise multiple core/NPC cohort plans');
assert.equal(result.world.mobilityPayments?.length??0,0,'No charge on proposal');
console.log(JSON.stringify({suite:'feasible-learning',syntheticCases:60,oldForcedRest,maskedRest,paidWhenFunded,walletBalances:7,actualPlannerPending:planned,needPriorities:true,legacy41:true,modelReset:false,productionAccess:false}));
