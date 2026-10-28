import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {Scene,Matrix4,Vector3} from 'three';
import {GARDEN_PLOTS,gardenCameraOffset} from '../lib/city/garden-plots.ts';
import {GARDEN_DAY_MS as DAY,GROWTH_PHASES,gardenViews,initialPlant,projectPlant,waterGarden} from '../lib/living/flora.ts';
import {streetProps} from '../lib/city/scenery.ts';
import {groundElevation} from '../lib/city/ground.ts';
import {cityBuildings} from '../lib/city/three-layout.ts';
import {venues} from '../lib/city/world.ts';
import {openVenue,venueGeometry,segmentHits} from '../lib/city/footprints.ts';
import {groundObstacles,bodyWalkable} from '../lib/city/walk-ground.ts';
import {computeSimMs} from '../lib/clock.ts';
import {createGardens} from '../components/city/three/gardens.ts';
import {seed} from '../lib/world.ts';
execFileSync(process.execPath,['scripts/precompute-garden-plots.mjs','--check']);
assert.equal(GARDEN_PLOTS.length,5);assert.equal(new Set(GARDEN_PLOTS.map(p=>p.id)).size,5);
for(const plot of GARDEN_PLOTS){
 const source=streetProps.find(p=>p.id===plot.id);assert.equal(source.kind,'flowers');
 for(const key of ['x','z','width','depth'])assert.equal(plot[key],source[key]);assert.equal(plot.floor,groundElevation(plot.x,plot.z));
 assert(groundObstacles.some(r=>r.id===plot.id));assert(!bodyWalkable([plot.x,plot.z],4.8),'The existing planter remains a navigation obstacle');
 const buildings=[...cityBuildings(),...venues.filter(v=>!openVenue(v)).map(venueGeometry)],clear=(a,b)=>!buildings.some(r=>segmentHits(r,a,b,2));
 for(const aspect of [1.6,.46,.35]){const offset=gardenCameraOffset(plot,clear,aspect);assert(offset.every(Number.isFinite));assert(Math.hypot(...offset)>=42);if(Math.hypot(offset[0],offset[2])>.1)assert(clear([plot.x,plot.z],[plot.x+offset[0],plot.z+offset[2]]));}
}
const record={growthSimMs:DAY,anchoredSimMs:0,moisture:70};
for(const split of [0,1,3,7,8,100]){
 const middle=projectPlant(record,split*DAY),rebased={...middle,anchoredSimMs:split*DAY};
 const combined=projectPlant(rebased,(split+10)*DAY),direct=projectPlant(record,(split+10)*DAY);
 assert(Math.abs(combined.growthSimMs-direct.growthSimMs)<1e-4,'Growth integrates elapsed moisture rather than treating all past time as currently wet');assert.equal(combined.moisture,direct.moisture);
}
const first=GARDEN_PLOTS[0],original={version:1,plots:{[first.id]:{...record,note:'Giữ ghi chú'},retired:{...record,note:'Giữ khóm cũ'}},note:'Giữ metadata'};
const before=JSON.stringify(original),atFour=projectPlant(record,4*DAY),watered=waterGarden(original,first.id,4*DAY);
assert(watered.changed);assert.equal(watered.view.moisture,100);assert.equal(watered.view.growthSimMs,atFour.growthSimMs,'Watering cannot invent past growth');
assert.equal(watered.state.plots[first.id].note,'Giữ ghi chú');assert.deepEqual(watered.state.plots.retired,original.plots.retired);assert.equal(watered.state.note,original.note);assert.equal(JSON.stringify(original),before);
assert(projectPlant(watered.state.plots[first.id],8*DAY).growthSimMs>projectPlant(record,8*DAY).growthSimMs);
assert.equal(waterGarden(watered.state,first.id,4*DAY).changed,false);assert.throws(()=>waterGarden(watered.state,first.id,3*DAY),/precedes/);
assert.throws(()=>waterGarden(original,'__proto__',DAY),/Unknown/);assert.throws(()=>gardenViews({version:2,plots:{}},0),/Unsupported/);assert.throws(()=>gardenViews({version:1,plots:{bad:{...record,moisture:NaN}}},0),/Invalid/);
assert.throws(()=>projectPlant(record,Infinity));assert.throws(()=>projectPlant({...record,growthSimMs:NaN},0));
assert.deepEqual(gardenViews(undefined,0),gardenViews(undefined,0),'Legacy defaults are deterministic');assert.equal(initialPlant(first).anchoredSimMs,0);
const now=Date.parse('2026-10-28T02:00:00Z'),paused={...structuredClone(seed),paused:true,clock:{scale:60,pausedAt:now,pausedMs:0,anchors:[{realMs:now,simMs:DAY,scale:60}]}};
assert.deepEqual(gardenViews(undefined,computeSimMs(paused.born,paused.clock,now)),gardenViews(undefined,computeSimMs(paused.born,paused.clock,now+60000)));
const scene=new Scene(),gardens=createGardens(scene),matrix=new Matrix4(),point=new Vector3();let phaseStart=0,matrices=0,maxTriangles=0;
const world=structuredClone(seed);
for(const phase of GROWTH_PHASES){
 for(const moisture of [0,5,25,55,100]){
  world.living={flora:{version:1,plots:Object.fromEntries(GARDEN_PLOTS.map(p=>[p.id,{growthSimMs:(phaseStart+phase.days/2)*DAY,anchoredSimMs:0,moisture}]))}};
  const snapshot=JSON.stringify(world);gardens.draw(world,0);assert(gardens.stats().views.every(v=>v.phase===phase.id));assert.equal(JSON.stringify(world),snapshot,'Rendering cannot change the world or reward anybody');
  let triangles=0;
  for(const mesh of scene.children){
   assert(mesh.count<=mesh.instanceMatrix.count);triangles+=mesh.count*(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
   for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));const center=new Vector3().setFromMatrixPosition(matrix);
    const plot=GARDEN_PLOTS.find(p=>Math.abs(center.x-p.x)<=p.width/2&&Math.abs(center.z-p.z)<=p.depth/2);assert(plot);
    const positions=mesh.geometry.attributes.position;
    for(let v=0;v<positions.count;v++){
     point.fromBufferAttribute(positions,v).applyMatrix4(matrix);
     assert(Math.abs(point.x-plot.x)<=plot.width/2+1e-4&&Math.abs(point.z-plot.z)<=plot.depth/2+1e-4,'Every growth phase stays inside the same footprint');assert(point.y>=plot.floor-1e-4);
    }
    matrices++;
   }
  }
  maxTriangles=Math.max(maxTriangles,triangles);const updates=gardens.stats().updates;gardens.draw(world,0);assert.equal(gardens.stats().updates,updates,'Same-state polling does not upload buffers');
 }
 phaseStart+=phase.days;
}
assert(maxTriangles<4000);assert.equal(scene.children.length,2);
const updates=gardens.stats().updates;gardens.draw({...world,paused:true},DAY*100);gardens.draw({...world,paused:true},DAY*200);assert.equal(gardens.stats().updates,updates,'Pause freezes the visual state');
gardens.draw({...world,born:'new-world',living:{flora:{version:2,plots:{}}}},0);assert(gardens.stats().failed);assert.equal(gardens.stats().views.length,0,'A replaced world cannot borrow plants from the previous one');assert.equal(scene.children[0].count,10);assert.equal(scene.children[1].count,0);
let geometryDisposals=0,materialDisposals=0;for(const mesh of scene.children)mesh.geometry.addEventListener('dispose',()=>geometryDisposals++);scene.children[0].material.addEventListener('dispose',()=>materialDisposals++);
gardens.dispose();gardens.dispose();assert.equal(scene.children.length,0);assert.equal(geometryDisposals,2);assert.equal(materialDisposals,1);
console.log(JSON.stringify({suite:'flora',plots:5,plants:30,phases:5,visualCases:25,matrices,maxTriangles,batches:2,analyticGrowth:true,waterNoPastCredit:true,legacyPreserved:true,footprintsUnchanged:true,pause:true,dispose:true,worldWrites:false}));
