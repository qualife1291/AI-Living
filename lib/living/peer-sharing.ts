/** H5a offline only: synthetic accepted physics -> recipient-scoped hearsay.
 * No runtime importer, DB, networking, model, rewards or personal policy writes. */
import {z} from 'zod';
import {seed,type World} from '../world.ts';
import {initializeLiving} from './engine.ts';
import {meetingSteps} from './activities.ts';
import {bootstrapShared,replayShared,type SharedSource} from './shared-ground.ts';
import {bootstrapAuthority,authorityObserver,type AuthorityRecord} from './ground-authority.ts';
import {groundHash} from './ground-timeline.ts';
import protocol from '../../docs/validation/peer-sharing-protocol-v1.json' with {type:'json'};
export const PEER_SCOPE='offline-peer-hearsay-v1';
export const PEER_TTL_MS=protocol.retention.ttlSimulationMs;
export const PEER_HALF_LIFE_MS=protocol.retention.halfLifeSimulationMs;
export const PEER_CAPACITY=protocol.retention.maximumPerRecipient;
export const PEER_TOPICS=['gardening','cooking','repair'] as const;
export type PeerTopic=typeof PEER_TOPICS[number];
const time=z.number().finite().nonnegative();
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const minted=new WeakSet<object>();
export type PeerProof=Readonly<{
 scope:typeof PEER_SCOPE;source:'synthetic-ground-peer-study-v1';protocolSha256:string;
 id:string;worldBorn:string;sessionId:string;sourceSeq:number;sourceRevision:number;
 speakerId:string;recipientId:string;topic:PeerTopic;text:string;heardAtSimMs:number;expiresAtSimMs:number;
 evidence:{turnSha256:string;sourceSha256:string;recordsSha256:string;utteranceId:string;epochs:readonly number[]};
 eligibleForRuntimeP2P:false;eligibleForReward:false;
}>;
export type PeerAdvice=PeerProof&{knowledge:'heard-from-peer';truth:'unverified-advice';ownExperience:false;confidence:number};
const optionsSchema=z.object({trial:z.number().int().min(0).max(7).default(0),chunkRealMs:z.number().int().min(100).max(2000).multipleOf(100).default(2000),diagnostic:z.enum(['normal','baseline','partial','paused','cancel','transit']).default('normal')}).strict();
const texts=['Tưới cây vừa đủ và kiểm tra đất trước khi tưới thêm.','Rửa tay và kiểm tra nguyên liệu trước khi nấu ăn.','Kiểm tra dụng cụ trước khi bắt đầu sửa chữa.'];
const uuid=async(key:string)=>{const h=await groundHash(key);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
/** Minting is private to actual replay. JSON/checksums alone never confer delivery authority. */
export async function replayPeerSharing(input:unknown={}){
 const options=optionsSchema.parse(input),base=Date.parse('2026-10-29T02:00:00Z')-5000;
 const world:World={...structuredClone(seed),born:new Date(base).toISOString(),living:initializeLiving(base),clock:{pausedAt:null,pausedMs:0,scale:60,anchors:[{realMs:base,simMs:0,scale:60}]}};
 world.living!.residents=world.living!.residents.slice(0,1);delete world.livingTurn;
 const initialWorld=JSON.stringify(world),recipientId=world.living!.residents[0].id;
 const source=(seq:number,w:World,at=base):SharedSource=>({seq,revision:seq-1,capturedAt:at,raw:JSON.stringify(w)});
 const fresh=structuredClone(world),plan=()=>({createdAt:new Date(base).toISOString(),pausedMs:0,from:'Sân chung',simStartedAt:0,steps:meetingSteps('Công viên','Trao đổi lời khuyên')});
 fresh.people[0].plan=plan();fresh.living!.residents[0].plan=plan();
 if(options.diagnostic==='transit'){fresh.people[0].plan!.transport='bus';fresh.living!.residents[0].plan!.transport='bus';}
 const offers=freeze(texts.map((text,index)=>({speakerId:'an',recipientId,topic:PEER_TOPICS[index],text,line:index*2})));
 const dialogue=offers.flatMap(offer=>[{speaker:'an',text:offer.text},{speaker:recipientId,text:'Mình đã nghe lời khuyên này, sẽ cân nhắc khi phù hợp.'}]);
 fresh.livingTurn={id:`h5-study-${options.trial}`,createdAt:new Date(base).toISOString(),date:'2026-10-29',title:'Trao đổi lời khuyên',summary:'Nội dung biên tập thử nghiệm, không phải kinh nghiệm người dùng',location:'Công viên',activity:'Trò chuyện',kind:'social',residentId:recipientId,simStartedAt:0,dialogue,generator:'rules',context:{date:'2026-10-29',hour:9,weekday:4,timezone:'Asia/Ho_Chi_Minh',fetchedAt:new Date(base).toISOString(),weather:{status:'unavailable',source:'synthetic-study',observedAt:null,temperature:null,humidity:null,precipitation:null,code:null,windKph:null},calendar:{weekend:false,holidays:[],source:'synthetic-study',status:'unavailable',coverage:'fixture-only'},traffic:{status:'unavailable',label:'synthetic-study'},festivals:{status:'unavailable',label:'synthetic-study'}}};
 if(options.diagnostic==='baseline')Object.assign(world,structuredClone(fresh));
 const first=source(1,world),second=source(2,fresh);
 let current=first,s=await bootstrapShared(first,await uuid(`H5:${options.trial}`)),a=await bootstrapAuthority(s,first,'f'.repeat(64));
 const records:AuthorityRecord[]=[];let steps=0,iterations=0;
 const advance=async(target:number,sources:SharedSource[]=[])=>{
  do{
   if(++iterations>120)throw Error('peer-replay-budget');
   const trace=await authorityObserver(a,current),observer={...trace.observer,step:(ob:Parameters<NonNullable<typeof trace.observer.step>>[0])=>{steps++;trace.observer.step?.(ob);}};
   const out=await replayShared(s,current,sources,Math.min(target,s.cursorRealMs+options.chunkRealMs),null,observer);
   s=out.state;a=trace.state;records.push(...trace.records);
   current=[current,...sources].find(row=>row.seq===s.sourceSeq)!;sources=sources.filter(row=>row.seq>s.sourceSeq);
  }while(s.cursorRealMs<target||sources.some(row=>row.capturedAt<=s.cursorRealMs));
 };
 await advance(base+2100,options.diagnostic==='baseline'?[]:[second]);
 if(options.diagnostic==='paused'||options.diagnostic==='cancel'){
  const changed=structuredClone(fresh);
  if(options.diagnostic==='paused'){changed.paused=true;changed.clock!.pausedAt=base+2100;}
  else delete changed.people[0].plan;
  await advance(base+4500,[source(3,changed,base+2100)]);
 }else if(options.diagnostic!=='partial')await advance(base+4500);
 const proofs:PeerProof[]=[];
 const turnHash=await groundHash(fresh.livingTurn),recordsHash=await groundHash(records);
 for(const offer of offers){
  const heard=records.find(r=>r.type==='heard-utterance'&&r.speakerId===offer.speakerId&&r.recipientId===offer.recipientId&&r.text===offer.text&&r.turnSha256===turnHash&&r.turnSourceSeq===2);
  if(!heard)continue;
  const emitted=records.find(r=>r.type==='utterance-emitted'&&r.utteranceId===heard.utteranceId&&r.turnSha256===heard.turnSha256&&r.speakerId===heard.speakerId&&r.listenerId===heard.recipientId&&r.text===heard.text&&r.simMs===heard.fromSimMs&&r.untilSimMs===heard.untilSimMs&&JSON.stringify(r.bindings)===JSON.stringify(heard.bindings)&&JSON.stringify(r.windows)===JSON.stringify(heard.windows));
  const bindings=heard.bindings as {id:string;epoch:number;planSha256:string}[];
  const contact=records.find(r=>r.type==='co-presence'&&r.simMs<=Number(heard.fromSimMs)&&Number(r.durationMs)>=3000&&bindings.every(b=>(r.participants as {id:string;epoch:number}[]).some(p=>p.id===b.id&&p.epoch===b.epoch)));
  if(!emitted||!contact||heard.knowledge!=='heard-text-not-witnessed-truth'||Number(heard.untilSimMs)-Number(heard.fromSimMs)!==12000||heard.eligibleForP2P!==false||heard.eligibleForReward!==false)throw Error('peer-delivery-binding');
  const id=await groundHash({scope:PEER_SCOPE,worldBorn:world.born,sessionId:s.sessionId,utteranceId:heard.utteranceId,turnSha256:turnHash,recipientId});
  const proof=freeze<PeerProof>({scope:PEER_SCOPE,source:'synthetic-ground-peer-study-v1',protocolSha256:await groundHash(protocol),id,worldBorn:world.born,sessionId:s.sessionId,sourceSeq:2,sourceRevision:1,speakerId:offer.speakerId,recipientId:offer.recipientId,topic:offer.topic,text:offer.text,heardAtSimMs:heard.simMs,expiresAtSimMs:heard.simMs+PEER_TTL_MS,evidence:{turnSha256:turnHash,sourceSha256:await groundHash(second.raw),recordsSha256:recordsHash,utteranceId:String(heard.utteranceId),epochs:bindings.map(b=>b.epoch)},eligibleForRuntimeP2P:false,eligibleForReward:false});
  minted.add(proof);proofs.push(proof);
 }
 const untouched=options.diagnostic==='baseline'?JSON.stringify(fresh):initialWorld;
 if(JSON.stringify(world)!==untouched)throw Error('peer-source-mutated');
 return freeze({scope:{worldBorn:world.born,sessionId:s.sessionId},proofs,inspection:{physicsSteps:steps,records:records.length,counts:a.counts,sourceWorldUnchanged:true,personalStateUnchanged:JSON.stringify(world.people)===JSON.stringify(JSON.parse(untouched).people),diagnostic:options.diagnostic},runtimeImportAllowed:false as const});
}
/** Single recipient and session are fixed at construction, never model query parameters. */
export class PeerAdviceInbox{
 readonly #scope:{worldBorn:string;sessionId:string;recipientId:string};readonly #capacity:number;
 #entries:PeerProof[]=[];#lastAdmissionMs=0;
 constructor(scope:{worldBorn:string;sessionId:string;recipientId:string},capacity=PEER_CAPACITY){
  this.#scope=z.object({worldBorn:z.string().datetime(),sessionId:z.string().uuid(),recipientId:z.string().min(1).max(100)}).strict().parse(scope);
  this.#capacity=z.number().int().min(1).max(PEER_CAPACITY).parse(capacity);
 }
 receive(input:unknown,nowSimMs:number):'accepted'|'duplicate'|'expired'|'full'{
  const now=time.parse(nowSimMs);
  if(!input||typeof input!=='object'||!minted.has(input))throw Error('peer-proof-untrusted');
  const proof=input as PeerProof;
  if(proof.worldBorn!==this.#scope.worldBorn||proof.sessionId!==this.#scope.sessionId||proof.recipientId!==this.#scope.recipientId)throw Error('peer-recipient-scope');
  if(now<this.#lastAdmissionMs||now<proof.heardAtSimMs)throw Error('peer-admission-time');
  if(now>=proof.expiresAtSimMs)return 'expired';
  if(this.#entries.some(entry=>entry.id===proof.id))return 'duplicate';
  const retained=this.#entries.filter(entry=>entry.expiresAtSimMs>now);
  if(retained.length>=this.#capacity)return 'full';
  this.#entries=[...retained,proof];this.#lastAdmissionMs=now;return 'accepted';
 }
 select(nowSimMs:number,topic?:PeerTopic,limit=8):readonly PeerAdvice[]{
  const now=time.parse(nowSimMs);if(now<this.#lastAdmissionMs)throw Error('peer-read-time');
  const k=z.number().int().min(1).max(8).parse(limit);if(topic!==undefined)z.enum(PEER_TOPICS).parse(topic);
  return freeze(this.#entries.filter(entry=>entry.heardAtSimMs<=now&&entry.expiresAtSimMs>now&&(!topic||entry.topic===topic))
   .map(entry=>({...entry,knowledge:'heard-from-peer' as const,truth:'unverified-advice' as const,ownExperience:false as const,confidence:protocol.retention.initialConfidence*2**(-(now-entry.heardAtSimMs)/PEER_HALF_LIFE_MS)}))
   .sort((a,b)=>b.confidence-a.confidence||b.heardAtSimMs-a.heardAtSimMs||a.id.localeCompare(b.id)).slice(0,k));
 }
}
