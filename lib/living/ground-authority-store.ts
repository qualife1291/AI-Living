import {z} from 'zod';
import {groundHash,GroundTimelineError} from './ground-timeline.ts';
import {AUTHORITY_SCOPE,AUTHORITY_LIMITS,authorityStateSchema,validateAuthorityState,authorityProtocolSha,type AuthorityState,type AuthorityRecord} from './ground-authority.ts';
import type {SharedState} from './shared-ground.ts';
const hash=z.string().regex(/^[a-f0-9]{64}$/),count=z.number().int().nonnegative().safe(),time=z.number().finite().nonnegative();
const receiptSchema=z.object({basis:z.object({version:z.literal(1),scope:z.literal(AUTHORITY_SCOPE),protocolSha256:hash,sessionId:z.string().uuid(),operationId:z.string().uuid(),requestSha256:hash,previousCheckpoint:z.union([z.literal('new'),hash]),previousSharedCheckpoint:hash,parentCheckpoint:hash,parentSequence:count.positive(),sequence:count.positive(),nonce:z.string().uuid(),createdAt:count,sourceSeq:count.positive(),sourceSha256:hash,sourceRevision:count,cursorSimMs:time,counts:authorityStateSchema.shape.counts,records:z.array(z.record(z.string(),z.unknown())).max(8192),eligibleForReward:z.literal(false),eligibleForP2P:z.literal(false)}).strict(),checkpoint:hash}).strict();
type StateRow={session_id:string;data:string|null;checksum:string;updated_at:number};
type BatchRow={data:string|null;checksum:string;sequence:number;created_at:number;operation_id:string};
export type AuthorityHead={state:AuthorityState;row:StateRow;checkpoint:string};
const fail=(code:string,status=409):never=>{throw new GroundTimelineError(code,status);};
function bounded(raw:string|null,limit=AUTHORITY_LIMITS.stateBytes):string{if(!raw||new TextEncoder().encode(raw).length>limit)fail('authority-byte-budget');return raw!;}
const stateRow=(db:D1Database)=>db.prepare("SELECT session_id,CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data,checksum,updated_at FROM ground_authority_states WHERE id='home'").bind(AUTHORITY_LIMITS.stateBytes).first<StateRow>();
const batchRow=(db:D1Database,operation?:string,sequence?:number)=>db.prepare(`SELECT CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data,checksum,sequence,created_at,operation_id FROM ground_authority_batches WHERE state_id='home' AND ${operation?'operation_id':'sequence'}=?`).bind(AUTHORITY_LIMITS.receiptBytes,operation??sequence!).first<BatchRow>();
export async function requireAuthoritySchema(db:D1Database){
 const expected=[['ground_authority_states','table','ground_authority_states'],['ground_authority_batches','table','ground_authority_batches'],['idx_authority_batch_sequence','index','ground_authority_batches'],['idx_authority_batch_operation','index','ground_authority_batches'],['ground_authority_batches_immutable_update','trigger','ground_authority_batches'],['ground_authority_batches_immutable_delete','trigger','ground_authority_batches']];
 const rows=(await db.prepare(`SELECT name,type,tbl_name FROM sqlite_master WHERE name IN (${expected.map(()=>'?').join(',')})`).bind(...expected.map(v=>v[0])).all<{name:string;type:string;tbl_name:string}>()).results;
 if(rows.length!==expected.length||expected.some(([name,type,table])=>!rows.some(r=>r.name===name&&r.type===type&&r.tbl_name===table)))fail('authority-schema-incomplete',503);
}
async function validateReceipt(row:BatchRow){const r=receiptSchema.parse(JSON.parse(bounded(row.data,AUTHORITY_LIMITS.receiptBytes)));if(await groundHash(r.basis)!==row.checksum||r.basis.sequence!==row.sequence||r.basis.createdAt!==row.created_at||r.basis.operationId!==row.operation_id||r.basis.protocolSha256!==await authorityProtocolSha()||r.basis.records.some(v=>v.eligibleForReward!==false||v.eligibleForP2P!==false))fail('authority-receipt-integrity');return r;}
/** Internal durable consumers select by operation; callers cannot supply receipt JSON. */
export async function readAuthorityBatch(db:D1Database,operationId:string){
 const row=await batchRow(db,z.string().uuid().parse(operationId));if(!row)fail('authority-receipt-missing');
 return {row:row!,receipt:await validateReceipt(row!)};
}
/** Missing0011 is optional until a shared marker activates accounting. Orphans fail closed. */
export async function loadAuthority(db:D1Database,shared:SharedState,parentCheckpoint:string):Promise<AuthorityHead|null>{
 const present=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ground_authority_states'").first();
 if(!present){if(shared.authority)fail('authority-schema-incomplete',503);return null;}
 const row=await stateRow(db);
 if(!shared.authority){if(row)fail('authority-orphan-state');return null;}
 await requireAuthoritySchema(db);if(!row)fail('authority-state-missing');
 const state=await validateAuthorityState(JSON.parse(bounded(row!.data))),marker=shared.authority;
 if(await groundHash(state)!==row!.checksum||state.sessionId!==row!.session_id||state.sessionId!==shared.sessionId||state.worldBorn!==shared.worldBorn||state.geometrySha256!==shared.geometrySha256||state.protocolSha256!==marker.protocolSha256||state.parentCheckpoint!==parentCheckpoint||state.parentSequence!==shared.sequence||state.sequence!==shared.sequence-marker.startSequence+1||state.sourceSeq!==shared.sourceSeq||state.sourceSha256!==shared.sourceSha256||state.sourceRevision!==shared.sourceRevision||state.cursorSimMs!==shared.simMs)fail('authority-checkpoint-integrity');
 const last=await batchRow(db,undefined,state.sequence);if(!last)fail('authority-receipt-missing');const r=await validateReceipt(last!);
 const base=await db.prepare("SELECT operation_id,json_extract(data,'$.basis.requestSha256') request_sha FROM ground_shared_batches WHERE state_id='home' AND sequence=?").bind(shared.sequence).first<{operation_id:string;request_sha:string}>();
 if(r.checkpoint!==row!.checksum||state.lastReceiptDigest!==last!.checksum||r.basis.nonce!==state.nonce||r.basis.createdAt!==row!.updated_at||r.basis.parentCheckpoint!==parentCheckpoint||r.basis.parentSequence!==shared.sequence||r.basis.sourceSeq!==shared.sourceSeq||r.basis.sourceSha256!==shared.sourceSha256||r.basis.cursorSimMs!==shared.simMs||r.basis.operationId!==base?.operation_id||r.basis.requestSha256!==base?.request_sha||JSON.stringify(r.basis.counts)!==JSON.stringify(state.counts))fail('authority-receipt-integrity');
 return {state,row:row!,checkpoint:row!.checksum};
}
export async function authorityDuplicate(db:D1Database,shared:SharedState,operationId:string,requestSha256:string,baseSequence:number){
 if(!shared.authority||baseSequence<shared.authority.startSequence)return undefined;
 const row=await batchRow(db,operationId);if(!row)fail('authority-receipt-missing');const r=await validateReceipt(row!);
 if(r.basis.requestSha256!==requestSha256||r.basis.parentSequence!==baseSequence||r.basis.sessionId!==shared.sessionId)fail('authority-operation-reused');
 return {scope:AUTHORITY_SCOPE,checkpoint:r.checkpoint,sequence:r.basis.sequence,counts:r.basis.counts,records:r.basis.records.length,eligibleForReward:false,eligibleForP2P:false};
}
/** Prepared statements only. The shared store must execute these in its SAME D1 batch. */
export async function prepareAuthorityCommit(db:D1Database,previous:AuthorityHead|null,state:AuthorityState,records:AuthorityRecord[],shared:SharedState,parentCheckpoint:string,previousSharedCheckpoint:string,operationId:string,requestSha256:string,nowMs:number){
 if(!shared.authority||shared.authority.protocolSha256!==state.protocolSha256)fail('authority-marker-mismatch');
 state.parentCheckpoint=parentCheckpoint;state.parentSequence=shared.sequence;state.sequence=(previous?.state.sequence??0)+1;state.nonce=crypto.randomUUID();
 const basis=receiptSchema.shape.basis.parse({version:1,scope:AUTHORITY_SCOPE,protocolSha256:state.protocolSha256,sessionId:state.sessionId,operationId,requestSha256,previousCheckpoint:previous?.checkpoint??'new',previousSharedCheckpoint,parentCheckpoint,parentSequence:shared.sequence,sequence:state.sequence,nonce:state.nonce,createdAt:nowMs,sourceSeq:state.sourceSeq,sourceSha256:state.sourceSha256,sourceRevision:state.sourceRevision,cursorSimMs:state.cursorSimMs,counts:state.counts,records,eligibleForReward:false,eligibleForP2P:false});
 state.lastReceiptDigest=await groundHash(basis);await validateAuthorityState(state);const checksum=await groundHash(state),raw=bounded(JSON.stringify(state)),receiptRaw=bounded(JSON.stringify({basis,checkpoint:checksum}),AUTHORITY_LIMITS.receiptBytes);
 const parentGuard="EXISTS(SELECT 1 FROM ground_shared_states WHERE id='home' AND data=? AND checksum=? AND updated_at=?)",parentArgs=[JSON.stringify(shared),parentCheckpoint,nowMs];
 const nextGuard="EXISTS(SELECT 1 FROM ground_authority_states WHERE id='home' AND data=? AND checksum=? AND updated_at=?)",nextArgs=[raw,checksum,nowMs];
 const mutation=previous?db.prepare(`UPDATE ground_authority_states SET data=?,checksum=?,updated_at=? WHERE id='home' AND data=? AND checksum=? AND updated_at=? AND ${parentGuard}`).bind(raw,checksum,nowMs,previous.row.data,previous.checkpoint,previous.row.updated_at,...parentArgs):db.prepare(`INSERT INTO ground_authority_states(id,session_id,data,checksum,updated_at) SELECT 'home',?,?,?,? WHERE ${parentGuard} AND NOT EXISTS(SELECT 1 FROM ground_authority_states)`).bind(state.sessionId,raw,checksum,nowMs,...parentArgs);
 const statements=[mutation,db.prepare(`INSERT INTO ground_authority_batches(id,state_id,operation_id,sequence,data,checksum,created_at) SELECT ?,'home',?,?,CASE WHEN ${nextGuard} AND ${parentGuard} THEN ? ELSE NULL END,?,?`).bind(`${state.sessionId}:${operationId}`,operationId,state.sequence,...nextArgs,...parentArgs,receiptRaw,state.lastReceiptDigest,nowMs),db.prepare(`SELECT json(CASE WHEN ${nextGuard} AND ${parentGuard} AND EXISTS(SELECT 1 FROM ground_authority_batches WHERE id=? AND data=? AND checksum=?) THEN 'true' ELSE 'invalid-authority-postcondition' END) verified`).bind(...nextArgs,...parentArgs,`${state.sessionId}:${operationId}`,receiptRaw,state.lastReceiptDigest)];
 return {statements,summary:{scope:AUTHORITY_SCOPE,checkpoint:checksum,sequence:state.sequence,counts:state.counts,records:records.length,eligibleForReward:false,eligibleForP2P:false}};
}
