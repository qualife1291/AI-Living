import assert from 'node:assert/strict';
import {HOME_ANCHORS,homeAnchor} from '../lib/city/homes.ts';
import {assignHomes,households} from '../lib/living/households.ts';
import {initializeLiving,population,crowdAt} from '../lib/living/engine.ts';
import {WalkDirector,safeWalkPath} from '../lib/city/walkability.ts';
import {bodyWalkable,bodySegmentWalkable} from '../lib/city/walk-ground.ts';
import {places,distance} from '../lib/life.ts';
import {seed} from '../lib/world.ts';
const now=Date.parse('2026-10-28T05:00:00Z'),state=initializeLiving(now),large={...state,catalog:{...state.catalog,newResidentsPerDay:10,maxPopulation:240}};
large.residents=population(large,'2027-01-01');const snapshot=JSON.stringify(large),groups=households(large);
assert.equal(groups.length,60);assert.equal(new Set(groups.map(g=>g.home.anchorId)).size,60);assert(groups.every(g=>homeAnchor(g.home.anchorId)&&g.members.length===4));
assert.deepEqual(assignHomes([...large.residents].reverse()).reverse(),large.residents,'Growth/reordering never changes established doors');
const legacy=structuredClone(large.residents);for(const r of legacy){delete r.home.anchorId;delete r.home.address;}
const before=JSON.stringify(legacy),backfill=assignHomes(legacy);assert.equal(JSON.stringify(legacy),before);assert.deepEqual(assignHomes(backfill),backfill);assert.equal(backfill.length,240);
let routes=0;
for(const anchor of HOME_ANCHORS){
 assert(bodyWalkable(anchor.point,9.2));
 for(const from of Object.values(places)) {
  const path=safeWalkPath(from,anchor.point);assert(distance(path.at(-1),anchor.point)<.1,`Unreachable door ${anchor.id}`);
  for(let i=1;i<path.length;i++)assert(bodySegmentWalkable(path[i-1],path[i],4.8));routes++;
 }
 const bike=safeWalkPath(places['Khu dân cư'],anchor.point,9.2);assert(distance(bike.at(-1),anchor.point)<.1);for(let i=1;i<bike.length;i++)assert(bodySegmentWalkable(bike[i-1],bike[i],9.2));
}
const world={...structuredClone(seed),born:'2026-10-27T17:00:00Z',living:large,clock:{scale:1,anchors:[{realMs:now,simMs:23*3600000,scale:1}],pausedAt:null,pausedMs:0}};
const raw=crowdAt(large,world,now,undefined,240);assert(raw.every(a=>a.homeAnchor));assert.equal(new Set(raw.map(a=>a.homeAnchor.join(','))).size,60);
const person=raw[0],target=person.homeAnchor,director=new WalkDirector(),origin=[-300,-700];
const start={...person,kind:'work',location:'Xưởng sáng tạo',homeAnchor:undefined,walking:false,position:origin,path:[origin]};let previous=director.frame(world,[start],0)[0],travel=0;
for(let frame=1;frame<=2400;frame++) {
 const actor=director.frame(world,[{...person,walking:true,position:origin,path:[origin,places['Khu dân cư']]}],frame*.15)[0];
 const step=distance(previous.position,actor.position);assert(step<=2.40001);assert(bodySegmentWalkable(previous.position,actor.position,4.8));travel+=step;previous=actor;
}
assert(travel>1000);assert(distance(previous.position,target)<.1,'Walk to the assigned door, not district center or social frontage slot');
const frozen=director.frame({...world,paused:true},[person],400)[0];assert.deepEqual(director.frame({...world,paused:true},[person],401)[0].position,frozen.position);
const leave=director.frame(world,[{...person,kind:'read',location:'Thư viện',homeAnchor:undefined,path:[places['Khu dân cư'],places['Thư viện']],walking:true}],401.15)[0];assert(distance(leave.position,previous.position)<=2.40001,'Leaving home never teleports');
assert.equal(JSON.stringify(large),snapshot);
const custom={...large.residents[0],home:{householdId:'old-home',label:'Nhà đã lưu',place:'Khu dân cư',anchorId:'retired-custom-door',address:'Địa chỉ đã lưu'}};
assert.deepEqual(assignHomes([custom])[0],custom,'Never silently relocate a retired/custom home');
console.log(JSON.stringify({suite:'home-anchors',population:240,groups:60,uniqueDoors:60,venueToHomeRoutes:routes,bikeHomeRoutes:60,groundFrames:2400,travel,homeArrival:true,noTeleport:true,pause:true,legacyAdditive:true,historyPreserved:true,worldWrites:false}));
