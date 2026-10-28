/** Historical memory projection only. Never settle plans, infer witnesses or modify source. */
import {z} from 'zod';
import {auditExperience} from './living/experience-audit.ts';
import {outcomeMemory,type MemoryRecord} from './memory-records.ts';
import type {Experience} from './living/learning.ts';
import {OUTCOME_SCENARIO_SIGNATURE} from './living/learning.ts';
import {REWARD_VERSION,FEATURE_VERSION} from './living/reward-evidence.ts';
export const BACKFILL_LIMITS={requestBytes:2048,defaultRows:16,rows:32,sourceRowBytes:65536,batchBytes:524288,targetRows:256,targetRowBytes:8192,targetBytes:262144} as const;
export const BACKFILL_COMPATIBILITY={version:1,eventSource:'explicit-episode-change-v1',reward:REWARD_VERSION,features:FEATURE_VERSION,scenario:OUTCOME_SCENARIO_SIGNATURE} as const;
export class MemoryBackfillError extends Error {
  readonly status:number;
  constructor(code:string,status=409){super(code);this.status=status;}
}
export type ArchiveKind='episodes'|'outcomes';
export type ArchiveMemoryRow={position:number;id:string;created_at:string;owner:string;data:string|null;bytes?:number};
export type StoredMemoryRow={id:string;person_id:string;event_id:string;text:string;kind:string;importance:number|null;witnessed_with:string|null;created_at:string;bytes?:number};
export const emptyBackfillCounts=()=>({scanned:0,foreign:0,unverified:0,candidates:0,inserted:0,preserved:0,legacyPreserved:0,divergent:0,semanticDuplicates:0});
export type BackfillCounts=ReturnType<typeof emptyBackfillCounts>;
const iso=z.string().datetime({offset:true}),id=z.string().min(1).max(500);
const changeSchema=z.object({id,memory:z.string().min(1).max(240),skillDelta:z.number().int().min(0).max(3).optional()});
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
export async function backfillHash(value:unknown){
 const raw=typeof value==='string'?value:JSON.stringify(value);
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function sourceMemoryCandidates(kind:ArchiveKind,rows:ArchiveMemoryRow[],actorId:string){
 const counts=emptyBackfillCounts(),records:MemoryRecord[]=[];let bytes=0;
 if(rows.length>BACKFILL_LIMITS.rows)throw new MemoryBackfillError('source-budget',413);
 for(const row of rows){
  counts.scanned++;
  // The archive column is the first actor boundary for outcomes; do not parse foreign data.
  if(kind==='outcomes'&&row.owner!==actorId){counts.foreign++;continue;}
  const size=row.bytes??(row.data===null?Infinity:new TextEncoder().encode(row.data).byteLength);bytes+=size;
  if(size>BACKFILL_LIMITS.sourceRowBytes||bytes>BACKFILL_LIMITS.batchBytes)throw new MemoryBackfillError('source-budget',413);
  let value:unknown;try{value=JSON.parse(row.data!);}catch{counts.unverified++;continue;}
  if(kind==='episodes'){
   if(!object(value)||!Array.isArray(value.changes)){counts.unverified++;continue;}
   const matches=value.changes.filter(c=>object(c)&&c.id===actorId);
   if(!matches.length){counts.foreign++;continue;}
   if(matches.length!==1)throw new MemoryBackfillError('ambiguous-recipient');
   if('id'in value&&value.id!==row.id)throw new MemoryBackfillError('source-identity');
   const parsed=changeSchema.safeParse(matches[0]);
   if(!parsed.success||!['ai','opening'].includes(row.owner)||!iso.safeParse(row.created_at).success||!id.safeParse(row.id).success){counts.unverified++;continue;}
   const c=parsed.data;
   records.push({id:`event:${row.id}:${actorId}`,personId:actorId,eventId:row.id,text:c.memory,kind:'event-report',importance:(c.skillDelta??0)>0?4:3,witnessedWith:[actorId],createdAt:row.created_at});
  }else{
   if(!object(value)||value.id!==row.id||value.actorId!==actorId)throw new MemoryBackfillError('source-identity');
   const audit=auditExperience(value);
   if(!['verified-contextual','verified-tabular'].includes(audit.status)||audit.binding!=='fingerprint-v1'||!iso.safeParse(row.created_at).success||typeof value.at!=='string'||Date.parse(row.created_at)!==Date.parse(value.at)||!id.safeParse(row.id).success){counts.unverified++;continue;}
   const e=value as unknown as Experience;
   records.push(outcomeMemory(e,`Kết quả kế hoạch mô phỏng ${e.scenarioId}; phản hồi ${e.reward.toFixed(2)}.`));
  }
 }
 if(new Set(records.map(r=>r.id)).size!==records.length)throw new MemoryBackfillError('source-identity');
 counts.candidates=records.length;return{records,counts};
}
export const memoryTuple=(r:StoredMemoryRow)=>[r.id,r.person_id,r.event_id,r.text,r.kind,r.importance,r.witnessed_with,r.created_at];
export function projectedMemoryRow(r:MemoryRecord):StoredMemoryRow{return{id:r.id,person_id:r.personId,event_id:r.eventId,text:r.text,kind:r.kind,importance:r.importance,witnessed_with:JSON.stringify(r.witnessedWith),created_at:r.createdAt};}
const knownKinds=new Set(['event-report','simulation-plan-outcome']);
export function reconcileMemoryCandidates(records:MemoryRecord[],existing:StoredMemoryRow[],counts:BackfillCounts){
 let total=0;if(existing.length>BACKFILL_LIMITS.targetRows)throw new MemoryBackfillError('target-budget',413);
 for(const row of existing){const bytes=row.bytes??new TextEncoder().encode(JSON.stringify(memoryTuple(row))).length;total+=bytes;if(bytes>BACKFILL_LIMITS.targetRowBytes||total>BACKFILL_LIMITS.targetBytes)throw new MemoryBackfillError('target-budget',413);}
 const missing:MemoryRecord[]=[],report={...counts};
 for(const candidate of records){
  const stable=existing.find(r=>r.id===candidate.id);
  if(stable&&(stable.person_id!==candidate.personId||stable.event_id!==candidate.eventId||knownKinds.has(stable.kind)&&stable.kind!==candidate.kind))throw new MemoryBackfillError('memory-identity');
  const linked=existing.filter(r=>r.person_id===candidate.personId&&r.event_id===candidate.eventId&&(r.kind===candidate.kind||!knownKinds.has(r.kind)));
  const matches=stable?[stable,...linked.filter(r=>r.id!==stable.id)]:linked;
  if(!matches.length){missing.push(candidate);report.inserted++;continue;}
  report.preserved++;report.semanticDuplicates+=Math.max(0,matches.length-1);
  if(matches.some(r=>!knownKinds.has(r.kind)))report.legacyPreserved++;
  const expected=JSON.stringify(memoryTuple(projectedMemoryRow(candidate)));
  if(!matches.some(r=>JSON.stringify(memoryTuple(r))===expected))report.divergent++;
 }
 return{missing,counts:report};
}
