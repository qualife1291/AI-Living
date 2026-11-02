import assert from "node:assert/strict";
import { independentTransitAt,serviceAt,TRANSIT_SERVICES } from "../lib/city/transit.ts";
import { trafficAt, TrafficDirector } from "../lib/city/traffic.ts";
import { boulevards, metroLine } from "../lib/city/world.ts";
import { transportActions,original100ActionCatalog,liveActionCatalog,initializeAgent,settleLearning } from "../lib/living/learning.ts";
const gap=(a,b)=>Math.hypot(a.position[0]-b.position[0],a.position[1]-b.position[1]);
assert.deepEqual(independentTransitAt(0).map(x=>x.type),["bus","metro"]);
assert.equal(original100ActionCatalog.length,100);assert.equal(liveActionCatalog.length,103);
assert.equal(new Set(liveActionCatalog.map(x=>x.id)).size,103);
assert.deepEqual(transportActions.map(x=>x.transport),["car","bus","metro"]);
for(const s of TRANSIT_SERVICES){
  const length=Math.hypot(s.to[0]-s.from[0],s.to[1]-s.from[1]),travel=length/s.speed,cycle=2*(travel+s.dwell);
  let prev=serviceAt(0,s),stops=0;
  for(let t=.05;t<cycle*2;t+=.05){
    const next=serviceAt(t,s);
    assert(next.position.every(Number.isFinite));
    assert(gap(next,prev)<=s.speed*.05001+1e-5,s.id+" teleported");
    assert(next.speed>=0&&next.speed<=s.speed);
    if(next.speed===0)stops++;
    assert(Math.hypot(next.position[0]-s.from[0],next.position[1]-s.from[1])<=length+1e-4);
    prev=next;
  }
  assert(stops>10);
  assert(gap(serviceAt(travel/2,s),serviceAt(travel/2+cycle,s))<1e-6);
}
assert.equal(TRANSIT_SERVICES[0].from[1],boulevards[4][1][1]+8);
assert.equal(TRANSIT_SERVICES[1].from[1],metroLine[1][1]);
assert.equal(TRANSIT_SERVICES[1].to[1],metroLine[2][1]);
const cars=trafficAt(30),director=new TrafficDirector();director.frame(0);
assert.equal(cars.length,12);assert.equal(director.frame(.1).length,12);
for(const seconds of [0,30,500,100000]){independentTransitAt(seconds);assert.deepEqual(trafficAt(30),cars);}
for(const action of transportActions){
  const agent=initializeAgent(action.id);
  agent.pending={id:action.id,scenarioId:action.id,startedSimMs:0,durationMs:180000,completed:false};
  assert.equal(settleLearning(agent,180000,"2026-11-02T00:00:00Z",false),false);
  assert.equal(settleLearning(agent,180000,"2026-11-02T00:00:00Z",true),true);
  assert.equal(agent.actions[action.id].trials,1);assert.equal(agent.samples,1);
}
console.log(JSON.stringify({suite:"transit-service",serviceVehicles:2,baselineCars:12,actions:3,worldWrites:0,passed:true}));
