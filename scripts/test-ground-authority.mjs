/** GND3 accounting against real GND2 replay. Isolated worlds only; no DB or network. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {meetingSteps} from '../lib/living/activities.ts';
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
async function run(until,chunk=2000){let s=structuredClone(shared),a=structuredClone(authority);const records=[];let guards=0;
 while(s.cursorRealMs<base+until){assert(++guards<2000);const current=s.sourceSeq===1?first:second,trace=await authorityObserver(a,current),out=await replayShared(s,current,s.sourceSeq===1?[second]:[],Math.min(base+until,s.cursorRealMs+chunk),null,trace.observer);assert(out.state.cursorRealMs>s.cursorRealMs);s=out.state;a=await validateAuthorityState(trace.state);records.push(...trace.records);}
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
console.log(JSON.stringify({suite:'ground-authority',mode:'real-GND2-replay',counts:result.a.counts,records:result.records.length,chunkResumeEquivalent:true,baselineNotArrivalOrSpeech:true,worldWrites:false,eligibleForReward:false,eligibleForP2P:false}));
