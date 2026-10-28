/** Explicit loopback maintenance client. No automatic apply or retry. */
import {parseArgs} from 'node:util';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync,lstatSync,realpathSync,mkdirSync,openSync,writeFileSync,closeSync,fsyncSync,linkSync,unlinkSync,constants} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {memoryBackfillRequest} from '../lib/memory-backfill-store.ts';
const root=fileURLToPath(new URL('../',import.meta.url)),privateRoot=resolve(root,'.sites-runtime/training');
const hash=z.string().regex(/^[a-f0-9]{64}$/),point=z.union([z.literal('new'),hash]);
const memory=z.object({id:z.string().max(1100),personId:z.string().min(1).max(500),eventId:z.string().min(1).max(500),text:z.string().min(1).max(1000),kind:z.enum(['event-report','simulation-plan-outcome']),importance:z.number().int().min(1).max(5),witnessedWith:z.array(z.string()).length(1),createdAt:z.string().datetime({offset:true})}).strict();
const nonnegative=z.number().int().nonnegative().safe();
const counts=z.object({scanned:nonnegative,foreign:nonnegative,unverified:nonnegative,candidates:nonnegative,inserted:nonnegative,preserved:nonnegative,legacyPreserved:nonnegative,divergent:nonnegative,semanticDuplicates:nonnegative}).strict();
const cursor=z.object({phase:z.enum(['episodes','outcomes','done']),after:nonnegative}).strict();
const reply=z.object({ok:z.literal(true),mode:z.enum(['dry-run','applied','status']),checkpoint:point,planSha256:hash.optional(),sourceDigest:hash.optional(),targetDigest:hash.optional(),cursor:cursor.optional(),nextCursor:cursor.optional(),sourceRows:nonnegative.max(32).optional(),counts:counts.optional(),totals:counts.optional(),sequence:nonnegative.optional(),complete:z.boolean().optional(),duplicate:z.boolean().optional(),exists:z.boolean().optional(),records:z.array(memory).max(32).optional()}).strict();
function reviewFile(path,value){
 const out=resolve(path);if(!out.startsWith(privateRoot+sep)||!out.endsWith('.json'))throw Error('private-review-path');
 let current=resolve(root);
 for(const name of relative(current,dirname(out)).split(sep)){
  current=resolve(current,name);if(!existsSync(current))mkdirSync(current,{mode:0o700});
  if(lstatSync(current).isSymbolicLink()||!lstatSync(current).isDirectory()||realpathSync(current)!==current)throw Error('private-review-path');
 }
 const temp=resolve(dirname(out),`.memory-review-${randomUUID()}.tmp`);let fd;
 try{fd=openSync(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fsyncSync(fd);closeSync(fd);fd=undefined;linkSync(temp,out);}finally{if(fd!==undefined)closeSync(fd);if(existsSync(temp))unlinkSync(temp);}
}
export async function memoryBackfillCommand(options,send=fetch){
 const base=new URL(options.origin??process.env.XOM_ORIGIN??'http://127.0.0.1:5173');
 if(!['http:','https:'].includes(base.protocol)||!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error('loopback-origin-required');
 const input=memoryBackfillRequest.parse({jobId:options.jobId,actorId:options.actorId,action:options.action??'preview',limit:Number(options.limit??16),expectedCheckpoint:options.expectedCheckpoint??'new',...(options.planSha256?{planSha256:options.planSha256}:{})});
 if(options.reviewOut&&input.action!=='preview')throw Error('review-only-on-preview');
 const raw=JSON.stringify(input);if(Buffer.byteLength(raw)>2048)throw Error('request-budget');
 const response=await send(new URL('/api/living/memories/backfill',base),{method:'POST',headers:{'content-type':'application/json'},body:raw,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(`http-${response.status}`);
 const chunks=[];let bytes=0;const reader=response.body?.getReader();
 if(reader)for(;;){const{done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>262144){await reader.cancel();throw Error('response-budget');}chunks.push(value);}
 let value;try{value=reply.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{throw Error('unconfirmed-response');}
 if(value?.ok!==true||!['dry-run','applied','status'].includes(value.mode)||!point.safeParse(value.checkpoint).success)throw Error('unconfirmed-response');
 if(input.action==='preview'&&value.mode!=='dry-run'||input.action==='apply'&&value.mode!=='applied'||input.action==='status'&&value.mode!=='status')throw Error('unconfirmed-response');
 if(value.mode==='dry-run'&&(!Array.isArray(value.records)||!value.duplicate&&(!value.counts||!value.cursor||!value.nextCursor||!hash.safeParse(value.planSha256).success)))throw Error('unconfirmed-response');
 if(value.mode==='applied'&&(!value.totals||!value.cursor||!value.sequence||!hash.safeParse(value.checkpoint).success))throw Error('unconfirmed-response');
 if(value.records!==undefined){
  const records=z.array(memory).max(32).parse(value.records);
  if(records.some(m=>m.personId!==input.actorId||m.witnessedWith[0]!==input.actorId))throw Error('foreign-review-record');
 }
 if(options.reviewOut)reviewFile(options.reviewOut,value);
 const summary={kind:'local-memory-backfill',mode:value.mode,checkpoint:value.checkpoint,...(value.planSha256?{planSha256:value.planSha256}:{}),...(value.cursor?{cursor:value.cursor}:{}),...(value.nextCursor?{nextCursor:value.nextCursor}:{}),...(value.counts?{counts:value.counts}:{}),...(value.totals?{totals:value.totals}:{}),...(value.sequence!==undefined?{sequence:value.sequence}:{}),...(value.complete!==undefined?{complete:value.complete}:{}),...(value.duplicate!==undefined?{duplicate:value.duplicate}:{})};
 return summary;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const {values}=parseArgs({options:{origin:{type:'string'},job:{type:'string'},actor:{type:'string'},action:{type:'string',default:'preview'},limit:{type:'string',default:'16'},'expected-checkpoint':{type:'string',default:'new'},'plan-sha256':{type:'string'},'review-out':{type:'string'}},strict:true,allowPositionals:false});
  console.log(JSON.stringify(await memoryBackfillCommand({origin:values.origin,jobId:values.job,actorId:values.actor,action:values.action,limit:values.limit,expectedCheckpoint:values['expected-checkpoint'],planSha256:values['plan-sha256'],reviewOut:values['review-out']})));
 }catch{console.error('Local memory backfill failed or was not confirmed. No automatic retry; inspect status/checkpoint before retrying apply.');process.exitCode=1;}
}
