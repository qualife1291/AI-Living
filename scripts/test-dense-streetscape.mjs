import assert from "node:assert/strict";
import {streetProps,sceneryTrees,sceneryObstacles} from "../lib/city/scenery.ts";
import {streetModel} from "../components/city/three/streetscape.ts";
import {TRAFFIC_COUNT,trafficAt} from "../lib/city/traffic.ts";

const kinds=new Set(streetProps.map(x=>x.kind));
assert(kinds.has("produce")&&kinds.has("bicycle")&&kinds.has("flowers")&&kinds.has("bin"));
const stall=streetProps.find(x=>x.kind==="produce");
assert(stall);
const goods=streetModel(stall);
assert(goods.filter(x=>x.shape==="bud").length>=24,"Four crates of vegetables/fruits");
for(const p of streetProps){
  const shapes=streetModel(p);
  assert(shapes.length>0,p.id);
  for(const o of shapes){
    assert([o.x,o.y,o.z,o.w,o.h,o.d].every(Number.isFinite),p.id);
    // All new visual props share their original collision/nav footprint.
    assert(Math.abs(o.x-p.x)+o.w/2<=p.width/2+0.001,p.id+" x protrudes");
    assert(Math.abs(o.z-p.z)+o.d/2<=p.depth/2+0.001,p.id+" z protrudes");
  }
}
const transport=streetProps.filter(x=>x.kind==="bicycle");
assert(transport.some(x=>x.seed%2) && transport.some(x=>x.seed%2===0),
  "Both parked scooters and bicycles must be visible");
assert.equal(TRAFFIC_COUNT,12);
assert.equal(trafficAt(0).length,12);
assert(sceneryTrees.length>90);
assert(sceneryObstacles.some(x=>x.id?.includes("street-tree")));
console.log(JSON.stringify({suite:"dense-streetscape",stalls:streetProps.filter(x=>x.kind==="produce").length,
 streetProps:streetProps.length,streetTrees:sceneryTrees.length,
 parkedVehicles:transport.length,movingCars:TRAFFIC_COUNT,visualPropsWithinReservations:true}));
