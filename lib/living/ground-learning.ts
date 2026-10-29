/** Offline synthetic rendezvous experiment. No application importer, DB or network. */
import {z} from 'zod';
import {hashSeed} from '../clock.ts';
import {seed as seedWorld,type World} from '../world.ts';
import {places,distance,type Point} from '../life.ts';
import {computeWalkPath} from '../city/walk-path.ts';
import {initializeLiving} from './engine.ts';
import {meetingSteps} from './activities.ts';
import {bootstrapShared,replayShared,type SharedSource,type SharedObservation,type SharedObserver} from './shared-ground.ts';
import {bootstrapAuthority,authorityObserver,type AuthorityRecord} from './ground-authority.ts';
import {groundHash} from './ground-timeline.ts';
import {fitLinear,linearScore,newArm,type LinearArm} from './linucb.ts';
import protocol from '../../docs/validation/learning-h3b-protocol-v1.json' with {type:'json'};
export const GROUND_REWARD='rendezvous-delayed-v1',GROUND_FEATURES='ground-rendezvous-6d-v1',GROUND_LEARNING='offline-ground-rendezvous-v1';
const count=z.number().int().nonnegative().safe(),finite=z.number().finite(),unit=finite.min(0).max(1),hash=z.string().regex(/^[a-f0-9]{64}$/);
const contextSchema=z.tuple([z.literal(1),unit,unit,unit,unit,unit]);
export type GroundContext=z.infer<typeof contextSchema>;
export type GroundOffer={id:string;seed:number;episode:number;location:string;value:number;peerAvailable:boolean};
export function groundOffer(seed:number,episode:number):GroundOffer{
 if(!Number.isSafeInteger(seed)||seed<0||seed>1_000_000||!Number.isSafeInteger(episode)||episode<0||episode>=8)throw Error('offer-budget');
 const h=hashSeed(`H3b-ground-v1:${seed}:${episode}`);
 return {id:`H3b:${seed}:${episode}`,seed,episode,location:protocol.generator.locations[h%8],value:protocol.generator.values[(h>>>12)%3],peerAvailable:((h>>>4)&1)===1};
}
export function rendezvousReward(value:number,fulfilled:boolean,travelUnits:number){
 if(!Number.isFinite(value)||value<0||value>1||!Number.isFinite(travelUnits)||travelUnits<0)throw Error('reward-input');
 return Math.max(-1,Math.min(1,(fulfilled?value:-.5)-travelUnits/1000));
}
let protocolDigest:Promise<string>|undefined;
export const groundLearningProtocolSha=()=>protocolDigest??=groundHash(protocol);
const freeze=<T>(v:T):T=>{if(v&&typeof v==='object'){for(const child of Object.values(v))freeze(child);Object.freeze(v);}return v;};
const outcomeSchema=z.object({version:z.literal(1),source:z.literal('synthetic-ground-study-v1'),rewardVersion:z.literal(GROUND_REWARD),featureVersion:z.literal(GROUND_FEATURES),protocolSha256:hash,id:z.string().regex(/^H3b:\d+:\d+$/),seed:count,episode:count.max(7),actorId:z.literal('an'),peerId:z.literal('neighbor-1'),actorScope:z.string().min(1).max(100),context:contextSchema,offeredValue:unit,fulfilled:z.boolean(),travelUnits:finite.nonnegative(),reward:finite.min(-1).max(1),proof:z.object({worldBorn:z.string().datetime(),sessionId:z.string().uuid(),goalSha256:hash,choiceSharedSha256:hash,choiceSourceSha256:hash,planSourceSha256:hash,finalSharedSha256:hash,finalAuthoritySha256:hash,recordsSha256:hash,actorPlanSha256:hash,peerPlanSha256:hash,window:z.tuple([finite.nonnegative(),finite.nonnegative()]),settledSimMs:finite.nonnegative(),continuousOverlapMs:finite.nonnegative(),matchedPresenceActors:z.array(z.string()).max(2),epochs:z.tuple([count.positive(),count.positive()]),sourceSeq:count.positive(),geometrySha256:hash}).strict(),eligibleForRuntimeReward:z.literal(false),eligibleForP2P:z.literal(false)}).strict();
export type GroundOutcome=z.infer<typeof outcomeSchema>;
const minted=new WeakSet<object>();
async function stableUuid(text:string){const h=await groundHash(text);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;}
const pathLength=(from:Point,to:Point)=>computeWalkPath(from,to).reduce((n,p,i,path)=>n+(i?distance(path[i-1],p):0),0);
export type GroundDiagnostic='cancel'|'paused'|'clock-mismatch'|'baseline'|'transit'|'partial'|'retired';
/** Generates its own worlds/plans and runs actual GND2 physics. No external receipt input. */
export async function replayGroundOffer(offer:GroundOffer,options:{diagnostic?:GroundDiagnostic;chunkRealMs?:number}={}){
 if(JSON.stringify(offer)!==JSON.stringify(groundOffer(offer.seed,offer.episode)))throw Error('offer-tamper');
 if(options.diagnostic&&(offer.seed<17900||offer.seed>17999))throw Error('diagnostic-seed-only');
 const chunk=options.chunkRealMs??2000;if(!Number.isInteger(chunk)||chunk<100||chunk>2000||chunk%100)throw Error('chunk-budget');
 const base=Date.parse('2026-01-01T00:00:00Z')+offer.seed*1_000_000+offer.episode*10_000;
 const world:World={...structuredClone(seedWorld),born:new Date(base).toISOString(),living:initializeLiving(base),clock:{pausedAt:null,pausedMs:0,scale:60,anchors:[{realMs:base,simMs:0,scale:60}]}};
 world.living!.residents=world.living!.residents.slice(0,1);delete world.livingTurn;
 const peerId=world.living!.residents[0].id;if(peerId!=='neighbor-1')throw Error('fixture-peer');
 const plan=(location:string)=>({createdAt:new Date(base).toISOString(),pausedMs:0,from:'Sân chung',simStartedAt:0,steps:meetingSteps(location,'Có mặt theo lịch hẹn')});
 const setPlans=(w:World)=>{w.people[0].plan=plan(offer.location);w.living!.residents[0].plan=plan(offer.peerAvailable?offer.location:offer.location==='Công viên'?'Thư viện':'Công viên');};
 if(options.diagnostic==='baseline')setPlans(world);
 const source=(seq:number,w:World,at=base):SharedSource=>({seq,revision:seq-1,capturedAt:at,raw:JSON.stringify(w)});
 const first=source(1,world);let current=first,s=await bootstrapShared(first,await stableUuid(`session:${offer.id}`));s.nonce=await stableUuid(`shared:${offer.id}`);
 let a=await bootstrapAuthority(s,first,'f'.repeat(64));a.nonce=await stableUuid(`authority:${offer.id}`);
 const position=(id:string)=>s.walk.walkers.find(([who])=>who===id)![1].position;
 const actorRoute=pathLength(position('an'),places[offer.location]),peerRoute=pathLength(position(peerId),places[offer.location]);
 const context:GroundContext=[1,offer.value,Math.min(1,actorRoute/2000),Math.min(1,peerRoute/2000),offer.peerAvailable?1:0,150000/210000];
 // This goal/context exists before either new plan is installed or any future step runs.
 const epochs:[number,number]=[a.actors.find(v=>v.id==='an')!.epoch,a.actors.find(v=>v.id===peerId)!.epoch];
 const goal=freeze({offer:structuredClone(offer),context:[...context],window:[150000,210000],epochs,sourceSeq:first.seq,worldBorn:world.born,choiceSharedSha256:await groundHash(s),choiceSourceSha256:await groundHash(first.raw)});
 const next=structuredClone(world);setPlans(next);
 if(options.diagnostic==='transit'){next.people[0].plan!.transport='bus';next.living!.residents[0].plan!.transport='bus';}
 if(options.diagnostic==='clock-mismatch'){next.clock!.anchors![0].simMs=1e9;next.people[0].plan!.simStartedAt=1e9;next.living!.residents[0].plan!.simStartedAt=1e9;}
 const second=source(2,next),planShas=await Promise.all([groundHash(next.people[0].plan),groundHash(next.living!.residents[0].plan)]);
 let sources=[second];
 if(options.diagnostic==='cancel'||options.diagnostic==='retired'){
  const cancelled=structuredClone(next);if(options.diagnostic==='cancel')delete cancelled.people[0].plan;else cancelled.living!.residents=[];
  sources.push(source(3,cancelled,base+2500));
 }
 if(options.diagnostic==='paused'){const paused=structuredClone(next);paused.paused=true;paused.clock!.pausedAt=base+2000;sources.push(source(3,paused,base+2000));}
 const allRecords:AuthorityRecord[]=[];let travelUnits=0,overlap=0,closed=false,physicsSteps=0;
 const target=base+(options.diagnostic==='partial'?2100:3600);let iterations=0;
 do{
  if(++iterations>100)throw Error('replay-batch-budget');
  const trace=await authorityObserver(a,current);
  const observer:SharedObserver={source:trace.observer.source,step:(ob:SharedObservation)=>{
   trace.observer.step!(ob);const dt=ob.toSimMs-ob.fromSimMs;
   if(dt>0&&ob.fromSimMs<210000){const before=ob.before.find(v=>v.id==='an'),after=ob.after.find(v=>v.id==='an');if(before&&after)travelUnits+=distance(before.position,after.position)*Math.min(1,(210000-ob.fromSimMs)/dt);}
   if(!closed&&ob.toSimMs>=210000){closed=true;
    const pair=trace.state.pairs.find(p=>p.a==='an'&&p.b===peerId&&p.epochA===epochs[0]&&p.epochB===epochs[1]);
    const bound=trace.state.actors.filter(v=>v.id==='an'||v.id===peerId);
    if(pair&&bound.length===2&&bound.every(v=>v.planSha256===planShas[v.id==='an'?0:1]&&v.sourceSeq===2)&&pair.lastMs>=210000)overlap=Math.max(0,210000-Math.max(150000,pair.sinceMs));
   }
  }};
  const out=await replayShared(s,current,sources,Math.min(target,s.cursorRealMs+chunk),null,observer);
  physicsSteps+=out.physicsSteps;s=out.state;a=trace.state;allRecords.push(...trace.records);
  current=[current,...sources].find(v=>v.seq===s.sourceSeq)!;sources=sources.filter(v=>v.seq>s.sourceSeq);
 }while(s.cursorRealMs<target||sources.some(v=>v.capturedAt<=s.cursorRealMs));
 const matching=allRecords.filter(r=>r.type==='presence-completed'&&r.stepIndex===2&&r.location===offer.location&&r.planSourceSeq===2&&r.planSha256===planShas[r.actorId==='an'?0:1]&&['an',peerId].includes(r.actorId as string)&&r.epoch===epochs[r.actorId==='an'?0:1]&&JSON.stringify(r.window)==='[150000,210000]');
 const matchedPresenceActors=[...new Set(matching.map(r=>r.actorId as string))].sort(),fulfilled=closed&&overlap>=30000&&matchedPresenceActors.length===2;
 const inspection={physicsSteps,actualActorRouteAtChoice:actorRoute,actualPeerRouteAtChoice:peerRoute,authorityCounts:a.counts,closed,overlap,matchedPresenceActors,records:allRecords,context,goalSha256:await groundHash(goal)};
 if(!closed)return {outcome:null,inspection};
 const outcome=outcomeSchema.parse({version:1,source:'synthetic-ground-study-v1',rewardVersion:GROUND_REWARD,featureVersion:GROUND_FEATURES,protocolSha256:await groundLearningProtocolSha(),id:offer.id,seed:offer.seed,episode:offer.episode,actorId:'an',peerId,actorScope:`synthetic-H3b:${offer.seed}:an`,context,offeredValue:offer.value,fulfilled,travelUnits,reward:rendezvousReward(offer.value,fulfilled,travelUnits),proof:{worldBorn:world.born,sessionId:s.sessionId,goalSha256:inspection.goalSha256,choiceSharedSha256:goal.choiceSharedSha256,choiceSourceSha256:goal.choiceSourceSha256,planSourceSha256:await groundHash(second.raw),finalSharedSha256:await groundHash(s),finalAuthoritySha256:await groundHash(a),recordsSha256:await groundHash(allRecords),actorPlanSha256:planShas[0],peerPlanSha256:planShas[1],window:[150000,210000],settledSimMs:210000,continuousOverlapMs:overlap,matchedPresenceActors,epochs,sourceSeq:2,geometrySha256:s.geometrySha256},eligibleForRuntimeReward:false,eligibleForP2P:false});
 freeze(outcome);if(!options.diagnostic)minted.add(outcome);return {outcome,inspection};
}
const armSchema=z.object({version:z.literal(1),samples:count,inverse:z.array(finite).length(21),b:z.array(finite).length(6)}).strict();
export const groundModelSchema=z.object({version:z.literal(GROUND_LEARNING),source:z.literal('synthetic-ground-study-v1'),stage:z.enum(['train','smoke']),rewardVersion:z.literal(GROUND_REWARD),featureVersion:z.literal(GROUND_FEATURES),protocolSha256:hash,trainingSeeds:z.array(count).min(1).max(4),observations:z.array(z.object({id:z.string().regex(/^H3b:\d+:\d+$/),seed:count,episode:count.max(7),context:contextSchema,reward:finite.min(-1).max(1),outcomeSha256:hash}).strict()).min(1).max(32),model:armSchema,eligibleForRuntimeImport:z.literal(false)}).strict();
export type GroundModel=z.infer<typeof groundModelSchema>;
const compiledModels=new WeakSet<object>();
export async function validateGroundModel(value:unknown):Promise<GroundModel>{
 const v=groundModelSchema.parse(value),seeds=v.trainingSeeds;
 if(v.protocolSha256!==await groundLearningProtocolSha()||new Set(seeds).size!==seeds.length||v.stage==='train'&&(JSON.stringify(seeds)!==JSON.stringify(protocol.generator.splits.train.seeds)||v.observations.length!==32)||v.stage==='smoke'&&seeds.some(s=>s<17900||s>17999))throw Error('model-protocol-or-seeds');
 const ids=new Set<string>();let model=newArm();
 for(const row of v.observations){if(!seeds.includes(row.seed)||row.id!==`H3b:${row.seed}:${row.episode}`||ids.has(row.id)||row.context[1]!==groundOffer(row.seed,row.episode).value||row.context[4]!==Number(groundOffer(row.seed,row.episode).peerAvailable))throw Error('model-ledger');ids.add(row.id);model=fitLinear(model,row.context,row.reward);}
 if(model.samples!==v.model.samples||model.inverse.some((n,i)=>n!==v.model.inverse[i])||model.b.some((n,i)=>n!==v.model.b[i]))throw Error('model-rebuild');freeze(v);compiledModels.add(v);return v;
}
export class GroundRendezvousTrainer{
 private seen=new Map<string,string>();private rows:GroundModel['observations']=[];private model:LinearArm=newArm();private stage:'train'|'smoke';private seeds:number[];
 constructor(stage:'train'|'smoke',seeds:number[]){this.stage=stage;this.seeds=[...seeds];if(new Set(seeds).size!==seeds.length||stage==='train'&&JSON.stringify(seeds)!==JSON.stringify(protocol.generator.splits.train.seeds)||stage==='smoke'&&(!seeds.length||seeds.some(s=>s<17900||s>17999)))throw Error('training-partition');}
 async observe(value:GroundOutcome){
  if(!minted.has(value))throw Error('actual-synthetic-replay-required');const v=outcomeSchema.parse(value);
  if(!this.seeds.includes(v.seed)||v.actorScope!==`synthetic-H3b:${v.seed}:an`||v.reward!==rendezvousReward(v.offeredValue,v.fulfilled,v.travelUnits)||v.protocolSha256!==await groundLearningProtocolSha())throw Error('training-binding');
  const digest=await groundHash(v),seen=this.seen.get(v.id);if(seen){if(seen!==digest)throw Error('goal-ledger-conflict');return false;}if(this.rows.length>=32)throw Error('training-budget');
  const model=fitLinear(this.model,v.context,v.reward);this.rows.push({id:v.id,seed:v.seed,episode:v.episode,context:[...v.context],reward:v.reward,outcomeSha256:digest});this.seen.set(v.id,digest);this.model=model;return true;
 }
 async artifact():Promise<GroundModel>{return validateGroundModel({version:GROUND_LEARNING,source:'synthetic-ground-study-v1',stage:this.stage,rewardVersion:GROUND_REWARD,featureVersion:GROUND_FEATURES,protocolSha256:await groundLearningProtocolSha(),trainingSeeds:[...this.seeds],observations:structuredClone(this.rows),model:structuredClone(this.model),eligibleForRuntimeImport:false});}
}
export function chooseGroundAppointment(model:GroundModel,context:GroundContext){if(!compiledModels.has(model))throw Error('validated-model-required');return linearScore(model.model,contextSchema.parse(context),0).mean>0?'attend':'decline';}
