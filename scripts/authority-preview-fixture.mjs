/** Real GND2 replay roots/accounting, synthetic transport checkpoints for browser QA.
 * No DB/fetch, no production receipt or history. Compiled D1 verifies persistence separately. */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {meetingSteps} from '../lib/living/activities.ts';
import {bootstrapShared,replayShared,projectionWorld} from '../lib/living/shared-ground.ts';
import {bootstrapAuthority,authorityObserver} from '../lib/living/ground-authority.ts';
import {groundHash} from '../lib/living/ground-timeline.ts';
import {projectAuthorityView} from '../lib/living/ground-authority-view.ts';
import {validateSharedView} from '../lib/living/shared-ground-view.ts';
import {worldTime,weatherAt} from '../lib/clock.ts';
export async function authorityPreviewFixture(){
 const base=Date.now()-5000,world={...structuredClone(seed),born:new Date(base).toISOString(),living:initializeLiving(base),clock:{pausedAt:null,pausedMs:0,scale:60,anchors:[{realMs:base,simMs:0,scale:60}]}};world.living.residents=world.living.residents.slice(0,1);
 const source=(seq,w,at=base)=>({seq,revision:seq-1,capturedAt:at,raw:JSON.stringify(w)}),first=source(1,world),initialShared=await bootstrapShared(first,crypto.randomUUID()),initialAuthority=await bootstrapAuthority(initialShared,first,'f'.repeat(64));
 const fresh=structuredClone(world),peer=fresh.living.residents[0],plan=()=>({createdAt:new Date(base).toISOString(),pausedMs:0,from:'Sân chung',simStartedAt:0,steps:meetingSteps('Công viên','Trò chuyện có nguồn')});fresh.people[0].plan=plan();peer.plan=plan();
 fresh.livingTurn={id:'browser-ground-turn',createdAt:new Date(base).toISOString(),date:'2026-10-29',title:'Gặp nhau ở công viên',summary:'Fixture kiểm tra emission, không là lịch sử người dùng',location:'Công viên',activity:'Trò chuyện',kind:'social',residentId:peer.id,simStartedAt:0,dialogue:[{speaker:'an',text:'Chào bạn, mình đã tới công viên rồi.'},{speaker:peer.id,text:'Mình nghe bạn. Chúng ta cùng nghỉ một chút nhé.'},{speaker:'an',text:'Mình sẽ chờ ở đây và giữ lời hẹn.'},{speaker:peer.id,text:'Cảm ơn bạn đã lắng nghe.'}],generator:'rules',context:{date:'2026-10-29'}};
 const second=source(2,fresh);
 async function advance(ctx,target,sources=[]){let {s,a,current}=ctx,iterations=0;do{if(++iterations>100)throw Error('Fixture replay budget');const trace=await authorityObserver(a,current),out=await replayShared(s,current,sources,target,null,trace.observer);s=out.state;a=trace.state;current=[current,...sources].find(r=>r.seq===s.sourceSeq);sources=sources.filter(r=>r.seq>s.sourceSeq);}while(s.cursorRealMs<target||sources.some(r=>r.capturedAt<=s.cursorRealMs));return {s,a,current};}
 async function packet(ctx,sequence){const s=structuredClone(ctx.s),a=structuredClone(ctx.a);s.sequence=sequence;const parent=await groundHash(s);a.parentCheckpoint=parent;a.parentSequence=sequence;
  const view=validateSharedView({version:2,scope:s.scope,worldBorn:s.worldBorn,checkpoint:parent,sequence,sourceRevision:s.sourceRevision,cursorRealMs:s.cursorRealMs,simMs:s.simMs,backlogMs:0,paused:JSON.parse(ctx.current.raw).paused,descriptors:s.descriptors,frames:s.frames,eligibleForReward:false,eligibleForP2P:false}),w=projectionWorld(JSON.parse(ctx.current.raw),s.simMs),wt=worldTime(w,0);
  return {revision:ctx.current.revision,serverNow:new Date(s.cursorRealMs).toISOString(),world:w,events:[],worldTime:wt,weatherState:weatherAt(w.born,wt),sharedGround:view,sharedAuthority:projectAuthorityView(a,await groundHash(a),view),__fixture:{mode:'real replay with synthetic transport heads; not a D1 receipt',counts:a.counts}};
 }
 const before=await advance({s:initialShared,a:initialAuthority,current:first},base+1900,[second]),active=await advance(before,base+2100);
 const pausedWorld=structuredClone(fresh);pausedWorld.paused=true;pausedWorld.clock.pausedAt=active.s.cursorRealMs;
 const paused=await advance(active,base+3100,[source(3,pausedWorld,active.s.cursorRealMs)]);
 const resumed=structuredClone(fresh);resumed.clock.anchors=[{realMs:paused.s.cursorRealMs,simMs:126000,scale:60}];
 const after=await advance(paused,base+4700,[source(4,resumed,paused.s.cursorRealMs)]);
 const cancelledWorld=structuredClone(fresh);delete cancelledWorld.people[0].plan;
 const cancelled=await advance(active,base+2300,[source(3,cancelledWorld,active.s.cursorRealMs)]);
 return {before:await packet(before,1),active:await packet(active,2),paused:await packet(paused,3),after:await packet(after,4),cancelled:await packet(cancelled,3)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await authorityPreviewFixture()));
