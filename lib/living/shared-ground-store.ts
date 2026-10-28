import {z} from 'zod';
import type {World} from '../world';
import {groundHash,GroundTimelineError} from './ground-timeline.ts';
import {bootstrapShared,replayShared,validateSharedState,projectionWorld,SHARED_LIMITS,type SharedState,type SharedSource} from './shared-ground.ts';
import {SHARED_SCOPE,validateSharedView,type SharedGroundView} from './shared-ground-view.ts';
const hash=z.string().regex(/^[a-f0-9]{64}$/);
export const sharedRequestSchema=z.object({action:z.enum(['status','start','advance']).default('status'),sessionId:z.string().uuid().optional(),operationId:z.string().uuid().optional(),expectedCheckpoint:z.union([z.literal('new'),hash]).default('new')}).strict().superRefine((r,c)=>{if(r.action!=='status'&&(!r.sessionId||!r.operationId)||r.action==='status'&&(r.sessionId||r.operationId)||r.action==='start'&&r.expectedCheckpoint!=='new'||r.action==='advance'&&r.expectedCheckpoint==='new')c.addIssue({code:'custom',message:'Explicit operation/checkpoint required'});});
type Request=z.infer<typeof sharedRequestSchema>;
type StateRow={session_id:string;data:string|null;checksum:string;updated_at:number};
type SourceRow={seq:number;revision:number;captured_at:number;data:string|null};
type BatchRow={data:string|null;checksum:string;sequence:number;created_at:number;operation_id:string};
const fail=(code:string):never=>{throw new GroundTimelineError(code);};
function bounded(raw:string|null,limit:number=SHARED_LIMITS.stateBytes){if(!raw||new TextEncoder().encode(raw).length>limit)fail('shared-byte-budget');return raw!;}
const asSource=(r:SourceRow):SharedSource=>({seq:r.seq,revision:r.revision,capturedAt:r.captured_at,raw:bounded(r.data,SHARED_LIMITS.worldBytes)});
const stateRow=(db:D1Database)=>db.prepare('SELECT session_id,CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data,checksum,updated_at FROM ground_shared_states WHERE id=\'home\'').bind(SHARED_LIMITS.stateBytes).first<StateRow>();
async function requireSharedSchema(db:D1Database){const names=(await db.prepare("SELECT name FROM sqlite_master WHERE name IN ('ground_shared_states','ground_shared_sources','ground_shared_batches','idx_shared_source_revision','idx_shared_batch_sequence','idx_shared_batch_operation','ground_shared_capture_world','ground_shared_sources_immutable_update','ground_shared_sources_immutable_delete')").all<{name:string}>()).results;if(names.length!==9)throw new GroundTimelineError('shared-schema-incomplete',503);}
async function sourceRow(db:D1Database,seq:number){const r=await db.prepare('SELECT seq,revision,captured_at,CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data FROM ground_shared_sources WHERE seq=? AND world_id=\'home\'').bind(SHARED_LIMITS.worldBytes,seq).first<SourceRow>();if(!r)fail('shared-source-missing');return asSource(r!);}
async function worldRow(db:D1Database){const r=await db.prepare('SELECT revision,CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data FROM worlds WHERE id=\'home\'').bind(SHARED_LIMITS.worldBytes).first<{revision:number;data:string|null}>();if(!r||!Number.isSafeInteger(r.revision)||r.revision<0)fail('shared-world-unavailable');return {revision:r!.revision,raw:bounded(r!.data,SHARED_LIMITS.worldBytes)};}
async function batchRow(db:D1Database,operation?:string,sequence?:number){return db.prepare(`SELECT CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data,checksum,sequence,created_at,operation_id FROM ground_shared_batches WHERE state_id='home' AND ${operation?'operation_id':'sequence'}=?`).bind(SHARED_LIMITS.stateBytes,operation??sequence!).first<BatchRow>();}
const receiptSchema=z.object({basis:z.object({version:z.literal(2),sessionId:z.string().uuid(),operationId:z.string().uuid(),requestSha256:hash,previousCheckpoint:z.union([z.literal('new'),hash]),sequence:z.number().int().positive(),nonce:z.string().uuid(),createdAt:z.number().int().nonnegative(),sourceSeq:z.number().int().positive(),sourceSha256:hash,cursorRealMs:z.number().finite(),simMs:z.number().finite(),physicsSteps:z.number().int().min(0).max(120),outerTicks:z.number().int().min(0).max(20),events:z.array(z.unknown()).max(2048)}).strict(),checkpoint:hash}).strict();
async function validateReceipt(row:BatchRow){const r=receiptSchema.parse(JSON.parse(bounded(row.data)));if(await groundHash(r.basis)!==row.checksum||r.basis.sequence!==row.sequence||r.basis.createdAt!==row.created_at||r.basis.operationId!==row.operation_id)fail('shared-receipt-integrity');return r;}
async function validated(db:D1Database,row:StateRow){const s=await validateSharedState(JSON.parse(bounded(row.data)));if(s.sessionId!==row.session_id||await groundHash(s)!==row.checksum)fail('shared-checkpoint-integrity');const last=await batchRow(db,undefined,s.sequence);if(!last)fail('shared-receipt-missing');const r=await validateReceipt(last!);if(r.checkpoint!==row.checksum||last!.checksum!==s.lastReceiptDigest||r.basis.nonce!==s.nonce||r.basis.createdAt!==row.updated_at||r.basis.sourceSeq!==s.sourceSeq||r.basis.cursorRealMs!==s.cursorRealMs||r.basis.simMs!==s.simMs)fail('shared-receipt-integrity');return s;}
async function sourcePage(db:D1Database,after:number){
 const headers=(await db.prepare('SELECT seq,revision,captured_at,length(CAST(data AS BLOB)) bytes FROM ground_shared_sources WHERE world_id=\'home\' AND seq>? ORDER BY seq LIMIT 9').bind(after).all<{seq:number;revision:number;captured_at:number;bytes:number}>()).results;
 const sources:SharedSource[]=[];let bytes=0,nextBoundary:number|null=null;
 for(const h of headers){if(sources.length===8||bytes+h.bytes>SHARED_LIMITS.sourceBatchBytes){nextBoundary=h.captured_at;break;}sources.push(await sourceRow(db,h.seq));bytes+=h.bytes;}
 return {sources,nextBoundary};
}
export async function readSharedGround(db:D1Database,nowMs=Date.now()){
 await requireSharedSchema(db);
 const row=await stateRow(db);if(!row)return null;const s=await validated(db,row),source=await sourceRow(db,s.sourceSeq);
 if(await groundHash(source.raw)!==s.sourceSha256)fail('shared-source-sha');
 const world=projectionWorld(JSON.parse(source.raw) as World,s.simMs);
 const view:SharedGroundView=validateSharedView({version:2,scope:SHARED_SCOPE,worldBorn:s.worldBorn,checkpoint:row.checksum,sequence:s.sequence,sourceRevision:s.sourceRevision,cursorRealMs:s.cursorRealMs,simMs:s.simMs,backlogMs:Math.max(0,nowMs-s.cursorRealMs),paused:world.paused,descriptors:s.descriptors,frames:s.frames,eligibleForReward:false,eligibleForP2P:false});
 return {view,world};
}
export async function runSharedGround(db:D1Database,input:Request,nowMs=Date.now()){
 await requireSharedSchema(db);
 const r=sharedRequestSchema.parse(input),row=await stateRow(db),head=row?.checksum??'new';
 const previous=row?await validated(db,row):null;
 if(r.action==='status')return {ok:true,mode:'status',exists:!!previous,checkpoint:head,...(previous?{view:(await readSharedGround(db,nowMs))!.view}:{scope:SHARED_SCOPE,eligibleForReward:false,eligibleForP2P:false})};
 const requestSha256=await groundHash(r),old=await batchRow(db,r.operationId!);
 if(old){const receipt=await validateReceipt(old);if(receipt.basis.requestSha256!==requestSha256)fail('shared-operation-reused');return {ok:true,mode:r.action==='start'?'started':'advanced',duplicate:true,checkpoint:receipt.checkpoint,currentCheckpoint:head,sequence:receipt.basis.sequence,cursorRealMs:receipt.basis.cursorRealMs,simMs:receipt.basis.simMs,physicsSteps:receipt.basis.physicsSteps,scope:SHARED_SCOPE,eligibleForReward:false,eligibleForP2P:false};}
 if(head!==r.expectedCheckpoint||previous&&previous.sessionId!==r.sessionId||r.action==='start'&&previous||r.action==='advance'&&!previous)fail('shared-checkpoint-conflict');
 const world=await worldRow(db);
 let state:SharedState,events:unknown[]=[],physicsSteps=0,outerTicks=0,guards:SharedSource[]=[],initialSource:SharedSource|undefined;
 const high=(await db.prepare('SELECT COALESCE(MAX(seq),0) n FROM ground_shared_sources').first<{n:number}>())!.n;
 if(previous){const tail=await sourceRow(db,high);if(tail.revision!==world.revision||tail.raw!==world.raw)fail('shared-journal-world-gap');}
 if(!previous){if(high)fail('shared-orphan-journal');initialSource={seq:1,revision:world.revision,capturedAt:nowMs,raw:world.raw};state=await bootstrapShared(initialSource,r.sessionId!);}
 else {const current=await sourceRow(db,previous.sourceSeq),page=await sourcePage(db,current.seq);guards=[current,...page.sources];const out=await replayShared(previous,current,page.sources,nowMs,page.nextBoundary);state=out.state;events=out.events;physicsSteps=out.physicsSteps;outerTicks=out.outerTicks;}
 state.sequence=(previous?.sequence??0)+1;state.nonce=crypto.randomUUID();
 const basis=receiptSchema.shape.basis.parse({version:2,sessionId:r.sessionId,operationId:r.operationId,requestSha256,previousCheckpoint:head,sequence:state.sequence,nonce:state.nonce,createdAt:nowMs,sourceSeq:state.sourceSeq,sourceSha256:state.sourceSha256,cursorRealMs:state.cursorRealMs,simMs:state.simMs,physicsSteps,outerTicks,events});
 state.lastReceiptDigest=await groundHash(basis);const checksum=await groundHash(state),raw=JSON.stringify(state),receiptRaw=JSON.stringify({basis,checkpoint:checksum});bounded(raw);bounded(receiptRaw);
 const worldGuard="EXISTS(SELECT 1 FROM worlds WHERE id='home' AND revision=? AND data=?)",worldArgs=[world.revision,world.raw];
 const sourcesGuard=['(SELECT COALESCE(MAX(seq),0) FROM ground_shared_sources)=?',...guards.map(()=>"EXISTS(SELECT 1 FROM ground_shared_sources WHERE seq=? AND revision=? AND captured_at=? AND data=?)")].join(' AND '),sourceArgs=[high,...guards.flatMap(s=>[s.seq,s.revision,s.capturedAt,s.raw])];
 const nextGuard="EXISTS(SELECT 1 FROM ground_shared_states WHERE id='home' AND data=? AND checksum=? AND updated_at=?)",nextArgs=[raw,checksum,nowMs];
 const statements:D1PreparedStatement[]=[];
 if(initialSource)statements.push(db.prepare(`INSERT INTO ground_shared_sources(seq,world_id,revision,captured_at,data) SELECT 1,'home',?,?,? WHERE ${worldGuard} AND NOT EXISTS(SELECT 1 FROM ground_shared_states) AND ${sourcesGuard}`).bind(world.revision,nowMs,world.raw,...worldArgs,...sourceArgs));
 const mutation=previous?db.prepare(`UPDATE ground_shared_states SET data=?,checksum=?,updated_at=? WHERE id='home' AND data=? AND checksum=? AND updated_at=? AND ${worldGuard} AND ${sourcesGuard}`).bind(raw,checksum,nowMs,row!.data,head,row!.updated_at,...worldArgs,...sourceArgs):db.prepare(`INSERT INTO ground_shared_states(id,session_id,data,checksum,updated_at) SELECT 'home',?,?,?,? WHERE ${worldGuard} AND EXISTS(SELECT 1 FROM ground_shared_sources WHERE seq=1 AND data=? AND captured_at=?) AND NOT EXISTS(SELECT 1 FROM ground_shared_states)`).bind(r.sessionId!,raw,checksum,nowMs,...worldArgs,world.raw,nowMs);
 const postSources=previous?sourcesGuard:"(SELECT COALESCE(MAX(seq),0) FROM ground_shared_sources)=1 AND EXISTS(SELECT 1 FROM ground_shared_sources WHERE seq=1 AND revision=? AND data=? AND captured_at=?)",postArgs=previous?sourceArgs:[world.revision,world.raw,nowMs];
 statements.push(mutation,db.prepare(`INSERT INTO ground_shared_batches(id,state_id,operation_id,sequence,data,checksum,created_at) SELECT ?,'home',?,?,CASE WHEN ${nextGuard} AND ${worldGuard} THEN ? ELSE NULL END,?,?`).bind(`${r.sessionId}:${r.operationId}`,r.operationId!,state.sequence,...nextArgs,...worldArgs,receiptRaw,state.lastReceiptDigest,nowMs),db.prepare(`SELECT json(CASE WHEN ${nextGuard} AND ${worldGuard} AND ${postSources} AND EXISTS(SELECT 1 FROM ground_shared_batches WHERE id=? AND data=? AND checksum=?) THEN 'true' ELSE 'invalid-shared-postcondition' END) verified`).bind(...nextArgs,...worldArgs,...postArgs,`${r.sessionId}:${r.operationId}`,receiptRaw,state.lastReceiptDigest));
 try{await db.batch(statements);}catch(error){const retry=await batchRow(db,r.operationId!);if(retry){const old=await validateReceipt(retry);if(old.basis.requestSha256===requestSha256)return {ok:true,mode:r.action==='start'?'started':'advanced',duplicate:true,checkpoint:old.checkpoint,sequence:old.basis.sequence,cursorRealMs:old.basis.cursorRealMs,simMs:old.basis.simMs,physicsSteps:old.basis.physicsSteps,scope:SHARED_SCOPE,eligibleForReward:false,eligibleForP2P:false};}const latest=await stateRow(db);if((latest?.checksum??'new')!==head)fail('shared-checkpoint-conflict');const source=await worldRow(db);if(source.revision!==world.revision||source.raw!==world.raw)fail('shared-world-conflict');throw error;}
 return {ok:true,mode:r.action==='start'?'started':'advanced',duplicate:false,checkpoint:checksum,sequence:state.sequence,cursorRealMs:state.cursorRealMs,simMs:state.simMs,physicsSteps,outerTicks,backlogMs:Math.max(0,nowMs-state.cursorRealMs),events:events.length,scope:SHARED_SCOPE,eligibleForReward:false,eligibleForP2P:false};
}
/** Existing pulse only: one active world, at most one new advancement per wall second. */
export async function pulseSharedGround(db:D1Database,nowMs=Date.now()){
 const ready=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ground_shared_states'").first();if(!ready)return null;
 const row=await stateRow(db);if(!row)return null;if(nowMs-row.updated_at<900)return {coalesced:true};
 try{return await runSharedGround(db,{action:'advance',sessionId:row.session_id,operationId:crypto.randomUUID(),expectedCheckpoint:row.checksum},nowMs);}catch(error){if(error instanceof GroundTimelineError&&error.message==='shared-checkpoint-conflict')return {coalesced:true};throw error;}
}
/** Reject incomplete active journals before the existing pulse is allowed to mutate world. */
export async function preflightSharedGround(db:D1Database){
 const ready=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ground_shared_states'").first();if(!ready)return false;
 const row=await stateRow(db);if(!row)return false;await requireSharedSchema(db);
 const world=await worldRow(db),tail=(await db.prepare("SELECT seq FROM ground_shared_sources WHERE world_id='home' ORDER BY seq DESC LIMIT 1").first<{seq:number}>());
 if(!tail)fail('shared-source-missing');const latest=await sourceRow(db,tail!.seq);if(latest.revision!==world.revision||latest.raw!==world.raw)fail('shared-journal-world-gap');return true;
}
