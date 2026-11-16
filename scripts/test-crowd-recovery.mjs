/** Synthetic viewer crowd; authoritative ground retains its existing default. */
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {seed} from '../lib/world.ts';
import {standingOffset} from '../lib/living/social.ts';
import {WalkDirector, PERSONAL_SPACE, walkable, segmentWalkable} from '../lib/city/walkability.ts';
const world={...structuredClone(seed),born:'2026-11-16T00:00:00Z'};
world.people=Array.from({length:72},(_,i)=>({...structuredClone(seed.people[i%3]),id:'walker-'+String(i).padStart(3,'0'),name:'Người '+i}));
const input=world.people.map((p,i)=>{
 const slot=standingOffset(world,p.id),start=[-300+Math.cos(i/72*Math.PI*2)*140,-680+Math.sin(i/72*Math.PI*2)*140],end=[-300,-680];
 const a=[start[0]-slot[0],start[1]-slot[1]],b=[end[0]-slot[0],end[1]-slot[1]];
 return {id:p.id,name:p.name,from:'Sân chung',location:'Quảng trường',kind:'social',activity:'Đi dạo',source:'plan',walking:true,transport:'walk',stationaryFor:0,progress:0,position:[a[0]+(i-1)*25,a[1]+i*7],path:[a,b]};
});
const snapshot=JSON.stringify(world),director=new WalkDirector({recoverCongestion:true}),times=[];
let previous,at120;
for(let frame=0;frame<=180*15;frame++){
 const begin=performance.now(),output=director.frame(world,frame%2?[...input].reverse():input,frame/15);
 times.push(performance.now()-begin);
 const positions=new Map(output.map(a=>[a.id,a.position]));
 for(const a of output){
  assert.ok(walkable(a.position),'Static footprint: '+a.id);
  if(previous){
   const old=previous.get(a.id);
   assert.ok(Math.hypot(a.position[0]-old[0],a.position[1]-old[1])<=16/15+1e-6,'Teleport: '+a.id);
   assert.ok(segmentWalkable(old,a.position),'Scenery sweep: '+a.id);
  }
 }
 for(let i=0;i<output.length;i++)for(let j=i+1;j<output.length;j++){
  const a=output[i],b=output[j],x=a.position[0]-b.position[0],z=a.position[1]-b.position[1];
  assert.ok(Math.hypot(x,z)>=PERSONAL_SPACE-1e-6,'Disc overlap');
  if(previous){
   const pa=previous.get(a.id),pb=previous.get(b.id),rx=pa[0]-pb[0],rz=pa[1]-pb[1],dx=x-rx,dz=z-rz;
   const t=Math.max(0,Math.min(1,-(rx*dx+rz*dz)/(dx*dx+dz*dz||1)));
   assert.ok(Math.hypot(rx+t*dx,rz+t*dz)>=PERSONAL_SPACE-1e-6,'Disc intersection between frames');
  }
 }
 previous=positions;
 if(frame===120*15)at120=new Map(director.exportState().walkers.map(([id,w])=>[id,w.distance]));
}
const state=director.exportState(),unfinished=state.walkers.filter(([,w])=>Math.hypot(w.position[0]-w.goal[0],w.position[1]-w.goal[1])>.1);
assert.equal(unfinished.length,0,'Unfinished actors: '+unfinished.map(([id])=>id));
world.paused=true;
const frozen=director.frame(world,input,181).map(a=>a.position);
assert.deepEqual(director.frame(world,input,500).map(a=>a.position),frozen,'Paused crowd must not move');
world.paused=seed.paused;
assert.equal(JSON.stringify(world),snapshot,'Viewer cannot mutate durable world, plans or learning');
// Explicit false is the unchanged default used by ground journal/replay.
const normal=new WalkDirector(),explicit=new WalkDirector({recoverCongestion:false});
for(let frame=0;frame<=60;frame++)assert.deepEqual(normal.frame(world,input.slice(0,2),frame/15),explicit.frame(world,input.slice(0,2),frame/15));
times.sort((a,b)=>a-b);
console.log(JSON.stringify({suite:'crowd-recovery',actors:72,seconds:180,unfinished:0,stalledFor60Seconds:unfinished.filter(([id,w])=>w.distance-at120.get(id)<.1).length,frames:times.length,sweptCollisionChecks:true,noTeleport:true,pause:true,worldUnchanged:true,authorityDefaultUnchanged:true,frameMedianMs:times[Math.floor(times.length*.5)],frameP95Ms:times[Math.floor(times.length*.95)],scope:'Node synthetic navigation, not GPU or live QA'}));
