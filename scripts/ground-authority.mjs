/** Explicit local GND3 activation on an existing shared session. Default is read-only status. */
import {parseArgs} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authorityRequestSchema} from '../lib/living/ground-authority-service.ts';
import {AUTHORITY_SCOPE} from '../lib/living/ground-authority.ts';
export async function groundAuthorityCommand(options,send=fetch){
 const base=new URL(options.origin??process.env.XOM_ORIGIN??'http://127.0.0.1:5173');
 if(!['http:','https:'].includes(base.protocol)||!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error('loopback-required');
 const input=authorityRequestSchema.parse({action:options.action??'status',expectedCheckpoint:options.expectedCheckpoint??'new',...(options.sessionId?{sessionId:options.sessionId}:{}),...(options.operationId?{operationId:options.operationId}:{})});
 const response=await send(new URL('/api/living/ground/authority',base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('authority-request-failed');const reader=response.body?.getReader(),chunks=[];let size=0;
 if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw Error('response-budget');}chunks.push(value);}
 const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))),mode=input.action==='status'?'status':'started',validHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
 if(result.ok!==true||result.mode!==mode||result.scope!==AUTHORITY_SCOPE||result.eligibleForReward!==false||result.eligibleForP2P!==false)throw Error('unconfirmed-ack');
 if(input.action==='status'){
  if(typeof result.exists!=='boolean'||typeof result.schemaReady!=='boolean'||typeof result.sharedExists!=='boolean'||!(validHash(result.sharedCheckpoint)||result.sharedCheckpoint==='new')||!(result.exists?validHash(result.checkpoint):result.checkpoint==='new'))throw Error('unconfirmed-status');
 }else if(!validHash(result.checkpoint)||!validHash(result.sharedCheckpoint)||typeof result.duplicate!=='boolean'||!Number.isSafeInteger(result.sequence)||result.sequence<1)throw Error('unconfirmed-write');
 if(result.exists||input.action==='start')if(!result.counts||!['arrivals','presence','encounters','heard'].every(k=>Number.isSafeInteger(result.counts[k])&&result.counts[k]>=0))throw Error('unconfirmed-counts');
 return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const {values}=parseArgs({options:{origin:{type:'string'},action:{type:'string',default:'status'},session:{type:'string'},operation:{type:'string'},'expected-checkpoint':{type:'string',default:'new'}},strict:true,allowPositionals:false});console.log(JSON.stringify(await groundAuthorityCommand({origin:values.origin,action:values.action,sessionId:values.session,operationId:values.operation,expectedCheckpoint:values['expected-checkpoint']})));}
 catch{console.error('GND3 local request failed or its ACK was not confirmed. Read shared/authority status before retrying; no automatic retry.');process.exitCode=1;}
}
