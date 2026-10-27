import assert from 'node:assert/strict';
import {seed} from '../lib/world.ts';
import {actorsAt,animalsAt,distance} from '../lib/life.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {petOwners} from '../lib/living/pets.ts';
import {WalkDirector,walkable,segmentWalkable,PERSONAL_SPACE} from '../lib/city/walkability.ts';
const now=Date.parse('2026-10-27T05:00:00Z'),world=structuredClone(seed);
world.born='2026-10-26T17:00:00Z';world.paused=false;world.living=initializeLiving(now);
assert.deepEqual(petOwners(world),{cun:'an',muop:'chi'});
world.living.petOwners={cun:'an',muop:'not-a-resident',se:'an'};assert.deepEqual(petOwners(world),{cun:'an'});
assert.deepEqual(petOwners({...world,living:{...world.living,petOwners:{}}}),{},'Explicit unassignment must not restore defaults');
const owner={...actorsAt(world,now)[0],kind:'walk-pet',transport:'walk',position:[-375,-700],path:[[-350,-700],[-150,-700]],walking:true};
const pet={...animalsAt(world,now).find(a=>a.id==='cun'),position:[-450,-700],path:[[-450,-700]],walking:false};
const d=new WalkDirector(),saved=JSON.stringify(world);let previous,waited=0,travel=0,maxGapAfterCatch=0,caught=false;
for(let frame=0;frame<1600;frame++){
 const output=d.frame(world,[structuredClone(owner)],100+frame*.05,[],[structuredClone(pet)]),a=output.find(p=>p.id==='an'),dog=output.find(p=>p.id==='cun');
 if(frame===0)assert(distance(dog.position,pet.position)<.01,'Do not spawn a distant pet beside its owner');
 assert.equal(dog.petOwnerId,'an');assert.equal(distance(a.position,dog.position)>=PERSONAL_SPACE-1e-6,true);
 for(const actor of output){assert(walkable(actor.position));const before=previous?.find(p=>p.id===actor.id);if(before){assert(distance(before.position,actor.position)<=.80001,'Companions never teleport');assert(segmentWalkable(before.position,actor.position));}}
 if(a.activity==='Chờ thú cưng tới gần')waited++;
 if(previous)travel+=distance(previous.find(p=>p.id==='an').position,a.position);
 const gap=distance(a.position,dog.position);if(gap<25)caught=true;if(caught)maxGapAfterCatch=Math.max(maxGapAfterCatch,gap);
 previous=output;
}
assert(waited>5,'Wait for the companion before walking off');assert(travel>150,'Continue walking once the companion catches up');assert(caught);assert(maxGapAfterCatch<42);
const pause=d.frame({...world,paused:true},[owner],200,[],[pet]);
for(let i=0;i<10;i++)assert.deepEqual(d.frame({...world,paused:true},[owner],200+i,[],[pet]),pause);
const cancelled=d.frame(world,[{...owner,kind:'read'}],211,[],[pet]);assert(cancelled.every(a=>!a.petOwnerId));
const noOwner=d.frame({...world,living:{...world.living,petOwners:{}}},[owner],212,[],[pet]);assert(noOwner.every(a=>!a.petOwnerId));
assert.equal(JSON.stringify(world),saved);
console.log(JSON.stringify({suite:'pet-walk',frames:1600,waited,travel,maxGapAfterCatch,pause:true,cancellation:true,explicitUnassignment:true,collisionCount:0,worldWrites:false}));
