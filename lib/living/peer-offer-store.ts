/** H5b1 durable provenance. Not imported by the app, API, pulse or policy.
 * Trusted server DB + immutable GND3 ledger are the authority boundary; SHA is
 * integrity, not a signature. Verification never grants truth/reward/experience. */
import {z} from 'zod';
import type {World} from '../world.ts';
import {groundHash,GroundTimelineError} from './ground-timeline.ts';
import {SHARED_LIMITS} from './shared-ground.ts';
import {readSharedGround,readSharedBatch} from './shared-ground-store.ts';
import {readAuthorityBatch} from './ground-authority-store.ts';
import {utteranceSchema} from './ground-authority.ts';

const hash=z.string().regex(/^[a-f0-9]{64}$/),count=z.number().int().nonnegative().safe();
const actor=z.string().regex(/^[a-z][a-z0-9-]{0,99}$/);
export const PEER_OFFER_SCOPE='ground-peer-offer-v1';
export const peerOfferRequestSchema=z.object({
 id:z.string().uuid(),sessionId:z.string().uuid(),expectedSharedCheckpoint:hash,expectedAuthorityCheckpoint:hash,
 speakerId:actor,recipientId:actor,topic:z.enum(['gardening','cooking','repair']),
 text:z.string().min(1).max(600).refine(s=>s.trim().length>0),
}).strict();
const offerSchema=peerOfferRequestSchema.extend({
 version:z.literal(1),scope:z.literal(PEER_OFFER_SCOPE),requestSha256:hash,
 worldBorn:z.string().datetime({offset:true}),worldRevision:count,worldSha256:hash,
 sourceHighWater:count.positive(),authoritySequence:count.positive(),offeredAtSimMs:z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
 previousTurnId:z.string().max(160).nullable(),createdAt:count,
 eligibleForRuntimeP2P:z.literal(false),eligibleForReward:z.literal(false),
}).strict();
type Offer=z.infer<typeof offerSchema>;
type OfferRow={id:string;session_id:string;recipient_id:string;data:string|null;checksum:string;created_at:number};
const OFFER_BYTES=8192;
const fail=(code:string,status=409):never=>{throw new GroundTimelineError(code,status);};
function bounded(raw:string|null,limit:number){if(!raw||new TextEncoder().encode(raw).length>limit)fail('peer-byte-budget');return raw!;}
async function requireSchema(db:D1Database){
 const expected=[['peer_offers','table','peer_offers'],['idx_peer_offers_recipient','index','peer_offers'],['peer_offers_immutable_update','trigger','peer_offers'],['peer_offers_immutable_delete','trigger','peer_offers'],['ground_shared_batches_immutable_update','trigger','ground_shared_batches'],['ground_shared_batches_immutable_delete','trigger','ground_shared_batches']];
 const rows=(await db.prepare(`SELECT name,type,tbl_name FROM sqlite_master WHERE name IN (${expected.map(()=>'?').join(',')})`).bind(...expected.map(v=>v[0])).all<{name:string;type:string;tbl_name:string}>()).results;
 if(rows.length!==expected.length||expected.some(([name,type,table])=>!rows.some(r=>r.name===name&&r.type===type&&r.tbl_name===table)))fail('peer-schema-incomplete',503);
}
async function readOffer(db:D1Database,id:string){
 const row=await db.prepare('SELECT id,session_id,recipient_id,CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data,checksum,created_at FROM peer_offers WHERE id=?').bind(OFFER_BYTES,id).first<OfferRow>();
 if(!row)return null;
 const offer=offerSchema.parse(JSON.parse(bounded(row.data,OFFER_BYTES)));
 const request=peerOfferRequestSchema.parse(Object.fromEntries(Object.keys(peerOfferRequestSchema.shape).map(key=>[key,offer[key as keyof Offer]])));
 if(offer.id!==row.id||offer.sessionId!==row.session_id||offer.recipientId!==row.recipient_id||offer.createdAt!==row.created_at||await groundHash(offer)!==row.checksum||await groundHash(request)!==offer.requestSha256)fail('peer-offer-integrity');
 return {offer,row};
}
/** Call from a future trusted server producer BEFORE choice/turn publication.
 * UUID retries preserve the original snapshot. No world, clock, policy or memory writes. */
export async function recordPeerOffer(db:D1Database,input:unknown,nowMs=Date.now()){
 const request=peerOfferRequestSchema.parse(input),createdAt=count.parse(nowMs);
 await requireSchema(db);
 const requestSha256=await groundHash(request);
 const duplicate=async()=>{
  const previous=await readOffer(db,request.id);if(!previous)return null;
  if(previous.offer.requestSha256!==requestSha256)fail('peer-operation-reused');
  return {offer:previous.offer,checkpoint:previous.row.checksum,duplicate:true};
 };
 const old=await duplicate();if(old)return old;
 const view=await readSharedGround(db,createdAt);
 if(!view?.authority)fail('peer-authority-required');
 const authority=view!.authority!,worldRow=await db.prepare("SELECT revision,CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data FROM worlds WHERE id='home'").bind(SHARED_LIMITS.worldBytes).first<{revision:number;data:string|null}>();
 if(!worldRow)fail('peer-world-missing');
 const worldRaw=bounded(worldRow!.data,SHARED_LIMITS.worldBytes),world=JSON.parse(worldRaw) as World;
 const shared=await db.prepare("SELECT CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data,checksum,updated_at FROM ground_shared_states WHERE id='home'").bind(SHARED_LIMITS.stateBytes).first<{data:string|null;checksum:string;updated_at:number}>();
 if(!shared||shared.checksum!==view!.view.checkpoint||await groundHash(JSON.parse(bounded(shared.data,SHARED_LIMITS.stateBytes)))!==shared.checksum||request.sessionId!==authority.state.sessionId||request.expectedSharedCheckpoint!==view!.view.checkpoint||request.expectedAuthorityCheckpoint!==authority.checkpoint)fail('peer-checkpoint-conflict');
 const high=(await db.prepare("SELECT MAX(seq) n FROM ground_shared_sources WHERE world_id='home'").first<{n:number}>())!.n;
 if(world.born!==authority.state.worldBorn||world.paused||worldRow!.revision!==authority.state.sourceRevision||high!==authority.state.sourceSeq||await groundHash(worldRaw)!==authority.state.sourceSha256||createdAt<authority.row.updated_at)fail('peer-source-not-current');
 // GND3 supports An + one resident. Fix that pair before any receipt is looked up.
 const residentId=request.speakerId==='an'?request.recipientId:request.speakerId;
 if(request.speakerId===request.recipientId||![request.speakerId,request.recipientId].includes('an')||!world.people.some(p=>p.id==='an')||!world.living?.residents.some(p=>p.id===residentId))fail('peer-recipient-scope');
 if(world.livingTurn?.residentId===residentId&&world.livingTurn.dialogue.some(line=>line.speaker===request.speakerId&&line.text===request.text))fail('peer-offer-already-published');
 const offer=offerSchema.parse({...request,version:1,scope:PEER_OFFER_SCOPE,requestSha256,worldBorn:world.born,worldRevision:worldRow!.revision,worldSha256:await groundHash(worldRaw),sourceHighWater:high,authoritySequence:authority.state.sequence,offeredAtSimMs:view!.view.simMs,previousTurnId:world.livingTurn?.id??null,createdAt,eligibleForRuntimeP2P:false,eligibleForReward:false});
 const raw=bounded(JSON.stringify(offer),OFFER_BYTES),checksum=await groundHash(offer);
 const guard="EXISTS(SELECT 1 FROM worlds WHERE id='home' AND revision=? AND data=?) AND EXISTS(SELECT 1 FROM ground_shared_states WHERE id='home' AND data=? AND checksum=? AND updated_at=?) AND EXISTS(SELECT 1 FROM ground_authority_states WHERE id='home' AND data=? AND checksum=? AND updated_at=?) AND (SELECT MAX(seq) FROM ground_shared_sources WHERE world_id='home')=?";
 const args=[worldRow!.revision,worldRaw,shared!.data,shared!.checksum,shared!.updated_at,authority.row.data,authority.checkpoint,authority.row.updated_at,high];
 const inserted="EXISTS(SELECT 1 FROM peer_offers WHERE id=? AND session_id=? AND recipient_id=? AND data=? AND checksum=? AND created_at=?)";
 const insertedArgs=[request.id,request.sessionId,request.recipientId,raw,checksum,createdAt];
 try{
  await db.batch([
   db.prepare(`INSERT INTO peer_offers(id,session_id,recipient_id,data,checksum,created_at) SELECT ?,?,?,?,?,? WHERE ${guard}`).bind(...insertedArgs,...args),
   // RAISE(IGNORE) or a trigger-altered row MUST abort the whole transaction.
   db.prepare(`SELECT json(CASE WHEN ${inserted} AND ${guard} THEN 'true' ELSE 'invalid-peer-offer-postcondition' END) verified`).bind(...insertedArgs,...args),
  ]);
 }catch(error){const retry=await duplicate();if(retry)return retry;throw error;}
 return {offer,checkpoint:checksum,duplicate:false};
}

const deliveryRequestSchema=z.object({offerId:z.string().uuid(),recipientId:actor,emittedOperationId:z.string().uuid(),heardOperationId:z.string().uuid(),utteranceId:z.string().min(1).max(240)}).strict();
/** Internal recipient-scoped read only. IDs locate DB receipts; JSON/clone/checksum
 * supplied by a client is never a proof. Both batches must be coupled to GND2. */
export async function verifyPeerOfferDelivery(db:D1Database,input:unknown){
 const request=deliveryRequestSchema.parse(input);await requireSchema(db);
 const stored=await readOffer(db,request.offerId);if(!stored)fail('peer-offer-missing');
 const offer=stored!.offer;if(request.recipientId!==offer.recipientId)fail('peer-recipient-scope');
 const head=await readSharedGround(db);if(!head?.authority||head.authority.state.sessionId!==offer.sessionId||head.authority.state.worldBorn!==offer.worldBorn)fail('peer-session-scope');
 const load=async(operationId:string)=>{
  const authority=await readAuthorityBatch(db,operationId),shared=await readSharedBatch(db,operationId);
  const a=authority.receipt.basis,s=shared.receipt.basis;
  if(a.sessionId!==offer.sessionId||s.sessionId!==offer.sessionId||a.requestSha256!==s.requestSha256||a.parentCheckpoint!==shared.receipt.checkpoint||a.parentSequence!==s.sequence||a.sourceSeq!==s.sourceSeq||a.sourceSha256!==s.sourceSha256||a.cursorSimMs!==s.simMs||a.createdAt!==s.createdAt||a.sequence<=offer.authoritySequence||a.sequence>head!.authority!.state.sequence||a.createdAt<offer.createdAt)fail('peer-receipt-binding');
  return authority;
 };
 const emitted=await load(request.emittedOperationId),heard=await load(request.heardOperationId);
 const matching=(record:Record<string,unknown>,type:string)=>record.type===type&&record.utteranceId===request.utteranceId;
 const emissions=emitted.receipt.basis.records.filter(r=>matching(r,'utterance-emitted'));
 const deliveries=heard.receipt.basis.records.filter(r=>matching(r,'heard-utterance'));
 if(emissions.length!==1||deliveries.length!==1)fail('peer-delivery-missing');
 const e=emissions[0],h=deliveries[0];
 if(heard.row.sequence<emitted.row.sequence||h.knowledge!=='heard-text-not-witnessed-truth'||h.recipientId!==offer.recipientId||e.listenerId!==offer.recipientId||e.speakerId!==offer.speakerId||h.speakerId!==offer.speakerId||e.text!==offer.text||h.text!==offer.text||h.fromSimMs!==e.simMs||h.untilSimMs!==e.untilSimMs||h.simMs!==h.untilSimMs||h.turnSourceSeq!==e.turnSourceSeq||h.turnSha256!==e.turnSha256||h.turnId!==e.turnId||h.generator!==e.generator||JSON.stringify(h.bindings)!==JSON.stringify(e.bindings)||JSON.stringify(h.windows)!==JSON.stringify(e.windows))fail('peer-delivery-binding');
 const sourceSeq=count.positive().parse(h.turnSourceSeq);
 const source=await db.prepare("SELECT revision,captured_at,CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data FROM ground_shared_sources WHERE world_id='home' AND seq=?").bind(SHARED_LIMITS.worldBytes,sourceSeq).first<{revision:number;captured_at:number;data:string|null}>();
 if(!source)fail('peer-turn-source-missing');
 const world=JSON.parse(bounded(source!.data,SHARED_LIMITS.worldBytes)) as World,turn=world.livingTurn;
 const utterance=utteranceSchema.parse({generator:h.generator,turnSha256:h.turnSha256,windows:h.windows,id:h.utteranceId,turnId:h.turnId,sourceSeq,sourceRevision:source!.revision,speakerId:h.speakerId,listenerId:h.recipientId,bindings:h.bindings,text:h.text,fromSimMs:h.fromSimMs,untilSimMs:h.untilSimMs,cancelledAt:null,completed:true});
 // Sequence/revision + commit CAS establish order. SQLite's julianday capture
 // rounds milliseconds; wall-clock equality is not a causal proof.
 if(sourceSeq<=offer.sourceHighWater||sourceSeq>emitted.receipt.basis.sourceSeq||sourceSeq>heard.receipt.basis.sourceSeq||source!.revision<=offer.worldRevision||world.born!==offer.worldBorn||!turn||turn.id===offer.previousTurnId||turn.id!==utterance.turnId||turn.generator!==utterance.generator||await groundHash(turn)!==utterance.turnSha256||utterance.untilSimMs-utterance.fromSimMs!==12000||utterance.fromSimMs<offer.offeredAtSimMs||utterance.untilSimMs>heard.receipt.basis.cursorSimMs||utterance.fromSimMs>emitted.receipt.basis.cursorSimMs)fail('peer-offer-causality');
 const line=Number(utterance.id.slice(utterance.id.lastIndexOf(':')+1));
 if(!Number.isInteger(line)||utterance.id!==`${turn!.id}:${sourceSeq}:${line}`||turn!.dialogue[line]?.speaker!==offer.speakerId||turn!.dialogue[line]?.text!==offer.text)fail('peer-turn-line-binding');
 const pair=[offer.speakerId,offer.recipientId];
 if(new Set(utterance.bindings.map(b=>b.id)).size!==2||new Set(utterance.windows.map(w=>w.id)).size!==2||utterance.windows.some(w=>!pair.includes(w.id)||w.startMs>utterance.fromSimMs||w.endMs<=utterance.untilSimMs))fail('peer-window-binding');
 for(const binding of utterance.bindings){
  const person=[...world.people,...(world.living?.residents??[])].find(p=>p.id===binding.id);
  if(!pair.includes(binding.id)||!person?.plan||await groundHash(person.plan)!==binding.planSha256)fail('peer-plan-binding');
 }
 return {
  scope:PEER_OFFER_SCOPE,offerId:offer.id,offerCheckpoint:stored!.row.checksum,worldBorn:offer.worldBorn,sessionId:offer.sessionId,
  speakerId:offer.speakerId,recipientId:offer.recipientId,topic:offer.topic,text:offer.text,
  utteranceId:utterance.id,heardAtSimMs:utterance.untilSimMs,
  emittedReceiptSha256:emitted.row.checksum,heardReceiptSha256:heard.row.checksum,
  knowledge:'heard-from-peer' as const,truth:'unverified-advice' as const,ownExperience:false as const,
  eligibleForRuntimeP2P:false as const,eligibleForReward:false as const,
 };
}
