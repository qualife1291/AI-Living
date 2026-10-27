import assert from 'node:assert/strict';
import { seed } from '../lib/world.ts';
import { actorsAt, distance } from '../lib/life.ts';
import { TagDirector, TAG_REACH } from '../lib/city/tag-game.ts';
import { WalkDirector, PERSONAL_SPACE, segmentWalkable, walkable } from '../lib/city/walkability.ts';
import { SocialDirector } from '../lib/living/social.ts';

const now=Date.parse('2026-10-27T05:00:00Z'), world=structuredClone(seed);
world.born='2026-10-26T17:00:00Z';world.paused=false;
world.clock={scale:1,pausedAt:null,pausedMs:0,anchors:[{realMs:now,simMs:43200000,scale:1}]};
for (const p of world.people) p.plan={createdAt:new Date(now).toISOString(),simStartedAt:43100000,from:'Công viên',generator:'rules',steps:[{location:'Công viên',kind:'tag',activity:'Chơi đuổi bắt',duration:3600}]};
const raw=actorsAt(world,now), pair=raw.slice(0,2).map((a,i)=>({...a,walking:false,position:[300+i*30,530],path:[[300+i*30,530]]}));
const tag=new TagDirector();assert.equal(tag.frame(pair,0).size,0,'No new play while paused');
const initial=tag.frame(pair,.1);assert.equal(initial.size,2);assert.equal(initial.get(pair[0].id).role,'chaser');
let close=pair.map((a,i)=>({...a,position:[300+i*(TAG_REACH-.1),530]}));
for(let i=0;i<12;i++)tag.frame(close,.1);
const swapped=tag.frame(close,.1);assert.equal(swapped.get(pair[0].id).role,'runner');assert.equal(swapped.get(pair[0].id).swaps,1);
for(let i=0;i<50;i++)assert.equal(tag.frame(close,.1).get(pair[0].id).swaps,1,'No swap storm while actors cannot separate');
assert.deepEqual(tag.frame(close,0),tag.frame(close,0),'Pause freezes game state');
assert.equal(tag.frame([pair[0]],.1).size,0,'An absent peer cancels the pair');
assert.equal(tag.frame(pair.map(a=>({...a,walking:true})),.1).size,0,'Do not recruit people still travelling');
assert.equal(tag.frame([pair[0],{...pair[1],location:'Thư viện'}],.1).size,0);

// End-to-end movement uses the real obstacle graph and swept actor separation.
const director=new WalkDirector(), saved=JSON.stringify(world);
let previous, swaps=0, motion=0, maxStep=0;
for(let frame=0;frame<1800;frame++){
 const input=actorsAt(structuredClone(world),now+frame*50).slice(0,2);
 if(frame%2)input.reverse(); // polling/reordering must not change partner identity
 const output=director.frame(world,input,43200+frame*.05);
 for(const a of output){
  assert(walkable(a.position));
  if(a.tagGame){assert.equal(a.tagGame.peerId,a.id==='an'?'binh':'an');swaps=Math.max(swaps,a.tagGame.swaps);}
  const before=previous?.find(b=>b.id===a.id);
  if(before){const step=distance(before.position,a.position);assert(step<=1.40001,'No teleport');maxStep=Math.max(maxStep,step);assert(segmentWalkable(before.position,a.position));if(step>.001)motion++;}
 }
 assert(distance(output[0].position,output[1].position)>=PERSONAL_SPACE-1e-6);
 previous=output;
}
assert(swaps>=2,`Expected repeated actual catches and role swaps, got ${swaps}`);
const frozen=director.frame({...world,paused:true},actorsAt(world,now).slice(0,2),43300);
for(let i=0;i<10;i++)assert.deepEqual(director.frame({...world,paused:true},actorsAt(world,now).slice(0,2),43300+i),frozen);
const cancelled=director.frame(world,actorsAt(world,now).slice(0,2).map(a=>({...a,kind:'read'})),43310);
assert(cancelled.every(a=>!a.tagGame),'Changed plans cancel roles');
const social=new SocialDirector().frame(world,previous,[],now,null,true);assert.equal(social.exchanges.length,0,'Play must not start an ambient conversation');
assert.equal(JSON.stringify(world),saved,'Presentation must not mutate persisted plans');
console.log(JSON.stringify({suite:'paired-tag',frames:1800,swaps,motion,maxStep,pause:true,cancellation:true,reorder:true,collisionCount:0,worldWrites:false}));
// Both supported venues, a third waiting participant, and world replacement.
const sports=structuredClone(world);
for(const p of sports.people){p.plan.from='Sân thể thao';p.plan.steps[0].location='Sân thể thao';}
const sportsDirector=new WalkDirector();let sportsResult,sportsSwaps=0;
for(let frame=0;frame<1800;frame++){
 sportsResult=sportsDirector.frame(sports,actorsAt(sports,now+frame*50),43200+frame*.05);
 assert.equal(sportsResult.filter(a=>a.tagGame).length,frame?2:0);
 for(const a of sportsResult){assert(walkable(a.position));sportsSwaps=Math.max(sportsSwaps,a.tagGame?.swaps??0);}
 for(let i=0;i<sportsResult.length;i++)for(let j=i+1;j<sportsResult.length;j++)assert(distance(sportsResult[i].position,sportsResult[j].position)>=PERSONAL_SPACE-1e-6);
}
assert(sportsSwaps>=2);
assert.match(sportsResult.find(a=>!a.tagGame).activity,/Chờ bạn/);
assert(sportsDirector.frame({...sports,born:'2026-10-25T17:00:00Z'},actorsAt(sports,now),43200).every(a=>!a.tagGame),'New worlds must clear previous games');
assert.equal(sportsDirector.frame(sports,actorsAt(sports,now),43200).filter(a=>a.tagGame).length,0);
// A negative clock jump resets the game and navigation together.
sportsDirector.frame(sports,actorsAt(sports,now),43200.1);
assert(sportsDirector.frame(sports,actorsAt(sports,now),43000).every(a=>!a.tagGame));
console.log(JSON.stringify({suite:'paired-tag-sports',frames:1800,sportsSwaps,thirdActorWaits:true,worldAndClockReset:true}));
const {initializeLiving,crowdAt}=await import('../lib/living/engine.ts');
const {scheduleResidentSocial}=await import('../lib/living/social-scheduler.ts');
const scheduled=structuredClone(world);scheduled.living=initializeLiving(now);
scheduled.clock.anchors[0].simMs=9*3600000;
for(const role of scheduled.living.catalog.roles){role.place='Công viên';role.kind='tag';}
const playing=crowdAt(scheduled.living,scheduled,now).filter(a=>a.kind==='tag'&&!a.walking);
assert(playing.length>0,'Exercise actual NPC routines instead of mocking eligibility');
const tick=scheduleResidentSocial(scheduled,now);
for(const a of playing)assert(!tick.world.living.residents.find(r=>r.id===a.id).plan,'NPC meetings must not replace an intentional tag activity');
console.log('PASS real NPC tag routines are not interrupted by social scheduling');
const {microActivity,actionSteps}=await import('../lib/living/activities.ts');
for(const kind of ['tag','run','cycle','exercise','garden','walk-pet','shop','jump']){
 assert.deepEqual(microActivity('actor',100,kind,'Hoạt động đã chọn'),{kind,activity:'Hoạt động đã chọn'});
}
assert.deepEqual(actionSteps('Công viên','Chơi đuổi bắt','tag').map(s=>[s.location,s.duration]),[['Công viên',180]],'A paired game should not split partners across two venues');
