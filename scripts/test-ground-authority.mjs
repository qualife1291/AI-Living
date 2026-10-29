/** GND3 accounting against real GND2 replay. Isolated worlds only; no DB or network. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {meetingSteps} from '../lib/living/activities.ts';
import {groundObstacles,bodyWalkable,bodySegmentWalkable} from '../lib/city/walk-ground.ts';
import {sampleSharedGround,validateSharedView,SHARED_SCOPE} from '../lib/living/shared-ground-view.ts';
import {bootstrapShared,replayShared} from '../lib/living/shared-ground.ts';
import {bootstrapAuthority,authorityObserver,validateAuthorityState} from '../lib/living/ground-authority.ts';
const base=Date.parse('2026-10-29T03:00:00Z'),w={...structuredClone(seed),born:new Date(base).toISOString(),living:initializeLiving(base),clock:{pausedAt:null,pausedMs:0,scale:60,anchors:[{realMs:base,simMs:0,scale:60}]}};
w.living.residents=w.living.residents.slice(0,1);
const source=(seq,world,at=base)=>({seq,revision:seq-1,capturedAt:at,raw:JSON.stringify(world)}),first=source(1,w),shared=await bootstrapShared(first,randomUUID()),authority=await bootstrapAuthority(shared,first,'f'.repeat(64));
assert(authority.actors.every(a=>a.status==='baseline'&&!a.plan));
const fresh=structuredClone(w),peer=fresh.living.residents[0];
const plan=()=>({createdAt:new Date(base).toISOString(),pausedMs:0,from:'Sân chung',simStartedAt:0,steps:meetingSteps('Công viên','Trò chuyện có nguồn')});
fresh.people[0].plan=plan();peer.plan=plan();
fresh.livingTurn={id:'fixture-turn-1',createdAt:new Date(base).toISOString(),date:'2026-10-29',title:'Gặp bạn',summary:'Fixture, không là lịch sử thật',location:'Công viên',activity:'Trò chuyện',kind:'social',residentId:peer.id,simStartedAt:0,dialogue:[{speaker:'an',text:'Chào bạn, mình đã tới rồi.'},{speaker:peer.id,text:'Mình nghe bạn. Chúng ta cùng nghỉ một chút nhé.'},{speaker:'an',text:'Mình sẽ giữ lời và chờ ở đây.'},{speaker:peer.id,text:'Cảm ơn bạn đã lắng nghe.'}],generator:'rules',context:{date:'2026-10-29'}};
const second=source(2,fresh);
async function run(until,chunk=2000,accepted=second){let s=structuredClone(shared),a=structuredClone(authority);const records=[];let guards=0;
 while(s.cursorRealMs<base+until){assert(++guards<2000);const current=s.sourceSeq===1?first:accepted,trace=await authorityObserver(a,current),out=await replayShared(s,current,s.sourceSeq===1?[accepted]:[],Math.min(base+until,s.cursorRealMs+chunk),null,trace.observer);assert(out.state.cursorRealMs>s.cursorRealMs);s=out.state;a=await validateAuthorityState(trace.state);records.push(...trace.records);}
 return{s,a,records};
}
const result=await run(3600),chunks=await run(3600,100);
assert.deepEqual(chunks.s.walk,result.s.walk);assert.deepEqual(chunks.a,result.a);assert.deepEqual(chunks.records,result.records,'Accounting is invariant under invocation size/resume');
assert(result.records.some(r=>r.type==='arrival'&&r.actorId==='an'),'A real replay must observe arrival');
assert(result.records.some(r=>r.type==='presence-completed'),JSON.stringify({error:'Continuous physical presence did not close a window',counts:result.a.counts,actors:result.a.actors.map(a=>({id:a.id,step:a.step,status:a.status})),records:result.records.filter(r=>r.type!=='co-presence')}));
assert(result.records.some(r=>r.type==='co-presence'),'A real replay must observe a clear encounter');
assert(result.records.some(r=>r.type==='heard-utterance'),JSON.stringify({counts:result.a.counts,pending:result.a.pending,actors:result.a.actors.map(a=>({id:a.id,status:a.status,step:a.step})),utterances:result.a.utterances}));
assert(result.records.filter(r=>r.type==='heard-utterance').every(r=>r.recipientId===peer.id||r.recipientId==='an'));
assert(result.records.every(r=>r.eligibleForReward===false&&r.eligibleForP2P===false));
assert.equal(JSON.stringify(fresh),second.raw,'Accounting never edits world/history/policies');
const unchanged=await authorityObserver(authority,first),baseline=await replayShared(shared,first,[],base+100,null,unchanged.observer);assert.equal(unchanged.state.counts.arrivals,0);assert.equal(unchanged.state.counts.heard,0);assert.deepEqual(baseline.state.walk,(await replayShared(shared,first,[],base+100)).state.walk);
// Planned text, started speech and fully heard text are different states.
const planned=await run(1900),partial=await run(2100);
assert.equal(planned.a.utterances.length,0);assert.equal(planned.a.counts.heard,0);
assert(partial.a.utterances.some(u=>!u.completed));assert.equal(partial.a.counts.heard,0);
const cancelledWorld=structuredClone(fresh);delete cancelledWorld.people[0].plan;
const cancelledSource=source(3,cancelledWorld,partial.s.cursorRealMs),cancelled=await authorityObserver(partial.a,second);
await replayShared(partial.s,second,[cancelledSource],partial.s.cursorRealMs,null,cancelled.observer);
assert.equal(cancelled.state.pending,null);assert.equal(cancelled.state.counts.heard,0);assert(cancelled.records.some(r=>r.type==='utterance-interrupted'));await validateAuthorityState(cancelled.state);
const pauseWorld=structuredClone(fresh);pauseWorld.paused=true;pauseWorld.clock.pausedAt=partial.s.cursorRealMs;
const pauseSource=source(3,pauseWorld,partial.s.cursorRealMs),paused=await authorityObserver(partial.a,second);
const pauseReplay=await replayShared(partial.s,second,[pauseSource],partial.s.cursorRealMs+1000,null,paused.observer);
assert.equal(pauseReplay.state.simMs,partial.s.simMs);assert.deepEqual(paused.state.counts,partial.a.counts);assert.equal(paused.records.length,0);await validateAuthorityState(paused.state);
// World-clock jumps cannot make the raw navigation step agree by relabelling it.
const wrongClock=structuredClone(fresh);wrongClock.clock.anchors[0].simMs=1e9;wrongClock.people[0].plan.simStartedAt=1e9;wrongClock.living.residents[0].plan.simStartedAt=1e9;wrongClock.livingTurn.simStartedAt=1e9;
const mismatch=await run(3600,2000,source(2,wrongClock));assert.equal(mismatch.a.counts.arrivals,0);assert.equal(mismatch.a.counts.presence,0);assert.equal(mismatch.a.counts.heard,0);
const legacyWorld=structuredClone(fresh);delete legacyWorld.people[0].plan.simStartedAt;delete legacyWorld.living.residents[0].plan.simStartedAt;
const legacy=await run(3000,2000,source(2,legacyWorld));assert.equal(legacy.a.counts.arrivals,0);assert.equal(legacy.a.counts.heard,0);assert(legacy.a.actors.filter(a=>['an',peer.id].includes(a.id)).every(a=>a.status==='unsupported'));
const transitWorld=structuredClone(fresh);transitWorld.people[0].plan.transport='bus';transitWorld.living.residents[0].plan.transport='bus';
const transit=await run(3000,2000,source(2,transitWorld));assert.equal(transit.a.counts.arrivals,0);assert.equal(transit.a.counts.presence,0);assert.equal(transit.a.counts.heard,0);
const thirdWorld=structuredClone(fresh);thirdWorld.livingTurn.dialogue.push({speaker:'binh',text:'Third-party text is not delivered by this scope.'});
const third=await run(3600,2000,source(2,thirdWorld));assert.equal(third.a.counts.heard,0);assert.equal(third.a.utterances.length,0);
// New actor seed plans stay baseline. A deleted/re-entered ID gets a fresh epoch.
const newcomerWorld=structuredClone(fresh);newcomerWorld.living.residents.push({...structuredClone(peer),id:'neighbor-new'});
const newcomer=await run(3600,2000,source(2,newcomerWorld));assert.equal(newcomer.a.actors.find(a=>a.id==='neighbor-new').status,'baseline');assert(!newcomer.records.some(r=>r.actorId==='neighbor-new'));
const removedWorld=structuredClone(fresh);removedWorld.living.residents=[];delete removedWorld.livingTurn;
const removedSource=source(3,removedWorld,partial.s.cursorRealMs),retired=await authorityObserver(partial.a,second);await replayShared(partial.s,second,[removedSource],partial.s.cursorRealMs,null,retired.observer);
assert(!retired.state.actors.some(a=>a.id===peer.id));assert(!retired.state.pairs.some(p=>p.a===peer.id||p.b===peer.id));assert.equal(retired.state.pending,null);
const restoredSource=source(4,fresh,partial.s.cursorRealMs);await retired.observer.source(fresh,restoredSource,retired.state.cursorSimMs);
assert(retired.state.actors.find(a=>a.id===peer.id).epoch>partial.a.actors.find(a=>a.id===peer.id).epoch);assert.equal(retired.state.actors.find(a=>a.id===peer.id).status,'baseline');await validateAuthorityState(retired.state);
const corrupt=structuredClone(result.a);corrupt.actors.find(a=>a.plan).step.dwellMs=1e9;await assert.rejects(validateAuthorityState(corrupt),/integrity/);
const forged=structuredClone(partial.a);forged.utterances[0].completed=true;await assert.rejects(validateAuthorityState(forged),/integrity/);
// Synthetic geometry/threshold unit fixture, distinct from the real replay above.
const dto=validateSharedView({version:2,scope:SHARED_SCOPE,worldBorn:shared.worldBorn,checkpoint:'f'.repeat(64),sequence:0,sourceRevision:0,cursorRealMs:shared.cursorRealMs,simMs:shared.simMs,backlogMs:0,paused:false,descriptors:shared.descriptors,frames:shared.frames,eligibleForReward:false,eligibleForP2P:false});
const originalActors=sampleSharedGround(dto,base).actors;
function observations(pair){const actors=structuredClone(originalActors),walk=structuredClone(shared.walk);
 for(const [who,pos] of [['an',pair[0]],[peer.id,pair[1]]]){actors.find(a=>a.id===who).position=[...pos];const w=walk.walkers.find(([id])=>id===who)[1];Object.assign(w,{position:[...pos],requested:[...pos],goal:[...pos],path:[[...pos]],next:1,speed:0,velocity:[0,0]});}
 return {world:w,source:first,before:actors,after:actors,beforeWalk:walk,afterWalk:walk};
}
const wall=groundObstacles.map(r=>[[r.x-r.width/2-5,r.z],[r.x+r.width/2+5,r.z]]).find(([a,b])=>Math.hypot(a[0]-b[0],a[1]-b[1])<30&&bodyWalkable(a,4.8)&&bodyWalkable(b,4.8)&&!bodySegmentWalkable(a,b,.01));assert(wall,'A real static wall geometry fixture is required');
const blocked=await authorityObserver(authority,first),wallFrame=observations(wall);
for(let n=0;n<40;n++)blocked.observer.step({...wallFrame,fromRealMs:base+n*100,toRealMs:base+(n+1)*100,fromSimMs:n*100,toSimMs:(n+1)*100});
assert(!blocked.records.some(r=>r.type==='co-presence'&&r.participants.some(p=>p.id==='an')&&r.participants.some(p=>p.id===peer.id)),'No encounter through a wall');
const open=[];for(let x=-1400;x<=1400&&!open.length;x+=40)for(let z=-1400;z<=1400;z+=40){const a=[x,z],b=[x+15,z];if(bodyWalkable(a,4.8)&&bodyWalkable(b,4.8)&&bodySegmentWalkable(a,b,.01)){open.push(a,b);break;}}
const contact=await authorityObserver(authority,first),openFrame=observations(open),isPair=r=>r.type==='co-presence'&&r.participants.some(p=>p.id==='an')&&r.participants.some(p=>p.id===peer.id);
for(let n=0;n<29;n++)contact.observer.step({...openFrame,fromRealMs:base+n*100,toRealMs:base+(n+1)*100,fromSimMs:n*100,toSimMs:(n+1)*100});assert(!contact.records.some(isPair));contact.observer.step({...openFrame,fromRealMs:base+2900,toRealMs:base+3000,fromSimMs:2900,toSimMs:3000});assert.equal(contact.records.filter(isPair).length,1);
const badRoots=await authorityObserver(authority,first),fake=structuredClone(openFrame);fake.after[0].position[0]+=1;assert.throws(()=>badRoots.observer.step({...fake,fromRealMs:base,toRealMs:base+100,fromSimMs:0,toSimMs:100}),/body-provenance/);
console.log(JSON.stringify({suite:'ground-authority',mode:'real-GND2-replay plus separate synthetic geometry negatives',counts:result.a.counts,records:result.records.length,chunkResumeEquivalent:true,baselineNotArrivalOrSpeech:true,plannedPartialCancelledNotHeard:true,pauseNoCredit:true,rawClockMismatchRejected:true,legacyTransitNoCompletion:true,thirdPartyNotHeard:true,entryBaselineFreshEpoch:true,staticWallAndDurationGate:true,projectedRootsRejected:true,corruptStateRejected:true,worldWrites:false,eligibleForReward:false,eligibleForP2P:false}));
