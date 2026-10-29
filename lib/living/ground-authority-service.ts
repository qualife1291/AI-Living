import {z} from 'zod';
import {GroundTimelineError} from './ground-timeline.ts';
import {readSharedGround,runSharedGround} from './shared-ground-store.ts';
import {requireAuthoritySchema} from './ground-authority-store.ts';
import {AUTHORITY_SCOPE} from './ground-authority.ts';
const hash=z.string().regex(/^[a-f0-9]{64}$/);
export const authorityRequestSchema=z.object({action:z.enum(['status','start']).default('status'),sessionId:z.string().uuid().optional(),operationId:z.string().uuid().optional(),expectedCheckpoint:z.union([z.literal('new'),hash]).default('new')}).strict().superRefine((r,c)=>{if(r.action==='start'&&(!r.sessionId||!r.operationId||r.expectedCheckpoint==='new')||r.action==='status'&&(r.sessionId||r.operationId||r.expectedCheckpoint!=='new'))c.addIssue({code:'custom',message:'Explicit shared session/operation/checkpoint required for start only'});});
export async function runGroundAuthorityV3(db:D1Database,input:z.infer<typeof authorityRequestSchema>,nowMs=Date.now()){
 const request=authorityRequestSchema.parse(input);
 if(request.action==='status'){
  const shared=await readSharedGround(db,nowMs);let schemaReady=true;
  try{await requireAuthoritySchema(db);}catch(error){if(error instanceof GroundTimelineError&&error.message==='authority-schema-incomplete')schemaReady=false;else throw error;}
  const authority=shared?.authority;
  return {ok:true,mode:'status',scope:AUTHORITY_SCOPE,exists:!!authority,schemaReady,sharedExists:!!shared,sharedCheckpoint:shared?.view.checkpoint??'new',checkpoint:authority?.checkpoint??'new',...(authority?{sequence:authority.state.sequence,parentSequence:authority.state.parentSequence,cursorSimMs:authority.state.cursorSimMs,counts:authority.state.counts,recentUtterances:authority.state.utterances.slice(-8).map(u=>({id:u.id,speakerId:u.speakerId,listenerId:u.listenerId,text:u.text,fromSimMs:u.fromSimMs,untilSimMs:u.untilSimMs,cancelledAt:u.cancelledAt,completed:u.completed}))}:{}),eligibleForReward:false,eligibleForP2P:false};
 }
 const result=await runSharedGround(db,{action:'advance',sessionId:request.sessionId,operationId:request.operationId,expectedCheckpoint:request.expectedCheckpoint},nowMs,{activateAuthority:true});
 if(!('authority' in result)||!result.authority||!('duplicate' in result))throw new GroundTimelineError('authority-receipt-missing');
 return {ok:true,mode:'started',scope:AUTHORITY_SCOPE,duplicate:result.duplicate,checkpoint:result.authority.checkpoint,sharedCheckpoint:result.checkpoint,...('currentCheckpoint' in result?{currentSharedCheckpoint:result.currentCheckpoint}:{}),sequence:result.authority.sequence,counts:result.authority.counts,eligibleForReward:false,eligibleForP2P:false};
}
