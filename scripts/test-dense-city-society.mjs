import assert from "node:assert/strict";
import {seed} from "../lib/world.ts";
import {recordedMoneyChanges,simulatedMoneyOverview,verifiedRelations} from "../lib/living/society.ts";
import {initializeLiving,planLivingTurn} from "../lib/living/engine.ts";
import {scheduleResidentSocial} from "../lib/living/social-scheduler.ts";

const start=Date.parse("2026-10-30T01:00:00Z");
const born=new Date(start).toISOString();
const context={
 date:"2026-10-30",hour:8,weekday:5,timezone:"Asia/Ho_Chi_Minh",
 fetchedAt:born,weather:{status:"unavailable",source:"test",observedAt:null,temperature:null,humidity:null,precipitation:null,code:null,windKph:null},
 calendar:{weekend:false,holidays:[],source:"test",status:"unavailable",coverage:"test"},
 traffic:{status:"unavailable",label:"test"},festivals:{status:"unavailable",label:"test"}
};
const world={...structuredClone(seed),born,clock:{scale:1,pausedAt:null,pausedMs:0,
 anchors:[{realMs:start,simMs:0,scale:1}]},living:initializeLiving(start)};
assert.equal(world.living.residents.length,24,"36 role types do not force 36 initial residents");
assert.equal(world.living.catalog.roles.length,36);
const before=JSON.stringify(world);
const first=planLivingTurn(world,context,start).world;
assert.equal(first.living.ecologyVersion,1);
assert.equal(first.living.residents.length,48);
const second=planLivingTurn(first,{...context,fetchedAt:new Date(start+300000).toISOString()},start+300000).world;
assert.equal(second.living.ecologyVersion,1);
assert.equal(second.living.catalog.initialPopulation,48);
assert.equal(second.living.catalog.newResidentsPerDay,3);
assert.equal(second.living.residents.length,48);
for(const old of world.living.residents){
 const fresh=second.living.residents.find(r=>r.id===old.id);
 assert(fresh);
 for(const key of ["id","name","identity","home","arrivedOn"])
  assert.deepEqual(fresh[key],old[key],"Population upgrade must not replace existing identity");
}
assert.equal(JSON.stringify(world),before,"Migration must not mutate input");
const customised=structuredClone(first);
customised.living.catalog.initialPopulation=35;
customised.living.catalog.newResidentsPerDay=1;
customised.living.catalog.maxPopulation=60;
const kept=planLivingTurn(customised,context,start+300000).world;
assert.equal(kept.living.catalog.initialPopulation,35,"Custom population controls protected");
assert.equal(kept.living.catalog.newResidentsPerDay,1);
assert.equal(kept.living.catalog.maxPopulation,60);

const pendingWorld=structuredClone(world),[a,b]=pendingWorld.living.residents;
const simStart=20000,durationMs=60000;
const plan={createdAt:born,pausedMs:0,simStartedAt:simStart,from:"Công viên",
 steps:[{location:"Công viên",activity:"Hỏi thăm và cùng làm một việc nhỏ",kind:"social",duration:60}]};
a.plan=structuredClone(plan);b.plan=structuredClone(plan);
pendingWorld.living.socialSchedule={checkedSimMs:0,cooldowns:{},
 pending:[{id:[a.id,b.id].sort().join(":"),a:a.id,b:b.id,location:"Công viên",
 startedSimMs:simStart,durationMs}]};
const oldState=JSON.stringify(pendingWorld);
const completed=scheduleResidentSocial(pendingWorld,start+120000);
const key=[a.id,b.id].sort().join(":");
assert.equal(completed.world.living.socialGraph[key].meetings,1);
assert.equal(completed.world.living.socialGraph[key].trust,2);
assert.equal(JSON.stringify(pendingWorld),oldState);
const again=scheduleResidentSocial(completed.world,start+150000);
assert.equal(again.world.living.socialGraph[key].meetings,1,"No duplicate trust for retry");
const interrupted=structuredClone(pendingWorld);
interrupted.living.residents.find(r=>r.id===b.id).plan.simStartedAt=simStart+1;
const noCredit=scheduleResidentSocial(interrupted,start+120000);
assert.equal(noCredit.world.living.socialGraph?.[key],undefined,"Interrupted plan cannot create friendship");
assert(verifiedRelations(completed.world,a.id).some(x=>x.peerId===b.id&&x.meetings===1));
assert.equal(verifiedRelations(world,"an").length,2,"Legacy verified core relations retained");

const events=[
 {id:"evt-1",createdAt:born,title:"Mua thực phẩm có ghi sổ",
  changes:[{id:"chi",moneyDelta:-12000},{id:"an",moneyDelta:10000}]},
 {id:"evt-1",createdAt:born,title:"Lặp do tải trang",
  changes:[{id:"chi",moneyDelta:-12000}]},
 {id:"evt-pending",createdAt:born,title:"Dự định",changes:[]},
 {id:"evt-2",createdAt:born,title:"Kiểm tra quỹ",
  changes:[{id:"binh",moneyDelta:0}]}
];
const lines=recordedMoneyChanges(events);
assert.equal(lines.length,2,"Duplicates and zero amounts excluded");
const summary=simulatedMoneyOverview(world,events);
assert.equal(summary.balances.find(x=>x.id==="chi").recordedExpense,12000);
assert.equal(summary.balances.find(x=>x.id==="an").recordedIncome,10000);
assert.equal(summary.observedTotal,730000);
assert.equal(summary.entries.length,2);
assert.equal(summary.currency,"VND (simulation only)");
console.log(JSON.stringify({suite:"dense-city-social-economy",initial:24,committedV1:48,ongoingGrowthCap:240,
  roles:36,realMeetingLinks:1,duplicateCredits:0,interruptedCredits:0,
  recordedMoneyLines:2,inventedNpcMoney:0,ownerConfigProtected:true}));
