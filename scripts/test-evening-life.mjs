import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {seed} from '../lib/world.ts';
import {actorsAt} from '../lib/life.ts';
import {initializeLiving,planLivingTurn,crowdAt} from '../lib/living/engine.ts';
import {eveningActions,initializeAgent,scenarios,settleLearning,prepareLearning} from '../lib/living/learning.ts';
import {chooseEveningLife,runtimePlace,eveningDuration} from '../lib/living/evening-life.ts';
import {isSleepHour,plannedSleepMinutes} from '../lib/living/circadian.ts';
import {RiggedAvatar} from '../components/city/three/rigged-avatar.ts';
import {SOFA_SEATS,lieOnBed,sitOnSeat} from '../components/city/three/home-poses.ts';
import {loadLocalGLTF} from './load-local-gltf.mjs';
import {bootstrapShared,replayShared} from '../lib/living/shared-ground.ts';
const born=Date.parse('2026-11-03T17:00:00Z'),now=born+22.5*3600000;
const context=hour=>({date:'2026-11-04',hour,weekday:3,timezone:'Asia/Ho_Chi_Minh',fetchedAt:new Date(now).toISOString(),weather:{status:'unavailable',source:'fixture',observedAt:null,temperature:null,humidity:null,precipitation:null,code:null,windKph:null},calendar:{weekend:false,holidays:[],source:'fixture',status:'unavailable',coverage:'fixture'},traffic:{status:'unavailable',label:'fixture'},festivals:{status:'unavailable',label:'fixture'}});
const world={...structuredClone(seed),born:new Date(born).toISOString(),living:initializeLiving(now),clock:{scale:1,pausedAt:null,pausedMs:0,anchors:[{realMs:born,simMs:0,scale:1}]}};
const original=JSON.stringify(world),planned=planLivingTurn(world,context(22.5),now).world;
assert.equal(JSON.stringify(world),original);assert.equal(planned.living.lifeScheduleVersion,1);assert.equal(planned.born,world.born);assert.deepEqual(planned.living.petOwners,world.living.petOwners);
const actors=[...actorsAt(planned,now+120000),...crowdAt(planned.living,planned,now+120000)];
const out=actors.filter(a=>!/^Phòng |Khu dân cư/.test(a.location));assert(out.length>=20,'Evening population must not disappear at22h');
const decisions=new Set();for(let n=1;n<=48;n++){const id='neighbor-'+n,agent=initializeAgent(id),chosen=chooseEveningLife(agent,id,context(22.5),()=>{throw Error('Night must not use daytime curfew');});decisions.add(chosen.id);assert(!isSleepHour(id,22.5));}
assert(decisions.size>=5);assert(Array.from({length:48},(_,i)=>isSleepHour('neighbor-'+(i+1),23.5)).some(Boolean));assert(Array.from({length:48},(_,i)=>!isSleepHour('neighbor-'+(i+1),23.5)).some(Boolean));
for(const action of eveningActions){
 const agent=initializeAgent('an');agent.pending={id:action.id,scenarioId:action.id,startedSimMs:0,durationMs:180000,completed:false};
 assert.equal(settleLearning(agent,179999,new Date(now).toISOString(),true),false);
 assert.equal(settleLearning(agent,180000,new Date(now).toISOString(),true),true);
 assert.equal(settleLearning(agent,180001,new Date(now).toISOString(),true),false);
 const cancelled=initializeAgent('an');cancelled.pending={...agent.pending,completed:false};assert.equal(settleLearning(cancelled,180000,new Date(now).toISOString(),false),false);
}
const sleepy=chooseEveningLife({...initializeAgent('an'),energy:10},'an',context(21),()=>scenarios[0]);assert.equal(sleepy.id,'sleep-night');assert.equal(runtimePlace(sleepy,'binh'),'Phòng Bình');assert(eveningDuration(sleepy,'an',23)>3600);
const walk={createdAt:new Date(now).toISOString(),simStartedAt:0,pausedMs:0,from:'Phòng An',steps:[{location:'Phòng An',kind:'rest',activity:'Nằm ngủ trên giường',duration:3600}]};
assert.equal(plannedSleepMinutes(walk,0,60000),.5);assert.equal(plannedSleepMinutes({...walk,steps:[{...walk.steps[0],location:'Phố đi bộ',activity:'Đi dạo'}]},0,3600000),0);
const resting=structuredClone(planned.living),awake=structuredClone(planned.living);
for(const state of [resting,awake]){state.learning.an.needsUpdatedSimMs=0;state.learning.an.energy=50;state.learning.an.pending=undefined;}
const fixture={...world,clock:{scale:1,pausedAt:null,pausedMs:0,anchors:[{realMs:now,simMs:1200000,scale:1}]},people:world.people.map(p=>({...p,plan:p.id==='an'?walk:p.plan}))};
prepareLearning(fixture,resting,now);
prepareLearning({...fixture,people:fixture.people.map(p=>({...p,plan:p.id==='an'?{...walk,steps:[{...walk.steps[0],activity:'Ngồi xem tivi'}]}:p.plan}))},awake,now);
assert(resting.learning.an.energy>50);assert(awake.learning.an.energy<50,'Being awake at night is not automatic recovery');
let maxBedHeight=0,maxSeatGap=0;const catalog=JSON.parse(readFileSync('public/models/supplied/catalog.json')).assets;
for(const m of catalog){
 const rig=new RiggedAvatar(await loadLocalGLTF(m.url),2.6,.85,true);
 for(let i=0;i<2;i++){
  rig.poseTimeline([{clip:'idle',time:1.3,weight:1}],[0,0,0],0);const bed=lieOnBed(rig,i),box=new THREE.Box3().setFromObject(rig.group,true),size=box.getSize(new THREE.Vector3());
  maxBedHeight=Math.max(maxBedHeight,size.y);assert(Math.abs(box.min.y-bed.surface)<1e-5);assert(size.x<bed.width&&size.z<bed.depth&&size.y<1.25,'Actual skin must fit on mattress');
 }
 sitOnSeat(rig,SOFA_SEATS[0]);const seatGap=Math.abs(rig.seat().y-.99);maxSeatGap=Math.max(maxSeatGap,seatGap);assert(seatGap<.18,'Hips must be supported by sofa');assert(rig.foot('left').y>=.024&&rig.foot('right').y>=.024);
 rig.dispose();
}
const shadow=JSON.parse(readFileSync('data/training/h6-scenario-catalog.json'));assert.deepEqual(shadow.slice(0,41),scenarios);assert.equal(createHash('sha256').update(JSON.stringify(shadow)).digest('hex'),'3b3cf7a0e0db902c006766f4e2f23927562d5581247ff08b701575b7d35e0267');
assert.equal(new Set([...scenarios,...eveningActions].map(s=>s.id)).size,50);
const sleepingWorld=planLivingTurn(world,context(2),born+2*3600000).world;
assert(sleepingWorld.people[0].plan.steps[0].duration>3600);
const source={seq:1,revision:1,capturedAt:born+2*3600000,raw:JSON.stringify(sleepingWorld)};
const shared=await bootstrapShared(source,crypto.randomUUID()),replayed=await replayShared(shared,source,[],source.capturedAt+100);
assert.equal(replayed.state.frames.at(-1).poses.length,60,'Long overnight plans must remain compatible with existing shared authority');
console.log(JSON.stringify({suite:'evening-life',pass:true,nightActions:9,activeOutdoorsAt2230:out.length,diverseChoices:decisions.size,personalBedtime:true,noAutomaticNightRecovery:true,maxBedHeight,maxSeatGap,legacyH6Unchanged:true,dbWrites:false}));
