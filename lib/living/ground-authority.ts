/** GND3 accounting observes accepted server physics; it never moves a body or trains a policy. */
import {z} from 'zod';
import type {World,PersonPlan} from '../world.ts';
import {computeSimMs} from '../clock.ts';
import {places,distance,type Actor,type Point} from '../life.ts';
import {stepSchema} from '../event-schema.ts';
import {bodySegmentWalkable} from '../city/walk-ground.ts';
import {groundHash,GroundTimelineError} from './ground-timeline.ts';
import type {SharedState,SharedSource,SharedObservation,SharedObserver} from './shared-ground.ts';
import contract from '../../docs/validation/ground-authority-contract-v1.json' with {type:'json'};
export const AUTHORITY_SCOPE='server-ground-authority-v1';
export const AUTHORITY_LIMITS=Object.freeze({...contract.limits});
const finite=z.number().finite(),time=finite.nonnegative().max(Number.MAX_SAFE_INTEGER),count=time.int(),hash=z.string().regex(/^[a-f0-9]{64}$/),id=z.string().regex(/^[a-z][a-z0-9-]{0,99}$/),point=z.tuple([finite.min(-5000).max(5000),finite.min(-5000).max(5000)]);
const planSchema=z.object({createdAt:z.string().datetime({offset:true}),pausedMs:time,from:z.string().max(100),originPath:z.array(point).max(512).optional(),transport:z.enum(['walk','bicycle','motorbike','bus','metro']).optional(),simStartedAt:time,generator:z.enum(['rules','local-llm']).optional(),steps:z.array(stepSchema.strict()).min(1).max(8)}).strict();
const stepStateSchema=z.object({index:count.max(7),startMs:finite,endMs:finite,requested:point.nullable(),goal:point.nullable(),dwellMs:time,moved:z.boolean(),arrivalAt:time.nullable(),closed:z.boolean()}).strict();
const actorSchema=z.object({id,epoch:count.positive(),baselineSha256:hash,planSha256:hash,plan:planSchema.nullable(),observedSimMs:time,sourceSeq:count.positive(),sourceRevision:count,sourceRealMs:time,offsetMs:finite,step:stepStateSchema.nullable(),status:z.enum(['baseline','unsupported','tracking','expired'])}).strict();
const pairSchema=z.object({a:id,b:id,epochA:count.positive(),epochB:count.positive(),sinceMs:time,lastMs:time,reported:z.boolean()}).strict();
const bindingSchema=z.object({id,epoch:count.positive(),planSha256:hash}).strict();
const speechWindowSchema=z.object({id,index:count.max(7),startMs:finite,endMs:finite}).strict();
const pendingSchema=z.object({generator:z.enum(['rules','local-llm']),turnSha256:hash,location:z.string().max(100),windows:z.tuple([speechWindowSchema,speechWindowSchema]),turnId:z.string().min(1).max(160),sourceSeq:count.positive(),sourceRevision:count,bindings:z.tuple([bindingSchema,bindingSchema]),earliestMs:time,line:count.max(6),nextMs:time,activeId:z.string().max(240).nullable(),lines:z.array(z.object({speaker:id,text:z.string().min(1).max(600).refine(s=>s.trim().length>0)}).strict()).min(1).max(6)}).strict();
export const utteranceSchema=z.object({generator:z.enum(['rules','local-llm']),turnSha256:hash,windows:z.tuple([speechWindowSchema.extend({goal:point,requested:point}),speechWindowSchema.extend({goal:point,requested:point})]),id:z.string().min(1).max(240),turnId:z.string().min(1).max(160),sourceSeq:count.positive(),sourceRevision:count,speakerId:id,listenerId:id,bindings:z.tuple([bindingSchema,bindingSchema]),text:z.string().min(1).max(600).refine(s=>s.trim().length>0),fromSimMs:time,untilSimMs:time,cancelledAt:time.nullable(),completed:z.boolean()}).strict();
export const authorityStateSchema=z.object({version:z.literal(1),scope:z.literal(AUTHORITY_SCOPE),protocolSha256:hash,sessionId:z.string().uuid(),worldBorn:z.string().datetime({offset:true}),geometrySha256:hash,startedSimMs:time,cursorSimMs:time,sourceSeq:count.positive(),sourceSha256:hash,sourceRevision:count,parentCheckpoint:hash,parentSequence:count,sequence:count,nextEpoch:count.positive(),actors:z.array(actorSchema).max(243),pairs:z.array(pairSchema).max(8192),pending:pendingSchema.nullable(),baselineTurnId:z.string().max(160).nullable(),seenTurnId:z.string().max(160).nullable(),turnHighWaterSimMs:time.nullable(),utterances:z.array(utteranceSchema).max(64),counts:z.object({arrivals:count,presence:count,encounters:count,heard:count}).strict(),lastReceiptDigest:hash.nullable(),nonce:z.string().uuid()}).strict();
export type AuthorityState=z.infer<typeof authorityStateSchema>;
export type AuthorityUtterance=z.infer<typeof utteranceSchema>;
type Intent=AuthorityState['actors'][number];
type Walker=SharedState['walk']['walkers'][number][1];
export type AuthorityRecord={type:'arrival'|'presence-completed'|'co-presence'|'utterance-emitted'|'heard-utterance'|'utterance-interrupted';simMs:number;sourceSeq:number;sourceRevision:number;eligibleForReward:false;eligibleForP2P:false;[key:string]:unknown};
const fail=(code:string):never=>{throw new GroundTimelineError(code);};
let digest:Promise<string>|undefined;
export const authorityProtocolSha=()=>digest??=groundHash(contract);
const roster=(w:World)=>[...w.people,...(w.living?.residents??[])];
const blockedKinds=new Set(['run','jump','tag','cycle','exercise','walk-pet','play','board','fly','drive']);
function supported(plan:PersonPlan|undefined){const parsed=planSchema.safeParse(plan);return parsed.success&&(!parsed.data.transport||parsed.data.transport==='walk')&&parsed.data.steps.every(s=>!!places[s.location])?parsed.data:null;}
function activeStep(plan:NonNullable<Intent['plan']>,simMs:number,offset=0){let start=plan.simStartedAt+offset;for(let index=0;index<plan.steps.length;index++){const end=start+plan.steps[index].duration*1000;if(simMs>=start&&simMs<end)return {index,start,end,step:plan.steps[index]};start=end;}return null;}
const same=(a:readonly number[],b:readonly number[],epsilon=.001)=>distance(a as Point,b as Point)<=epsilon;
function emit(records:AuthorityRecord[],state:AuthorityState,type:AuthorityRecord['type'],simMs:number,detail:Record<string,unknown>){
 if(records.length>=8192)fail('authority-record-budget');records.push({...structuredClone(detail),type,simMs,sourceSeq:state.sourceSeq,sourceRevision:state.sourceRevision,eligibleForReward:false,eligibleForP2P:false});
}
export async function bootstrapAuthority(shared:SharedState,source:SharedSource,parentCheckpoint:string):Promise<AuthorityState>{
 const world=JSON.parse(source.raw) as World;
 if(source.seq!==shared.sourceSeq||world.born!==shared.worldBorn||await groundHash(source.raw)!==shared.sourceSha256)fail('authority-source-mismatch');
 const actors:Intent[]=[];let epoch=1;
 for(const p of roster(world).sort((a,b)=>a.id.localeCompare(b.id))){const sha=await groundHash(p.plan??null);actors.push({id:p.id,epoch:epoch++,baselineSha256:sha,planSha256:sha,plan:null,observedSimMs:shared.simMs,sourceSeq:source.seq,sourceRevision:source.revision,sourceRealMs:source.capturedAt,offsetMs:0,step:null,status:'baseline'});}
 return authorityStateSchema.parse({version:1,scope:AUTHORITY_SCOPE,protocolSha256:await authorityProtocolSha(),sessionId:shared.sessionId,worldBorn:shared.worldBorn,geometrySha256:shared.geometrySha256,startedSimMs:shared.simMs,cursorSimMs:shared.simMs,sourceSeq:source.seq,sourceSha256:shared.sourceSha256,sourceRevision:source.revision,parentCheckpoint,parentSequence:shared.sequence,sequence:0,nextEpoch:epoch,actors,pairs:[],pending:null,baselineTurnId:world.livingTurn?.id??null,seenTurnId:world.livingTurn?.id??null,turnHighWaterSimMs:world.livingTurn?.simStartedAt??null,utterances:[],counts:{arrivals:0,presence:0,encounters:0,heard:0},lastReceiptDigest:null,nonce:crypto.randomUUID()});
}
export async function validateAuthorityState(value:unknown){
 const state=authorityStateSchema.parse(value);
 if(new TextEncoder().encode(JSON.stringify(state)).length>AUTHORITY_LIMITS.stateBytes||state.protocolSha256!==await authorityProtocolSha()||state.cursorSimMs<state.startedSimMs||new Set(state.actors.map(a=>a.id)).size!==state.actors.length||new Set(state.actors.map(a=>a.epoch)).size!==state.actors.length||state.actors.some(a=>a.epoch>=state.nextEpoch||a.observedSimMs>state.cursorSimMs))fail('authority-state-integrity');
 for(const a of state.actors){if(a.plan&&await groundHash(a.plan)!==a.planSha256)fail('authority-plan-integrity');if(a.step&&(!a.plan||a.step.index>=a.plan.steps.length||a.step.endMs<=a.step.startMs||a.step.dwellMs>a.step.endMs-a.step.startMs+.001||!a.step.goal!==!a.step.requested))fail('authority-step-integrity');}
 const actors=new Map(state.actors.map(a=>[a.id,a]));
 if(new Set(state.pairs.map(p=>p.a+'/'+p.b)).size!==state.pairs.length||state.pairs.some(p=>p.a>=p.b||actors.get(p.a)?.epoch!==p.epochA||actors.get(p.b)?.epoch!==p.epochB||p.sinceMs>p.lastMs||p.lastMs>state.cursorSimMs))fail('authority-pair-integrity');
 if(new Set(state.utterances.map(u=>u.id)).size!==state.utterances.length||state.utterances.some(u=>u.untilSimMs-u.fromSimMs!==12000||u.cancelledAt!==null&&(u.cancelledAt<u.fromSimMs||u.cancelledAt>u.untilSimMs)||u.completed&&u.cancelledAt!==null)||state.pending?.activeId&&!state.utterances.some(u=>u.id===state.pending!.activeId&&!u.completed&&u.cancelledAt===null))fail('authority-speech-integrity');
 for(const a of state.actors){if((a.status==='tracking'||a.status==='expired')&&!a.plan)fail('authority-plan-integrity');if(!a.step||!a.plan)continue;const s=a.step,start=a.plan.simStartedAt+a.offsetMs+a.plan.steps.slice(0,s.index).reduce((v,p)=>v+p.duration*1000,0),end=start+a.plan.steps[s.index].duration*1000;
  if(s.startMs!==start||s.endMs!==end||s.arrivalAt!==null&&(s.arrivalAt<Math.max(s.startMs,a.observedSimMs)||s.arrivalAt>Math.min(state.cursorSimMs,s.endMs))||s.dwellMs>Math.max(0,Math.min(state.cursorSimMs,end)-Math.max(start,a.observedSimMs))+.001)fail('authority-window-integrity');}
 if(state.pairs.some(p=>p.sinceMs<state.startedSimMs||p.reported!==(p.lastMs-p.sinceMs>=3000)))fail('authority-contact-integrity');
 for(const u of state.utterances){if(u.fromSimMs<state.startedSimMs||u.fromSimMs>state.cursorSimMs||u.completed&&u.untilSimMs>state.cursorSimMs||u.cancelledAt!==null&&u.cancelledAt>state.cursorSimMs||u.speakerId===u.listenerId||!u.bindings.some(b=>b.id===u.speakerId)||!u.bindings.some(b=>b.id===u.listenerId)||u.windows.some(w=>!u.bindings.some(b=>b.id===w.id)||w.startMs>u.fromSimMs||w.endMs<=u.untilSimMs))fail('authority-utterance-integrity');}
 if(state.pending&&(state.pending.line>=state.pending.lines.length||state.pending.bindings.some(b=>!state.pending!.windows.some(w=>w.id===b.id))||state.pending.activeId&&state.utterances.find(u=>u.id===state.pending!.activeId)!.untilSimMs<=state.cursorSimMs))fail('authority-pending-integrity');
 return state;
}
function cancelSpeech(state:AuthorityState,records:AuthorityRecord[],at:number){const pending=state.pending;if(!pending)return;if(pending.activeId){const u=state.utterances.find(u=>u.id===pending.activeId);if(u&&!u.completed&&u.cancelledAt===null){u.cancelledAt=Math.min(at,u.untilSimMs);emit(records,state,'utterance-interrupted',at,{utteranceId:u.id,speakerId:u.speakerId,listenerId:u.listenerId});}}state.pending=null;}
async function adoptSource(state:AuthorityState,source:SharedSource,groundSimMs:number,records:AuthorityRecord[]){
 const world=JSON.parse(source.raw) as World;
 if(source.seq<=state.sourceSeq||source.revision!==state.sourceRevision+1||world.born!==state.worldBorn||groundSimMs!==state.cursorSimMs)fail('authority-source-order');
 const old=new Map(state.actors.map(a=>[a.id,a])),actors:Intent[]=[],worldSim=computeSimMs(world.born,world.clock,source.capturedAt);
 if(!Number.isFinite(worldSim)||worldSim<0)fail('authority-clock-invalid');
 state.sourceSeq=source.seq;state.sourceRevision=source.revision;state.sourceSha256=await groundHash(source.raw);
 for(const p of roster(world).sort((a,b)=>a.id.localeCompare(b.id))){const sha=await groundHash(p.plan??null),a=old.get(p.id);
  if(!a){actors.push({id:p.id,epoch:state.nextEpoch++,baselineSha256:sha,planSha256:sha,plan:null,observedSimMs:groundSimMs,sourceSeq:source.seq,sourceRevision:source.revision,sourceRealMs:source.capturedAt,offsetMs:0,step:null,status:'baseline'});continue;}
  if(a.planSha256!==sha){a.planSha256=sha;a.plan=sha===a.baselineSha256?null:supported(p.plan);a.status=sha===a.baselineSha256?'baseline':a.plan?'tracking':'unsupported';a.step=null;a.observedSimMs=groundSimMs;a.sourceSeq=source.seq;a.sourceRevision=source.revision;a.sourceRealMs=source.capturedAt;a.offsetMs=groundSimMs-worldSim;}
  actors.push(a);
 }
 state.actors=actors;const byId=new Map(actors.map(a=>[a.id,a]));state.pairs=state.pairs.filter(p=>byId.get(p.a)?.epoch===p.epochA&&byId.get(p.b)?.epoch===p.epochB);
 if(state.pending?.bindings.some(b=>byId.get(b.id)?.epoch!==b.epoch||byId.get(b.id)?.planSha256!==b.planSha256))cancelSpeech(state,records,groundSimMs);
 const turn=world.livingTurn;
 if(state.pending&&(turn?.id!==state.pending.turnId||await groundHash(turn??null)!==state.pending.turnSha256))cancelSpeech(state,records,groundSimMs);
 if(turn?.id&&turn.id!==state.seenTurnId){
  state.seenTurnId=turn.id;cancelSpeech(state,records,groundSimMs);
  const fresh=Number.isFinite(turn.simStartedAt)&&turn.simStartedAt!>=0&&(state.turnHighWaterSimMs===null||turn.simStartedAt!>state.turnHighWaterSimMs);
  if(Number.isFinite(turn.simStartedAt)&&turn.simStartedAt!>=0)state.turnHighWaterSimMs=Math.max(state.turnHighWaterSimMs??0,turn.simStartedAt!);
  const first=byId.get('an'),second=byId.get(turn.residentId),lines=pendingSchema.shape.lines.safeParse(turn.dialogue);
  if(fresh&&['rules','local-llm'].includes(turn.generator)&&world.living?.residents.some(r=>r.id===turn.residentId)&&turn.id!==state.baselineTurnId&&turn.id.length<=160&&first?.plan&&second?.plan&&first.id!==second.id&&Number.isFinite(turn.simStartedAt)&&lines.success&&lines.data.every(l=>l.speaker===first.id||l.speaker===second.id)&&new Set(lines.data.map(l=>l.speaker)).size===2){
   const earliest=Math.max(groundSimMs,groundSimMs+turn.simStartedAt!+120000-worldSim);
   const meeting=[first,second].map(a=>activeStep(a.plan!,earliest,a.offsetMs));
   if(meeting.some(m=>!m||m.step.location!==turn.location||m.end<=earliest+12000))return;
   state.pending={generator:turn.generator,turnSha256:await groundHash(turn),location:turn.location,windows:meeting.map((m,i)=>({id:[first,second][i].id,index:m!.index,startMs:m!.start,endMs:m!.end})) as z.infer<typeof pendingSchema>['windows'],turnId:turn.id,sourceSeq:source.seq,sourceRevision:source.revision,bindings:[{id:first.id,epoch:first.epoch,planSha256:first.planSha256},{id:second.id,epoch:second.epoch,planSha256:second.planSha256}],earliestMs:earliest,line:0,nextMs:earliest,activeId:null,lines:lines.data};
  }
 }
}
function stationary(actor:Actor|undefined,walker:Walker|undefined){return !!actor&&!!walker&&!actor.walking&&walker.speed<.01&&Math.hypot(...walker.velocity)<.01&&same(actor.position,walker.position)&&distance(actor.position,walker.goal)<=.6&&walker.next>=walker.path.length;}
function boundAt(a:Intent,at:number,actor:Actor|undefined,walker:Walker|undefined){if(!a.plan||a.status!=='tracking'||!actor||!walker)return null;const intended=activeStep(a.plan,at,a.offsetMs),raw=activeStep(a.plan,at);return intended&&raw&&!blockedKinds.has(intended.step.kind)&&!blockedKinds.has(raw.step.kind)&&intended.index===raw.index&&actor.source==='plan'&&actor.kind===raw.step.kind&&actor.location===raw.step.location?intended:null;}
function trackPresence(state:AuthorityState,ob:SharedObservation,records:AuthorityRecord[]){
 const before=new Map(ob.before.map(a=>[a.id,a])),after=new Map(ob.after.map(a=>[a.id,a])),walk0=new Map(ob.beforeWalk.walkers),walk1=new Map(ob.afterWalk.walkers),dt=ob.toSimMs-ob.fromSimMs;
 for(const a of state.actors){if(!a.plan)continue;
  const b=before.get(a.id),c=after.get(a.id),w0=walk0.get(a.id),w1=walk1.get(a.id),at=boundAt(a,ob.fromSimMs,b,w0);
  if(a.step&&!a.step.closed&&ob.toSimMs>=a.step.endMs){const s=a.step,last=activeStep(a.plan,s.endMs-.00001,a.offsetMs),raw=activeStep(a.plan,s.endMs-.00001);
   const continuous=at?.index===s.index&&last?.index===s.index&&raw?.index===s.index&&ob.fromSimMs<s.endMs&&b&&c&&w0&&w1&&stationary(b,w0)&&stationary(c,w1)&&s.goal&&s.requested&&same(w0.goal,s.goal)&&same(w1.goal,s.goal)&&same(w0.requested,s.requested)&&same(w1.requested,s.requested)&&same(b.position,c.position,.01);
   if(continuous)s.dwellMs+=Math.max(0,s.endMs-ob.fromSimMs);
   if(continuous&&s.arrivalAt!==null&&s.dwellMs>=(s.endMs-s.startMs)*.38){state.counts.presence++;emit(records,state,'presence-completed',s.endMs,{actorId:a.id,epoch:a.epoch,planSha256:a.planSha256,planSourceSeq:a.sourceSeq,planSourceRevision:a.sourceRevision,stepIndex:s.index,location:a.plan.steps[s.index].location,window:[s.startMs,s.endMs],arrivalAt:s.arrivalAt,dwellMs:s.dwellMs,requested:s.requested,goal:s.goal,position:c!.position,effect:'simulated-presence-only'});}
   s.closed=true;
  }
  const next=boundAt(a,ob.toSimMs,c,w1);
  if(!next){if(a.step&&!a.step.closed){a.step.dwellMs=0;a.step.arrivalAt=null;}if(a.plan.simStartedAt+a.offsetMs+a.plan.steps.reduce((sum,s)=>sum+s.duration*1000,0)<=ob.toSimMs)a.status='expired';continue;}
  if(!a.step||a.step.index!==next.index){a.step={index:next.index,startMs:next.start,endMs:next.end,requested:null,goal:null,dwellMs:0,moved:false,arrivalAt:null,closed:false};}
  const s=a.step;if(s.closed||!w1||!c)continue;
  if(s.goal&&(!same(s.goal,w1.goal)||!same(s.requested!,w1.requested))){s.dwellMs=0;s.arrivalAt=null;s.goal=null;s.requested=null;}
  if(b&&distance(b.position,c.position)>.001)s.moved=true;
  if(!s.goal){s.goal=[...w1.goal];s.requested=[...w1.requested];}
  const continuous=at?.index===next.index&&b&&w0&&stationary(b,w0)&&stationary(c,w1)&&same(b.position,c.position,.01)&&same(w0.goal,s.goal)&&same(w0.requested,s.requested!);
  if(continuous){if(s.arrivalAt===null){s.arrivalAt=ob.toSimMs;state.counts.arrivals++;emit(records,state,'arrival',ob.toSimMs,{actorId:a.id,epoch:a.epoch,planSha256:a.planSha256,planSourceSeq:a.sourceSeq,planSourceRevision:a.sourceRevision,stepIndex:s.index,location:next.step.location,window:[s.startMs,s.endMs],position:[...c.position],requested:s.requested,goal:s.goal,observation:s.moved?'observed-movement':'already-present'});}s.dwellMs+=dt;}else{s.dwellMs=0;s.arrivalAt=null;}
 }
}
function clearContact(a0:Actor,b0:Actor,a1:Actor,b1:Actor){const moved=Math.max(distance(a0.position,a1.position),distance(b0.position,b1.position));return distance(a0.position,b0.position)<=30&&distance(a1.position,b1.position)<=30&&bodySegmentWalkable(a0.position,b0.position,moved+.01)&&bodySegmentWalkable(a1.position,b1.position,.01);}
function trackContacts(state:AuthorityState,ob:SharedObservation,records:AuthorityRecord[]){
 const humanIds=new Map(state.actors.map(a=>[a.id,a])),before=new Map(ob.before.map(a=>[a.id,a])),actors=ob.after.filter(a=>humanIds.has(a.id)).sort((a,b)=>a.id.localeCompare(b.id)),old=new Map(state.pairs.map(p=>[p.a+'/'+p.b,p])),pairs:AuthorityState['pairs']=[];
 // At most243 humans; use spatial buckets so static clearance is only checked
 // for nearby pairs, regardless of the renderer's72-person subset.
 const buckets=new Map<string,Actor[]>();for(const a of actors){const key=Math.floor(a.position[0]/30)+':'+Math.floor(a.position[1]/30),list=buckets.get(key)??[];list.push(a);buckets.set(key,list);}
 for(const a of actors){const x=Math.floor(a.position[0]/30),z=Math.floor(a.position[1]/30);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const b of buckets.get(`${x+dx}:${z+dz}`)??[]){if(a.id>=b.id)continue;const a0=before.get(a.id),b0=before.get(b.id);if(!a0||!b0||!clearContact(a0,b0,a,b))continue;const key=a.id+'/'+b.id,epochA=humanIds.get(a.id)!.epoch,epochB=humanIds.get(b.id)!.epoch,prior=old.get(key),p=prior&&prior.epochA===epochA&&prior.epochB===epochB&&prior.lastMs===ob.fromSimMs?prior:{a:a.id,b:b.id,epochA,epochB,sinceMs:ob.fromSimMs,lastMs:ob.fromSimMs,reported:false};p.lastMs=ob.toSimMs;
   if(!p.reported&&p.lastMs-p.sinceMs>=3000){p.reported=true;state.counts.encounters++;emit(records,state,'co-presence',ob.toSimMs,{participants:[{id:p.a,epoch:epochA},{id:p.b,epoch:epochB}],sinceMs:p.sinceMs,durationMs:p.lastMs-p.sinceMs,positions:[a.position,b.position],knowledge:'witnessed-co-presence-only'});}pairs.push(p);if(pairs.length>8192)fail('authority-pair-budget');
  }}
 state.pairs=pairs.sort((a,b)=>(a.a+'/'+a.b).localeCompare(b.a+'/'+b.b));
}
function trackSpeech(state:AuthorityState,ob:SharedObservation,records:AuthorityRecord[]){
 const p=state.pending;if(!p)return;const actors=new Map(state.actors.map(a=>[a.id,a])),before=new Map(ob.before.map(a=>[a.id,a])),after=new Map(ob.after.map(a=>[a.id,a])),walk0=new Map(ob.beforeWalk.walkers),walk1=new Map(ob.afterWalk.walkers);
 if(!p.activeId){const windows=p.bindings.map(b=>{const a=actors.get(b.id);return a?.plan?activeStep(a.plan,ob.toSimMs,a.offsetMs):null;});
  if(windows.every(w=>!!w&&w.step.location===p.location&&!blockedKinds.has(w.step.kind)))p.windows=windows.map((w,i)=>({id:p.bindings[i].id,index:w!.index,startMs:w!.start,endMs:w!.end})) as typeof p.windows;
  else if(ob.toSimMs>=p.earliestMs&&p.bindings.some(b=>{const a=actors.get(b.id);return !a?.plan||a.plan.simStartedAt+a.offsetMs+a.plan.steps.reduce((v,s)=>v+s.duration*1000,0)<=ob.toSimMs;})){cancelSpeech(state,records,ob.toSimMs);return;}
 }
 const valid=p.bindings.every(binding=>{const a=actors.get(binding.id),window=p.windows.find(w=>w.id===binding.id);return window&&a?.plan&&activeStep(a.plan,ob.fromSimMs,a.offsetMs)?.index===window.index&&activeStep(a.plan,ob.toSimMs,a.offsetMs)?.index===window.index&&after.get(binding.id)?.location===p.location&&a.epoch===binding.epoch&&a.planSha256===binding.planSha256&&boundAt(a,ob.fromSimMs,before.get(a.id),walk0.get(a.id))&&boundAt(a,ob.toSimMs,after.get(a.id),walk1.get(a.id))&&stationary(before.get(a.id),walk0.get(a.id))&&stationary(after.get(a.id),walk1.get(a.id))&&same(before.get(a.id)!.position,after.get(a.id)!.position,.01);});
 const pair=state.pairs.find(c=>p.bindings.some(b=>b.id===c.a)&&p.bindings.some(b=>b.id===c.b));
 if(p.activeId){const u=state.utterances.find(u=>u.id===p.activeId)!;if(!valid||!pair||u.windows.some(w=>!same(walk1.get(w.id)!.goal,w.goal)||!same(walk1.get(w.id)!.requested,w.requested))){cancelSpeech(state,records,ob.toSimMs);return;}if(ob.toSimMs>=u.untilSimMs){u.completed=true;state.counts.heard++;emit(records,state,'heard-utterance',u.untilSimMs,{utteranceId:u.id,turnId:u.turnId,turnSourceSeq:u.sourceSeq,generator:u.generator,turnSha256:u.turnSha256,windows:u.windows,speakerId:u.speakerId,recipientId:u.listenerId,bindings:u.bindings,text:u.text,knowledge:'heard-text-not-witnessed-truth',fromSimMs:u.fromSimMs,untilSimMs:u.untilSimMs});p.line++;p.activeId=null;p.nextMs=u.untilSimMs+1000;if(p.line>=p.lines.length)state.pending=null;}return;}
 if(ob.toSimMs<p.nextMs||!valid||!pair?.reported||p.windows.some(w=>ob.toSimMs+12000>=w.endMs))return;
 const line=p.lines[p.line],listener=p.bindings.find(b=>b.id!==line.speaker)!;
 const u:AuthorityUtterance={generator:p.generator,turnSha256:p.turnSha256,windows:p.windows.map(w=>({...w,goal:[...walk1.get(w.id)!.goal],requested:[...walk1.get(w.id)!.requested]})) as AuthorityUtterance['windows'],id:`${p.turnId}:${p.sourceSeq}:${p.line}`,turnId:p.turnId,sourceSeq:p.sourceSeq,sourceRevision:p.sourceRevision,speakerId:line.speaker,listenerId:listener.id,bindings:structuredClone(p.bindings),text:line.text,fromSimMs:ob.toSimMs,untilSimMs:ob.toSimMs+12000,cancelledAt:null,completed:false};
 state.utterances.push(u);state.utterances=state.utterances.slice(-64);p.activeId=u.id;
 emit(records,state,'utterance-emitted',ob.toSimMs,{utteranceId:u.id,turnId:u.turnId,turnSourceSeq:u.sourceSeq,generator:u.generator,turnSha256:u.turnSha256,windows:u.windows,speakerId:u.speakerId,listenerId:u.listenerId,bindings:u.bindings,text:u.text,untilSimMs:u.untilSimMs});
}
/** Pure observer for GND2 accepted physics; persistence must couple both heads in one CAS. */
export async function authorityObserver(previous:AuthorityState,current:SharedSource){
 const state=await validateAuthorityState(previous),records:AuthorityRecord[]=[];
 if(state.sourceSeq!==current.seq||state.sourceSha256!==await groundHash(current.raw))fail('authority-source-mismatch');
 let acceptedRaw=current.raw,acceptedAt=current.capturedAt,physicsSteps=0,sourceCount=0;
 const observer:SharedObserver={source:async(_world,source,groundSimMs)=>{if(++sourceCount>8)fail('authority-source-budget');await adoptSource(state,source,groundSimMs,records);acceptedRaw=source.raw;acceptedAt=source.capturedAt;},step:ob=>{
  if(++physicsSteps>120)fail('authority-physics-budget');
  const rootsMatch=(actors:Actor[],walk:SharedState['walk'])=>{const walkers=new Map(walk.walkers);return actors.length===walkers.size&&new Set(actors.map(a=>a.id)).size===actors.length&&actors.every(a=>walkers.has(a.id)&&same(a.position,walkers.get(a.id)!.position,.000001));};
  if(!rootsMatch(ob.before,ob.beforeWalk)||!rootsMatch(ob.after,ob.afterWalk))fail('authority-body-provenance');
  const dt=ob.toSimMs-ob.fromSimMs;if(ob.source.seq!==state.sourceSeq||ob.source.revision!==state.sourceRevision||ob.source.raw!==acceptedRaw||ob.source.capturedAt!==acceptedAt||ob.fromSimMs!==state.cursorSimMs||!Number.isFinite(dt)||dt<0||dt>100.00001)fail('authority-physics-order');
  if(dt>0){trackPresence(state,ob,records);trackContacts(state,ob,records);trackSpeech(state,ob,records);}state.cursorSimMs=ob.toSimMs;
 }};
 return {state,records,observer};
}
