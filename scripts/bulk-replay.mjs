/** Local offline job only. No network, world DB, history writer or runtime importer. */
import {DatabaseSync} from 'node:sqlite';
import {constants,openSync,closeSync,readSync,readFileSync,writeFileSync,lstatSync,fstatSync,realpathSync,mkdirSync,readdirSync,existsSync,fsyncSync,linkSync,unlinkSync} from 'node:fs';
import {resolve,dirname,relative,sep} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {ReplayCorpus,fitReplay,replayArtifactSchema,replayLevel,REPLAY_LIMIT,REPLAY_VERSION} from '../lib/living/outcome-replay.ts';
import {REWARD_VERSION,FEATURE_VERSION} from '../lib/living/reward-evidence.ts';
import {OUTCOME_SCENARIO_SIGNATURE} from '../lib/living/learning.ts';
import {digest,corpusDigest,replayRoot} from './replay-files.mjs';
export const BULK_LIMITS=Object.freeze({files:64,fileBytes:32*1024*1024,totalBytes:256*1024*1024,manifestBytes:65536,lineBytes:65536,batchBytes:8*1024*1024,batchLines:10000,batchRecords:5000,batches:20});
const integer=z.number().int().nonnegative().safe(),sha=z.string().regex(/^[a-f0-9]{64}$/);
const sourceSchema=z.object({file:z.string().min(1).max(240).regex(/^[\w.-]+(?:\/[\w.-]+)*\.jsonl$/).refine(s=>s.split('/').every(p=>p!=='.'&&p!=='..')),sha256:sha,bytes:integer.max(BULK_LIMITS.fileBytes)}).strict();
export const bulkManifestSchema=z.object({version:z.literal(1),kind:z.literal('local-owner-replay-set-v1'),actorId:z.string().min(1).max(500),order:z.enum(['chronological','curriculum']),batchRecords:integer.min(1).max(BULK_LIMITS.batchRecords),sources:z.array(sourceSchema).min(1).max(BULK_LIMITS.files)}).strict().superRefine((m,ctx)=>{
 if(new Set(m.sources.map(s=>s.file)).size!==m.sources.length||m.sources.reduce((n,s)=>n+s.bytes,0)>BULK_LIMITS.totalBytes)ctx.addIssue({code:'custom',message:'Source set budget/identity'});
});
const positionSchema=z.object({source:integer.max(BULK_LIMITS.files),offset:integer.max(BULK_LIMITS.fileBytes),line:integer.min(1).max(BULK_LIMITS.fileBytes+1)}).strict();
const reportSchema=z.object({input:integer.max(REPLAY_LIMIT),foreign:integer,legacy:integer,weak:integer,duplicates:integer,invalid:z.literal(0),conflicts:z.literal(0),accepted:integer.max(REPLAY_LIMIT),actors:integer.max(1),stages:z.array(integer).length(3)}).strict();
const compatibility={replayVersion:REPLAY_VERSION,rewardVersion:REWARD_VERSION,featureVersion:FEATURE_VERSION,scenarioSignature:OUTCOME_SCENARIO_SIGNATURE};
const compatibilitySchema=z.object({replayVersion:z.literal(REPLAY_VERSION),rewardVersion:z.literal(REWARD_VERSION),featureVersion:z.literal(FEATURE_VERSION),scenarioSignature:z.literal(OUTCOME_SCENARIO_SIGNATURE)}).strict();
const headSchema=z.object({compatibility:compatibilitySchema,version:z.literal(1),kind:z.literal('local-bulk-replay-checkpoint-v1'),manifestSha256:sha,logicalJsonlSha256:sha,sequence:integer,position:positionSchema,report:reportSchema,ledgerSha256:sha,previous:sha.nullable(),complete:z.boolean(),artifactSha256:sha.nullable()}).strict();
const APP_ID=0x58364842,PRIVATE=resolve(replayRoot,'.sites-runtime/training');
export class BulkReplayError extends Error {constructor(code,location){super(code);this.code=code;this.location=location;}}
const fail=(code,location)=>{throw new BulkReplayError(code,location);};
const emptyReport=()=>({input:0,foreign:0,legacy:0,weak:0,duplicates:0,invalid:0,conflicts:0,accepted:0,actors:0,stages:[0,0,0]});
function regular(path){const s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink())fail('nonregular-file');return s;}
function privateDirectory(path,create){
 const out=resolve(path);if(out!==PRIVATE&&!out.startsWith(PRIVATE+sep))fail('private-path');
 // Check each parent before mkdir, including .sites-runtime. Never follow a redirected parent.
 let part=resolve(replayRoot);
 for(const name of relative(part,out).split(sep)){
  part=resolve(part,name);
  if(!existsSync(part)){if(!create)fail('checkpoint-missing');mkdirSync(part,{mode:0o700});}
  const s=lstatSync(part);if(!s.isDirectory()||s.isSymbolicLink()||realpathSync(part)!==part)fail('private-path');
 }
 return out;
}
function readRegular(path,limit){
 const s=regular(path);if(s.size>limit)fail('file-budget');
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{const raw=readFileSync(fd);if(raw.length>limit)fail('file-budget');return raw;}finally{closeSync(fd);}
}
export function loadBulkManifest(path,expectedSha256){
 if(!sha.safeParse(expectedSha256).success)fail('manifest-checksum-required');
 const full=resolve(path);if(realpathSync(dirname(full))!==dirname(full))fail('source-path');
 const raw=readRegular(full,BULK_LIMITS.manifestBytes);if(digest(raw)!==expectedSha256)fail('manifest-checksum');
 let manifest;try{manifest=bulkManifestSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)));}catch{fail('manifest-schema');}
 return {manifest,manifestSha256:expectedSha256,directory:dirname(full),path:full};
}
const stamp=s=>[s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');
function readPinned(source){
 const raw=Buffer.alloc(source.bytes);let at=0;
 while(at<raw.length){const n=readSync(source.fd,raw,at,raw.length-at,at);if(!n)fail('source-changed');at+=n;}
 if(digest(raw)!==source.sha256||stamp(fstatSync(source.fd,{bigint:true}))!==source.stamp)fail('source-checksum');
 return raw;
}
function sourceSet(input){
 const opened=[],virtual=createHash('sha256');
 try{
  for(const source of input.manifest.sources){
   const path=resolve(input.directory,source.file);
   if(!path.startsWith(input.directory+sep)||realpathSync(path)!==path)fail('source-path');
   const s=regular(path);if(s.size!==source.bytes)fail('source-size');
   const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK),state=fstatSync(fd,{bigint:true});
   const entry={...source,path,fd,stamp:stamp(state),dev:state.dev,ino:state.ino};opened.push(entry);if(Number(state.size)!==source.bytes)fail('source-size');
   const raw=readPinned(entry);virtual.update(raw);if(raw.length&&raw.at(-1)!==10)virtual.update('\n');
  }
  return {sources:opened,logicalJsonlSha256:virtual.digest('hex'),close(){for(const s of opened)closeSync(s.fd);}};
 }catch(error){for(const s of opened)closeSync(s.fd);throw error;}
}
function sourcesStable(set){
 for(const source of set.sources){
  if(stamp(fstatSync(source.fd,{bigint:true}))!==source.stamp)fail('source-changed');
  const s=lstatSync(source.path,{bigint:true});if(s.isSymbolicLink()||s.dev!==source.dev||s.ino!==source.ino)fail('source-changed');
 }
}
function ledgerDigest(db){
 const h=createHash('sha256');
 for(const row of db.prepare('SELECT id,strength FROM identities ORDER BY id COLLATE BINARY').iterate())h.update(JSON.stringify(row)+'\n');
 h.update('accepted\n');
 for(const row of db.prepare('SELECT id,sample,started,settled,stage,canonical FROM examples ORDER BY id COLLATE BINARY').iterate())h.update(JSON.stringify(row)+'\n');
 return h.digest('hex');
}
function saveHead(db,head){const raw=JSON.stringify(head),hash=digest(raw);db.prepare('INSERT OR REPLACE INTO metadata(id,payload,sha256) VALUES(1,?,?)').run(raw,hash);return hash;}
function validateHead(db,input){
 const stored=db.prepare('SELECT payload,sha256 FROM metadata WHERE id=1').get();if(!stored)fail('checkpoint-missing');
 let head;try{head=headSchema.parse(JSON.parse(stored.payload));}catch{fail('checkpoint-format');}
 if(digest(stored.payload)!==stored.sha256||head.manifestSha256!==input.manifestSha256||head.ledgerSha256!==ledgerDigest(db))fail('checkpoint-integrity');
 const p=head.position,n=input.manifest.sources.length,r=head.report;
 if(p.source>n||p.source===n&&(p.offset!==0||p.line!==1)||p.source<n&&p.offset>=input.manifest.sources[p.source].bytes&&p.offset!==0)fail('checkpoint-cursor');
 if(head.sequence===0&&(p.source!==0||p.offset!==0||p.line!==1||r.input!==0||head.previous!==null))fail('checkpoint-cursor');
 if(head.complete!==(p.source===n)||head.complete!==(head.artifactSha256!==null)||r.input!==r.accepted+r.foreign+r.legacy+r.weak+r.duplicates||r.actors!==(r.accepted?1:0)||r.stages.reduce((a,b)=>a+b,0)!==r.accepted)fail('checkpoint-counts');
 const count=db.prepare('SELECT count(*) n FROM examples').get().n,ids=db.prepare("SELECT count(*) n FROM identities WHERE strength='strong'").get().n;
 if(count!==r.accepted||ids!==count||db.prepare("SELECT count(*) n FROM examples e JOIN identities i ON i.id=e.id WHERE i.strength!='strong'").get().n)fail('checkpoint-counts');
 for(let stage=0;stage<3;stage++)if(db.prepare('SELECT count(*) n FROM examples WHERE stage=?').get(stage).n!==r.stages[stage])fail('checkpoint-counts');
 if(db.prepare("SELECT count(*) n FROM identities WHERE strength='unverified'").get().n>r.legacy+r.weak)fail('checkpoint-counts');
 const artifact=db.prepare('SELECT payload,sha256 FROM artifact WHERE id=1').get();
 if(head.complete){
  if(!artifact||artifact.sha256!==head.artifactSha256||digest(artifact.payload)!==artifact.sha256)fail('checkpoint-artifact');
  let a;try{a=JSON.parse(artifact.payload);replayArtifactSchema.parse(a.artifact);}catch{fail('checkpoint-artifact');}
  if(a.artifact.source.sha256!==head.logicalJsonlSha256||a.bulkSource.manifestSha256!==input.manifestSha256||JSON.stringify(a.artifact.report)!==JSON.stringify(r))fail('checkpoint-artifact');
 }else if(artifact)fail('checkpoint-artifact');
 return {head,sha256:stored.sha256};
}
function openJob(input,job,set,create){
 const path=resolve(job);if(path===PRIVATE||!path.startsWith(PRIVATE+sep))fail('private-path');
 privateDirectory(path,create);const marker=resolve(path,'job.json'),file=resolve(path,'state.sqlite');
 const identity={compatibility,version:1,kind:'local-bulk-replay-job-v1',manifestSha256:input.manifestSha256};
 if(!existsSync(marker)){
  if(!create||readdirSync(path).length)fail('checkpoint-format');
  const fd=openSync(marker,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try{writeFileSync(fd,JSON.stringify(identity)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
 }else if(readRegular(marker,4096).toString('utf8')!==JSON.stringify(identity)+'\n')fail('checkpoint-manifest');
 for(const suffix of ['','-journal','-wal','-shm'])if(existsSync(file+suffix)){
  const s=regular(file+suffix);if(s.nlink!==1)fail('checkpoint-path');
  if(set?.sources.some(source=>source.dev===BigInt(s.dev)&&source.ino===BigInt(s.ino)))fail('checkpoint-source-alias');
 }
 if(!existsSync(file)){
  if(!create)fail('checkpoint-missing');const fd=openSync(file,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY,0o600);closeSync(fd);
 }
 // Inspect unknown files read-only before any PRAGMA capable of changing a database.
 const fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW),header=Buffer.alloc(100);let headerBytes;
 try{headerBytes=readSync(fd,header,0,100,0);}finally{closeSync(fd);}
 const owned=headerBytes===100&&header.subarray(0,16).toString()==='SQLite format 3\0'&&header.readUInt32BE(68)===APP_ID;
 const inspect=new DatabaseSync(file,{readOnly:!create||!owned});let app,tables;
 try{app=inspect.prepare('PRAGMA application_id').get().application_id;tables=inspect.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();}finally{inspect.close();}
 if(app!==APP_ID&&(app!==0||tables.length||!create))fail('checkpoint-format');
 const db=new DatabaseSync(file,{readOnly:!create});
 try{
  if(create){db.exec('PRAGMA busy_timeout=0; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;');}
  if(app===0){
   db.exec(`BEGIN IMMEDIATE; PRAGMA application_id=${APP_ID}; PRAGMA user_version=1;
    CREATE TABLE metadata(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL,sha256 TEXT NOT NULL);
    CREATE TABLE identities(id TEXT PRIMARY KEY,strength TEXT NOT NULL CHECK(strength IN ('strong','unverified')));
    CREATE TABLE examples(id TEXT PRIMARY KEY REFERENCES identities(id),sample INTEGER NOT NULL UNIQUE,started REAL NOT NULL,settled REAL NOT NULL,stage INTEGER NOT NULL CHECK(stage BETWEEN 0 AND 2),canonical TEXT NOT NULL);
    CREATE TABLE artifact(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL,sha256 TEXT NOT NULL);`);
   saveHead(db,{compatibility,version:1,kind:'local-bulk-replay-checkpoint-v1',manifestSha256:input.manifestSha256,logicalJsonlSha256:set.logicalJsonlSha256,sequence:0,position:{source:0,offset:0,line:1},report:emptyReport(),ledgerSha256:ledgerDigest(db),previous:null,complete:false,artifactSha256:null});db.exec('COMMIT');
  }
  if(db.prepare('PRAGMA user_version').get().user_version!==1||db.prepare('PRAGMA quick_check').get().quick_check!=='ok')fail('checkpoint-format');
  return db;
 }catch(error){try{db.exec('ROLLBACK');}catch{}db.close();throw error;}
}
function batchFrom(raw,start,index,manifest){
 if(start.offset>raw.length||start.offset&&raw[start.offset-1]!==10)fail('checkpoint-cursor');
 let offset=start.offset,line=start.line,physical=0;const rows=[];
 while(offset<raw.length){
  const nl=raw.indexOf(10,offset),end=nl===-1?raw.length:nl+1;
  if(end-offset>BULK_LIMITS.lineBytes)fail('line-budget',{source:index+1,line});
  if(physical&&end-start.offset>BULK_LIMITS.batchBytes)break;
  let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw.subarray(offset,nl===-1?end:nl));}catch{fail('invalid-utf8',{source:index+1,line});}
  if(text.trim()){
   let value;try{value=JSON.parse(text);}catch{fail('invalid-jsonl',{source:index+1,line});}rows.push({value,line});
  }
  offset=end;line++;physical++;
  if(rows.length>=manifest.batchRecords||offset-start.offset>=BULK_LIMITS.batchBytes||physical>=BULK_LIMITS.batchLines)break;
 }
 return {rows,position:offset===raw.length?{source:index+1,offset:0,line:1}:{source:index,offset,line}};
}
function admit(db,value,scope,report){
 if(++report.input>REPLAY_LIMIT)fail('record-budget');
 const one=new ReplayCorpus(scope);one.add(value);const result=one.finish(),r=result.report;
 if(r.foreign){report.foreign++;return;}
 if(r.invalid||r.conflicts)fail('invalid-record');
 const id=value&&typeof value==='object'&&typeof value.id==='string'?value.id:null;
 const known=id?db.prepare('SELECT strength FROM identities WHERE id=?').get(id):null;
 if(r.legacy||r.weak){
  if(known?.strength==='strong')fail('identity-conflict');
  if(id&&!known)db.prepare("INSERT INTO identities(id,strength) VALUES(?,'unverified')").run(id);
  report[r.legacy?'legacy':'weak']++;return;
 }
 const e=result.examples[0];if(!e)fail('invalid-record');
 if(known?.strength==='unverified')fail('identity-conflict');
 const old=db.prepare('SELECT canonical FROM examples WHERE id=?').get(e.id);
 if(old){if(old.canonical!==e.canonical)fail('identity-conflict');report.duplicates++;return;}
 if(db.prepare('SELECT id FROM examples WHERE sample=?').get(e.sample))fail('sample-conflict');
 const before=db.prepare('SELECT started,settled FROM examples WHERE sample<? ORDER BY sample DESC LIMIT 1').get(e.sample);
 const after=db.prepare('SELECT started,settled FROM examples WHERE sample>? ORDER BY sample LIMIT 1').get(e.sample);
 if(before&&(e.startedSimMs<before.started||e.settledSimMs<before.settled)||after&&(e.startedSimMs>after.started||e.settledSimMs>after.settled))fail('temporal-conflict');
 db.prepare("INSERT INTO identities(id,strength) VALUES(?,'strong')").run(e.id);
 const stage=replayLevel(e.context);db.prepare('INSERT INTO examples(id,sample,started,settled,stage,canonical) VALUES(?,?,?,?,?,?)').run(e.id,e.sample,e.startedSimMs,e.settledSimMs,stage,e.canonical);
 report.accepted++;report.actors=1;report.stages[stage]++;
}
function fitFinal(db,input,head){
 const builder=new ReplayCorpus({kind:'actor',actorId:input.manifest.actorId});
 for(const row of db.prepare('SELECT canonical FROM examples').iterate()){
  // Canonical evidence deliberately omits freeform source fields; restore only the audited model label.
  const e=JSON.parse(row.canonical);builder.add({id:e.id,actorId:e.actorId,scenarioId:e.scenarioId,at:e.at,reward:e.reward,context:e.context,rewardEvidence:e.evidence,source:'simulation',model:'disjoint-linucb-v1'});
 }
 const corpus=builder.finish();if(corpus.report.invalid||corpus.report.conflicts||corpus.report.accepted!==head.report.accepted)fail('checkpoint-corpus');
 const artifact=fitReplay({...corpus,report:head.report},input.manifest.order,{kind:'local-owner-jsonl',sha256:head.logicalJsonlSha256,acceptedDigest:corpusDigest(corpus)},null);
 const payload={kind:'actor-scoped-bulk-replay-v1',artifact,bulkSource:{kind:'local-owner-replay-set-v1',manifestSha256:input.manifestSha256,logicalJsonlSha256:head.logicalJsonlSha256,files:input.manifest.sources.map(s=>({sha256:s.sha256,bytes:s.bytes}))},productionAccess:false,trainsRuntimePolicy:false};
 const raw=JSON.stringify(payload),hash=digest(raw);db.prepare('INSERT INTO artifact(id,payload,sha256) VALUES(1,?,?)').run(raw,hash);return hash;
}
function exportExclusive(output,raw){
 const temp=resolve(dirname(output),`.bulk-export-${randomUUID()}.tmp`);let fd;
 try{
  fd=openSync(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  writeFileSync(fd,raw);fsyncSync(fd);closeSync(fd);fd=undefined;
  // Same-directory hard link publishes a complete file and fails atomically if out exists.
  linkSync(temp,output);
 }finally{if(fd!==undefined)closeSync(fd);if(existsSync(temp))unlinkSync(temp);}
}
function summary(state,verified){return {kind:'local-bulk-replay-progress-v1',checkpointSha256:state.sha256,committedBatches:state.head.sequence,cursor:state.head.position,report:state.head.report,complete:state.head.complete,artifactSha256:state.head.artifactSha256,sourcesVerified:verified,productionAccess:false,trainsRuntimePolicy:false};}
/** Every accepted batch commits independently; callbacks run only after COMMIT. */
export function bulkReplay(options,hooks={}){
 const {manifestPath,expectedManifestSha256,job,action='run',expectedCheckpoint,maxBatches=1,out}=options;
 if(!['run','status','export'].includes(action)||!Number.isSafeInteger(maxBatches)||maxBatches<1||maxBatches>BULK_LIMITS.batches)fail('arguments');
 if(action!=='status'&&!(sha.safeParse(expectedCheckpoint).success||action==='run'&&expectedCheckpoint==='new'))fail('checkpoint-required');
 const input=loadBulkManifest(manifestPath,expectedManifestSha256);let set,db;
 try{
  if(action!=='status')set=sourceSet(input);
  db=openJob(input,job,set,action==='run');
  if(action==='status'){
   db.exec('BEGIN');const state=validateHead(db,input);db.exec('COMMIT');return summary(state,false);
  }
  if(action==='export'){
   db.exec('BEGIN');const state=validateHead(db,input);
   if(state.sha256!==expectedCheckpoint)fail('checkpoint-stale');if(!state.head.complete)fail('checkpoint-incomplete');
   if(state.head.logicalJsonlSha256!==set.logicalJsonlSha256)fail('checkpoint-source');
   if(typeof out!=='string'||!out.endsWith('.json'))fail('private-path');
   const output=resolve(out);privateDirectory(dirname(output),true);
   const row=db.prepare('SELECT payload,sha256 FROM artifact WHERE id=1').get();sourcesStable(set);
   exportExclusive(output,JSON.stringify({...JSON.parse(row.payload),sha256:row.sha256},null,2)+'\n');db.exec('COMMIT');return {...summary(state,true),exported:true};
  }
  let expected=expectedCheckpoint,last,cached;
  for(let batch=0;batch<maxBatches;batch++){
   db.exec('BEGIN IMMEDIATE');
   const current=validateHead(db,input);
   if(expected==='new'?current.head.sequence!==0:current.sha256!==expected)fail('checkpoint-stale');
   if(current.head.logicalJsonlSha256!==set.logicalJsonlSha256)fail('checkpoint-source');
   if(current.head.complete){db.exec('COMMIT');last=summary(current,true);if(batch===0)hooks.onCommit?.(last);break;}
   const index=current.head.position.source;
   if(!cached||cached.index!==index)cached={index,raw:readPinned(set.sources[index])};
   const next=batchFrom(cached.raw,current.head.position,index,input.manifest),head=structuredClone(current.head);
   for(const row of next.rows){
    try{admit(db,row.value,{kind:'actor',actorId:input.manifest.actorId},head.report);}
    catch(error){if(error instanceof BulkReplayError)error.location??={source:index+1,line:row.line};throw error;}
   }
   head.sequence++;head.position=next.position;head.previous=current.sha256;head.complete=head.position.source===input.manifest.sources.length;
   if(head.complete)head.artifactSha256=fitFinal(db,input,head);
   head.ledgerSha256=ledgerDigest(db);const hash=saveHead(db,head);
   hooks.beforeCommit?.();sourcesStable(set);db.exec('COMMIT');
   expected=hash;last=summary({head,sha256:hash},true);hooks.onCommit?.(last);if(head.complete)break;
  }
  return last;
 }catch(error){try{db?.exec('ROLLBACK');}catch{}
  if(error instanceof BulkReplayError)throw error;
  if(error?.errcode===5||error?.errcode===6)fail('checkpoint-busy');
  if(error?.code==='EEXIST')fail('output-exists');
  if(error?.message?.startsWith('No compatible replay'))fail('no-compatible-records');
  fail('local-job-failed');
 }finally{db?.close();set?.close();}
}
