import {z} from 'zod';
import {BACKFILL_LIMITS as LIMITS,BACKFILL_COMPATIBILITY as COMPAT,MemoryBackfillError,backfillHash,emptyBackfillCounts,sourceMemoryCandidates,reconcileMemoryCandidates,memoryTuple,projectedMemoryRow,type ArchiveKind,type ArchiveMemoryRow,type StoredMemoryRow,type BackfillCounts} from './memory-backfill.ts';
import type {MemoryRecord} from './memory-records.ts';
const count=z.number().int().nonnegative().safe(),sha=z.string().regex(/^[a-f0-9]{64}$/),point=z.union([z.literal('new'),sha]);
export const memoryBackfillRequest=z.object({jobId:z.string().uuid(),actorId:z.string().min(1).max(500),action:z.enum(['preview','apply','status']).default('preview'),limit:count.min(1).max(LIMITS.rows).default(LIMITS.defaultRows),expectedCheckpoint:point.default('new'),planSha256:sha.optional()}).strict().superRefine((r,c)=>{if(r.action==='apply'&&!r.planSha256)c.addIssue({code:'custom',message:'Plan hash required'});if(r.action!=='apply'&&r.planSha256)c.addIssue({code:'custom',message:'Plan hash only on apply'});});
export type MemoryBackfillRequest=z.infer<typeof memoryBackfillRequest>;
const countsSchema=z.object({scanned:count,foreign:count,unverified:count,candidates:count,inserted:count,preserved:count,legacyPreserved:count,divergent:count,semanticDuplicates:count}).strict().superRefine((r,c)=>{if(r.scanned!==r.foreign+r.unverified+r.candidates||r.candidates!==r.inserted+r.preserved||r.legacyPreserved>r.preserved||r.divergent>r.preserved)c.addIssue({code:'custom',message:'Inconsistent memory counts'});});
const cursorSchema=z.object({phase:z.enum(['episodes','outcomes','done']),after:count}).strict();
const stateSchema=z.object({version:z.literal(1),compat:z.object({version:z.literal(1),eventSource:z.literal(COMPAT.eventSource),reward:z.literal(COMPAT.reward),features:z.literal(COMPAT.features),scenario:z.literal(COMPAT.scenario)}).strict(),jobId:z.string().uuid(),actorId:z.string().min(1).max(500),limit:count.min(1).max(LIMITS.rows),worldBorn:z.string(),bounds:z.object({episodes:count,outcomes:count}).strict(),cursor:cursorSchema,sequence:count.min(1),totals:countsSchema,receiptDigest:sha,previous:point,lastPlan:sha,nonce:z.string().uuid()}).strict();
type State=z.infer<typeof stateSchema>;
type Job={state:State;raw:string;checksum:string};
type WorldRow={revision:number;data:string};
type SqlPart={sql:string;args:unknown[]};
type Page={kind:ArchiveKind;after:number;end:number;rows:ArchiveMemoryRow[];next:z.infer<typeof cursorSchema>};
const fail=(code:string,status=409):never=>{throw new MemoryBackfillError(code,status);};
const statement=(db:D1Database,p:SqlPart)=>db.prepare(p.sql).bind(...p.args);
async function readJob(db:D1Database,r:MemoryBackfillRequest):Promise<Job|null>{
 const row=await db.prepare('SELECT id,actor_id,data,checksum FROM memory_backfill_jobs WHERE id=?').bind(r.jobId).first<{id:string;actor_id:string;data:string;checksum:string}>();
 if(!row)return null;
 let state:State;try{state=stateSchema.parse(JSON.parse(row.data));}catch{return fail('checkpoint-format',503);}
 if(await backfillHash(row.data)!==row.checksum||state.jobId!==row.id||state.actorId!==row.actor_id)fail('checkpoint-integrity',503);
 if(state.actorId!==r.actorId)fail('job-actor');
 const receipt=await db.prepare('SELECT plan_sha256,data FROM memory_backfill_batches WHERE job_id=? AND sequence=?').bind(r.jobId,state.sequence).first<{plan_sha256:string;data:string}>();
 let last;try{last=receipt&&JSON.parse(receipt.data);}catch{fail('checkpoint-receipt',503);}
 if(!last||last.checkpoint!==row.checksum||receipt!.plan_sha256!==state.lastPlan||last.previous!==state.previous)fail('checkpoint-receipt',503);
 const{checkpoint:receiptCheckpoint,...receiptBasis}=last;if(receiptCheckpoint!==row.checksum||await backfillHash(receiptBasis)!==state.receiptDigest)fail('checkpoint-receipt',503);
 return{state,raw:row.data,checksum:row.checksum};
}
function summary(job:Job){return{checkpoint:job.checksum,cursor:job.state.cursor,sequence:job.state.sequence,totals:job.state.totals,complete:job.state.cursor.phase==='done'};}
async function bounds(db:D1Database,actor:string){
 const rows=await db.batch<{n:number}>([db.prepare('SELECT coalesce(max(rowid),0) n FROM episodes'),db.prepare('SELECT coalesce(max(seq),0) n FROM agent_experiences WHERE actor_id=?').bind(actor)]);
 return{episodes:count.parse(rows[0].results[0]?.n),outcomes:count.parse(rows[1].results[0]?.n)};
}
async function readPage(db:D1Database,kind:ArchiveKind,after:number,upper:number,actor:string,limit:number):Promise<Page>{
 const table=kind==='episodes'?'episodes':'agent_experiences',column=kind==='episodes'?'rowid':'seq',owner=kind==='episodes'?'source':'actor_id',filter=kind==='outcomes'?' AND actor_id=?':'';
 const result=await db.prepare(`SELECT ${column} AS position,id,created_at,${owner} AS owner,CASE WHEN length(CAST(data AS BLOB))<=${LIMITS.sourceRowBytes} THEN data ELSE NULL END data,length(CAST(data AS BLOB)) bytes FROM ${table} WHERE ${column}>? AND ${column}<=?${filter} ORDER BY ${column} LIMIT ?`).bind(...(kind==='outcomes'?[after,upper,actor,limit]:[after,upper,limit])).all<ArchiveMemoryRow>();
 const rows=result.results,done=rows.length<limit||(rows.at(-1)?.position??after)>=upper,end=done?upper:rows.at(-1)!.position;
 return{kind,after,end,rows,next:done?{phase:kind==='episodes'?'outcomes':'done',after:0}:{phase:kind,after:end}};
}
const scope=(alias:string)=>`(${alias}.id IN(SELECT json_extract(value,'$.id') FROM json_each(?)) OR (${alias}.person_id=? AND ${alias}.event_id IN(SELECT json_extract(value,'$.eventId') FROM json_each(?))))`;
const scopeArgs=(candidates:MemoryRecord[],actor:string)=>{const raw=JSON.stringify(candidates.map(c=>({id:c.id,eventId:c.eventId})));return[raw,actor,raw];};
const columns=['id','person_id','event_id','text','kind','importance','witnessed_with','created_at'];
async function targets(db:D1Database,candidates:MemoryRecord[],actor:string){
 if(!candidates.length)return[];
 const bytes=columns.map(c=>`coalesce(length(CAST(m.${c} AS BLOB)),0)`).join('+');
 const projected=columns.map(c=>`CASE WHEN (${bytes})<=${LIMITS.targetRowBytes} THEN m.${c} ELSE NULL END AS ${c}`).join(',');
 return(await db.prepare(`SELECT ${projected},(${bytes}) bytes FROM memories m WHERE ${scope('m')} ORDER BY m.id LIMIT ${LIMITS.targetRows+1}`).bind(...scopeArgs(candidates,actor)).all<StoredMemoryRow>()).results;
}
function worldGuard(world:WorldRow):SqlPart{return{sql:"EXISTS(SELECT 1 FROM worlds WHERE id='home' AND revision=? AND data=?)",args:[world.revision,world.data]};}
function sourceGuard(page:Page,actor:string):SqlPart{
 const {kind,after,end,rows}=page,table=kind==='episodes'?'episodes':'agent_experiences',column=kind==='episodes'?'rowid':'seq',owner=kind==='episodes'?'source':'actor_id',filter=kind==='outcomes'?' AND actor_id=?':'';
 const expected=JSON.stringify(rows.map(r=>[r.position,r.id,r.created_at,r.owner,r.data]));
 return{sql:`(SELECT count(*) FROM ${table} WHERE ${column}>? AND ${column}<=?${filter})=? AND NOT EXISTS(SELECT 1 FROM json_each(?) e WHERE NOT EXISTS(SELECT 1 FROM ${table} s WHERE s.${column} IS json_extract(e.value,'$[0]') AND s.id IS json_extract(e.value,'$[1]') AND s.created_at IS json_extract(e.value,'$[2]') AND s.${owner} IS json_extract(e.value,'$[3]') AND s.data IS json_extract(e.value,'$[4]')))`,args:[after,end,...(kind==='outcomes'?[actor]:[]),rows.length,expected]};
}
function memoryGuard(candidates:MemoryRecord[],actor:string,rows:StoredMemoryRow[]):SqlPart{
 if(!candidates.length)return{sql:'1',args:[]};
 return{sql:`(SELECT count(*) FROM memories m WHERE ${scope('m')})=? AND NOT EXISTS(SELECT 1 FROM json_each(?) e WHERE NOT EXISTS(SELECT 1 FROM memories m WHERE ${columns.map((c,i)=>`m.${c} IS json_extract(e.value,'$[${i}]')`).join(' AND ')}))`,args:[...scopeArgs(candidates,actor),rows.length,JSON.stringify(rows.map(memoryTuple))]};
}
const combine=(parts:SqlPart[]):SqlPart=>({sql:parts.map(p=>`(${p.sql})`).join(' AND '),args:parts.flatMap(p=>p.args)});
export async function runMemoryBackfill(db:D1Database,r:MemoryBackfillRequest){
 const job=await readJob(db,r);
 if(r.action==='status')return{ok:true,mode:'status',exists:!!job,...(job?summary(job):{checkpoint:'new'})};
 if(job&&job.state.limit!==r.limit)fail('job-config');
 if(job&&r.action==='apply'&&job.state.lastPlan===r.planSha256&&job.state.previous===r.expectedCheckpoint)return{ok:true,mode:'applied',duplicate:true,...summary(job)};
 if((job?.checksum??'new')!==r.expectedCheckpoint)fail('checkpoint-stale');
 if(job?.state.cursor.phase==='done'){if(r.action==='apply')fail('job-complete');return{ok:true,mode:'dry-run',duplicate:true,...summary(job),records:[]};}
 const world=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first<WorldRow>();if(!world)fail('world-missing',503);
 let born:unknown;try{born=JSON.parse(world!.data).born;}catch{fail('world-format',503);}if(typeof born!=='string'||!born)fail('world-format',503);
 if(job&&job.state.worldBorn!==born)fail('world-identity');
 const upper=job?.state.bounds??await bounds(db,r.actorId),cursor=job?.state.cursor??{phase:'episodes' as const,after:0};
 const page=await readPage(db,cursor.phase as ArchiveKind,cursor.after,upper[cursor.phase as ArchiveKind],r.actorId,r.limit);
 const derived=sourceMemoryCandidates(page.kind,page.rows,r.actorId),existing=await targets(db,derived.records,r.actorId),reconciled=reconcileMemoryCandidates(derived.records,existing,derived.counts);
 const sourceDigest=await backfillHash(page.rows.map(row=>[row.position,row.id,row.created_at,row.owner,row.data])),targetDigest=await backfillHash(existing.map(memoryTuple));
 const checkpoint=job?.checksum??'new',planSha256=await backfillHash({version:1,compat:COMPAT,jobId:r.jobId,actorId:r.actorId,limit:r.limit,checkpoint,worldRevision:world!.revision,worldDigest:await backfillHash(world!.data),bounds:upper,cursor,page:{kind:page.kind,after:page.after,end:page.end,count:page.rows.length,sourceDigest},targetDigest,records:derived.records,missing:reconciled.missing,counts:reconciled.counts,next:page.next});
 const preview={ok:true,mode:'dry-run',checkpoint,planSha256,sourceDigest,targetDigest,cursor,nextCursor:page.next,sourceRows:page.rows.length,counts:reconciled.counts,complete:page.next.phase==='done',records:reconciled.missing};
 if(r.action==='preview')return preview;
 if(r.planSha256!==planSha256)fail('plan-stale');
 const totals={...(job?.state.totals??emptyBackfillCounts())};for(const key of Object.keys(totals) as (keyof BackfillCounts)[])totals[key]+=reconciled.counts[key];
 const receiptBasis={version:1,previous:checkpoint,sourceDigest,targetDigest,worldRevision:world!.revision,from:cursor,to:page.next,counts:reconciled.counts,insertedIds:reconciled.missing.map(m=>m.id)};
 const receiptDigest=await backfillHash(receiptBasis);
 const state:State={version:1,compat:COMPAT,jobId:r.jobId,actorId:r.actorId,limit:r.limit,worldBorn:born as string,bounds:upper,cursor:page.next,sequence:(job?.state.sequence??0)+1,totals,receiptDigest,previous:checkpoint,lastPlan:planSha256,nonce:crypto.randomUUID()};
 const raw=JSON.stringify(state),hash=await backfillHash(raw),now=new Date().toISOString();
 const common=combine([worldGuard(world!),sourceGuard(page,r.actorId),memoryGuard(derived.records,r.actorId,existing)]);
 const claim:SqlPart=job?{sql:`UPDATE memory_backfill_jobs SET data=?,checksum=?,updated_at=? WHERE id=? AND actor_id=? AND data=? AND checksum=? AND ${common.sql}`,args:[raw,hash,now,r.jobId,r.actorId,job.raw,job.checksum,...common.args]}:{sql:`INSERT INTO memory_backfill_jobs(id,actor_id,data,checksum,updated_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM memory_backfill_jobs WHERE id=?) AND ${common.sql}`,args:[r.jobId,r.actorId,raw,hash,now,r.jobId,...common.args]};
 const owns:SqlPart={sql:'EXISTS(SELECT 1 FROM memory_backfill_jobs WHERE id=? AND data=? AND checksum=?)',args:[r.jobId,raw,hash]};
 const insert:SqlPart={sql:`INSERT INTO memories(id,person_id,event_id,text,kind,importance,witnessed_with,created_at) SELECT json_extract(value,'$.id'),json_extract(value,'$.personId'),json_extract(value,'$.eventId'),json_extract(value,'$.text'),json_extract(value,'$.kind'),json_extract(value,'$.importance'),json_extract(value,'$.witnessedWith'),json_extract(value,'$.createdAt') FROM json_each(?) WHERE ${owns.sql}`,args:[JSON.stringify(reconciled.missing),...owns.args]};
 const post=combine([worldGuard(world!),sourceGuard(page,r.actorId),memoryGuard(derived.records,r.actorId,[...existing,...reconciled.missing.map(projectedMemoryRow)])]);
 const receipt=JSON.stringify({...receiptBasis,checkpoint:hash});
 // NULL violates the receipt's NOT NULL constraint: the entire D1 batch must roll back.
 const journal:SqlPart={sql:`INSERT INTO memory_backfill_batches(id,job_id,sequence,plan_sha256,data,created_at) SELECT ?,?,?,?,CASE WHEN ${post.sql} THEN ? ELSE NULL END,? WHERE ${owns.sql}`,args:[`${r.jobId}:${state.sequence}`,r.jobId,state.sequence,planSha256,...post.args,receipt,now,...owns.args]};
 const results=await db.batch([statement(db,claim),statement(db,insert),statement(db,journal)]);
 if(!results[0].meta.changes){const latest=await readJob(db,r);if(latest?.state.lastPlan===planSha256&&latest.state.previous===checkpoint)return{ok:true,mode:'applied',duplicate:true,...summary(latest)};return fail('checkpoint-or-source-conflict');}
 return{ok:true,mode:'applied',duplicate:false,counts:reconciled.counts,...summary({state,raw,checksum:hash})};
}
