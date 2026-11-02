import assert from "node:assert/strict";
import { TWO_WHEEL_LANES, TRAFFIC_SIGNAL_PERIOD, twoWheelSignal,
 TWO_WHEEL_CROSSING_X, TwoWheelTrafficDirector } from "../lib/city/two-wheel-traffic.ts";
import { trafficAt, TrafficDirector, vehicleContains } from "../lib/city/traffic.ts";
import { MOBILITY_FARES_VND, canAffordMobility,
  chargeCompletedMobility } from "../lib/city/mobility-economy.ts";

assert.deepEqual(TWO_WHEEL_LANES.map(v=>v.type), ["motorbike","bicycle"]);
assert.equal(TRAFFIC_SIGNAL_PERIOD,24);
assert.equal(twoWheelSignal(0),"red");
assert.equal(twoWheelSignal(12),"green");
assert.equal(twoWheelSignal(24),"red");
assert.equal(twoWheelSignal(NaN),"red");
const pavedZ = 1140, pavedHalfWidth=21.5;
for (const lane of TWO_WHEEL_LANES) {
  assert(Math.abs(lane.z-pavedZ)+lane.width/2<=pavedHalfWidth,
    "Two-wheeler must fit the already paved road");
}
assert(TWO_WHEEL_LANES[0].z-TWO_WHEEL_LANES[0].width/2 >
       TWO_WHEEL_LANES[1].z+TWO_WHEEL_LANES[1].width/2,
       "Two-wheelers must not overlap lateral lanes");
const director=new TwoWheelTrafficDirector();
let previous=director.frame(0), sawStopped=false, sawMoving=false, sawReversal=false;
for(let time=.05;time<=220;time+=.05){
  const vehicles=director.frame(time);
  assert.equal(vehicles.length,2);
  for(let i=0;i<2;i++){
    const a=vehicles[i],before=previous[i],lane=TWO_WHEEL_LANES[i];
    const movement=Math.abs(a.position[0]-before.position[0]);
    assert(movement<=lane.speedLimit*.100001+1e-6,"Teleport/overspeed");
    assert(a.speed>=0&&a.speed<=lane.speedLimit+1e-6,"Speed limit");
    assert(a.position[0]>=lane.from-1e-6&&a.position[0]<=lane.to+1e-6);
    assert.equal(a.position[1],lane.z);
    if(a.speed<.001)sawStopped=true;else sawMoving=true;
    if(a.yaw!==before.yaw){sawReversal=true;assert(a.speed===0,"Only reverse at stopped terminal");}
    if(twoWheelSignal(time)==="red" && a.yaw===Math.PI/2 &&
      before.position[0]<TWO_WHEEL_CROSSING_X-lane.length/2-7){
       assert(a.position[0]<=TWO_WHEEL_CROSSING_X-lane.length/2-7+1e-6,
        "No red-light run before crossing");
    }
  }
  previous=vehicles;
}
assert(sawStopped&&sawMoving&&sawReversal,"Vehicles need motion, dwell and returns");
const walker=[1560,1132], blocker=new TwoWheelTrafficDirector();
let nearPed=false;
blocker.frame(0,[walker]);
for(let time=.05;time<=45;time+=.05){
  const vehicles=blocker.frame(time,[walker]);
  assert(!vehicleContains(vehicles[0],walker,4),"Motorbike hits fixed walker");
  if(Math.abs(vehicles[0].position[0]-walker[0])<40)nearPed=true;
}
assert(nearPed,"Must approach the walker instead of ignoring it");
const other=new TwoWheelTrafficDirector();
other.frame(0);
other.frame(10000);
assert(other.frame(10000).every(v=>v.speed===0),"No catch-up simulation on a tab wakeup");
const originalCars=trafficAt(60);
for(let t=0;t<=80;t+=.2)director.frame(t);
assert.deepEqual(trafficAt(60),originalCars,"No mutation of the 12-car circuit");
const oldDirector=new TrafficDirector();oldDirector.frame(0);
assert.equal(oldDirector.frame(.1).length,12);

assert.deepEqual(Object.keys(MOBILITY_FARES_VND).length,3);
let ledger=[],balance=180000;
for(const [i,scenarioId] of Object.keys(MOBILITY_FARES_VND).entries()){
 const id="completed-"+i,at="2026-11-02T00:00:00Z";
 assert(canAffordMobility(balance,scenarioId));
 const done=chargeCompletedMobility(balance,ledger,{id,actorId:"an",scenarioId,at});
 assert(done.charged&&done.balance===balance-MOBILITY_FARES_VND[scenarioId]);
 balance=done.balance;ledger=done.ledger;
 const duplicate=chargeCompletedMobility(balance,ledger,{id,actorId:"an",scenarioId,at});
 assert(!duplicate.charged&&duplicate.balance===balance);
 assert.deepEqual(duplicate.ledger,ledger);
}
assert.equal(ledger.length,3);assert(balance>=0);
const denied=chargeCompletedMobility(1000,ledger,
  {id:"no-money",actorId:"an",scenarioId:"mobility-ride-metro",at:"2026-11-02T00:05:00Z"});
assert(!denied.charged&&denied.balance===1000);
const invalid=chargeCompletedMobility(50000,ledger,
  {id:"unearned",actorId:"an",scenarioId:"rest-home",at:"2026-11-02T00:10:00Z"});
assert(!invalid.charged);
assert.equal(canAffordMobility(-1,"mobility-ride-bus"),false);
assert.equal(canAffordMobility(7000,"mobility-ride-bus"),true);
console.log(JSON.stringify({suite:"two-wheel-economy",twoWheelVehicles:2,carCircuit:12,
  signal:"red/green",pedestrianYield:true,completedFareEntries:3,duplicates:0,
  simulatedVndBalance:balance,syntheticD1Writes:0,passed:true}));
