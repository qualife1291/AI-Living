import {z} from 'zod';
import type {Actor} from '../life.ts';
import type {SharedGroundView} from './shared-ground-view.ts';
import type {AuthorityState} from './ground-authority.ts';
export const AUTHORITY_SCOPE='server-ground-authority-v1';
const hash=z.string().regex(/^[a-f0-9]{64}$/),time=z.number().finite().nonnegative(),count=time.int().safe(),id=z.string().regex(/^[a-z][a-z0-9-]{0,99}$/);
const speechSchema=z.object({id:z.string().min(1).max(240),turnId:z.string().min(1).max(160),sourceSeq:count.positive(),sourceRevision:count,generator:z.enum(['rules','local-llm']),speakerId:id,listenerId:id,text:z.string().min(1).max(600),fromSimMs:time,untilSimMs:time,cancelledAt:time.nullable(),completed:z.boolean()}).strict();
export const authorityViewSchema=z.object({version:z.literal(1),scope:z.literal(AUTHORITY_SCOPE),protocolSha256:hash,checkpoint:hash,worldBorn:z.string().datetime({offset:true}),parentCheckpoint:hash,parentSequence:count.positive(),sourceSeq:count.positive(),sourceRevision:count,simMs:time,utterances:z.array(speechSchema).max(64),eligibleForReward:z.literal(false),eligibleForP2P:z.literal(false)}).strict();
export type AuthorityView=z.infer<typeof authorityViewSchema>;
export function validateAuthorityView(value:unknown,shared:SharedGroundView):AuthorityView{
 const v=authorityViewSchema.parse(value);
 if(new TextEncoder().encode(JSON.stringify(v)).length>262144||v.worldBorn!==shared.worldBorn||v.parentCheckpoint!==shared.checkpoint||v.parentSequence!==shared.sequence||v.sourceRevision!==shared.sourceRevision||v.simMs!==shared.simMs||new Set(v.utterances.map(u=>u.id)).size!==v.utterances.length||v.utterances.some(u=>u.speakerId===u.listenerId||u.sourceSeq>v.sourceSeq||u.sourceRevision>v.sourceRevision||u.fromSimMs>v.simMs||u.untilSimMs!==u.fromSimMs+12000||u.cancelledAt!==null&&(u.cancelledAt<u.fromSimMs||u.cancelledAt>Math.min(u.untilSimMs,v.simMs))||u.completed&&(u.untilSimMs>v.simMs||u.cancelledAt!==null)))throw Error('authority-view-integrity');
 return v;
}
export function projectAuthorityView(state:AuthorityState,checkpoint:string,shared:SharedGroundView):AuthorityView{
 return validateAuthorityView({version:1,scope:AUTHORITY_SCOPE,protocolSha256:state.protocolSha256,checkpoint,worldBorn:state.worldBorn,parentCheckpoint:state.parentCheckpoint,parentSequence:state.parentSequence,sourceSeq:state.sourceSeq,sourceRevision:state.sourceRevision,simMs:state.cursorSimMs,utterances:state.utterances.map(u=>({id:u.id,turnId:u.turnId,sourceSeq:u.sourceSeq,sourceRevision:u.sourceRevision,generator:u.generator,speakerId:u.speakerId,listenerId:u.listenerId,text:u.text,fromSimMs:u.fromSimMs,untilSimMs:u.untilSimMs,cancelledAt:u.cancelledAt,completed:u.completed})),eligibleForReward:false,eligibleForP2P:false},shared);
}
/** Presentation only. No hearing ACK, memory import, physical movement or extrapolation. */
export function sampleAuthoritySpeech(view:AuthorityView|undefined,shared:SharedGroundView,simMs:number,actors:readonly Actor[]){
 if(!view||!Number.isFinite(simMs)||view.parentCheckpoint!==shared.checkpoint||view.parentSequence!==shared.sequence||view.worldBorn!==shared.worldBorn||simMs>view.simMs)return [];
 const ids=new Set(actors.map(a=>a.id));
 return view.utterances.filter(u=>simMs>=u.fromSimMs&&simMs<Math.min(u.untilSimMs,u.cancelledAt??Infinity)&&ids.has(u.speakerId)&&ids.has(u.listenerId));
}
