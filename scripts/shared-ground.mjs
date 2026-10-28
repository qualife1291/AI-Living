/** Explicit local owner setup/advance; default status. No automatic retries or new daemon. */
import {parseArgs} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sharedRequestSchema} from '../lib/living/shared-ground-store.ts';
import {SHARED_SCOPE,validateSharedView} from '../lib/living/shared-ground-view.ts';
export async function sharedGroundCommand(options,send=fetch){
 const base=new URL(options.origin??process.env.XOM_ORIGIN??'http://127.0.0.1:5173');
 if(!['http:','https:'].includes(base.protocol)||!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error('loopback-required');
 const req=sharedRequestSchema.parse({action:options.action??'status',expectedCheckpoint:options.expectedCheckpoint??'new',...(options.sessionId?{sessionId:options.sessionId}:{}),...(options.operationId?{operationId:options.operationId}:{})});
 const response=await send(new URL('/api/living/ground/shared',base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(req),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('shared-request-failed');const reader=response.body?.getReader(),chunks=[];let bytes=0;
 if(reader)for(;;){const{done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2097152){await reader.cancel();throw Error('response-budget');}chunks.push(value);}
 const r=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))),mode={status:'status',start:'started',advance:'advanced'}[req.action];
 if(r.ok!==true||r.mode!==mode||(r.scope??r.view?.scope)!==SHARED_SCOPE||!(/^[a-f0-9]{64}$/.test(r.checkpoint)||r.checkpoint==='new'))throw Error('unconfirmed-ack');
 if(req.action==='status'){
  if(typeof r.exists!=='boolean')throw Error('unconfirmed-status');
  const view=r.exists?validateSharedView(r.view):null;
  return {ok:true,mode,checkpoint:r.checkpoint,exists:r.exists,scope:SHARED_SCOPE,...(view?{sequence:view.sequence,cursorRealMs:view.cursorRealMs,simMs:view.simMs,backlogMs:view.backlogMs,actors:view.frames.at(-1).poses.length,cars:view.frames.at(-1).cars.length}:{}),eligibleForReward:false,eligibleForP2P:false};
 }
 if(!/^[a-f0-9]{64}$/.test(r.checkpoint)||!Number.isSafeInteger(r.sequence)||r.sequence<1||typeof r.duplicate!=='boolean'||r.scope!==SHARED_SCOPE||r.eligibleForReward!==false||r.eligibleForP2P!==false||!Number.isFinite(r.cursorRealMs)||!Number.isFinite(r.simMs))throw Error('unconfirmed-write');
 return {ok:true,mode,checkpoint:r.checkpoint,sequence:r.sequence,cursorRealMs:r.cursorRealMs,simMs:r.simMs,duplicate:r.duplicate,physicsSteps:r.physicsSteps,backlogMs:r.backlogMs,scope:SHARED_SCOPE,eligibleForReward:false,eligibleForP2P:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const{values}=parseArgs({options:{origin:{type:'string'},action:{type:'string',default:'status'},session:{type:'string'},operation:{type:'string'},'expected-checkpoint':{type:'string',default:'new'}},strict:true,allowPositionals:false});console.log(JSON.stringify(await sharedGroundCommand({origin:values.origin,action:values.action,sessionId:values.session,operationId:values.operation,expectedCheckpoint:values['expected-checkpoint']})));}
 catch{console.error('Local shared timeline failed or ACK was not confirmed. Read status/checkpoint before retrying; no automatic retry.');process.exitCode=1;}
}
