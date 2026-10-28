import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,statSync,symlinkSync,linkSync,readdirSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {ReplayCorpus,replayExperience,fitReplay} from '../lib/living/outcome-replay.ts';
import {runReplayRollout} from '../lib/living/replay-harness.ts';
import {bulkReplay,bulkManifestSchema,BULK_LIMITS} from './bulk-replay.mjs';
import {digest,corpusDigest} from './replay-files.mjs';
const temp=mkdtempSync(join(tmpdir(),'h6b-test-')),privateRoot=resolve('.sites-runtime/training');mkdirSync(privateRoot,{recursive:true});
const privateTemp=mkdtempSync(join(privateRoot,'h6b-test-'));
const all=[];runReplayRollout({variant:'personal-v1',profile:'cold-stress-v1',seeds:[11,37],agents:2,days:4,shiftDay:2},undefined,(_s,o)=>all.push(replayExperience(o)));
const actor=all[0].actorId,own=all.filter(r=>r.actorId===actor),scope={kind:'actor',actorId:actor};
const line=r=>JSON.stringify(r),virtual=parts=>Buffer.concat(parts.flatMap(raw=>raw.length&&raw.at(-1)!==10?[raw,Buffer.from('\n')]:[raw]));
let n=0;
function fixture(parts,batchRecords=2,order='curriculum'){
 const directory=join(temp,String(n++));mkdirSync(directory);const raws=parts.map(p=>Buffer.isBuffer(p)?p:Buffer.from(p));
 const sources=raws.map((raw,i)=>{const file=`page-${i}.jsonl`;writeFileSync(join(directory,file),raw);return {file,sha256:digest(raw),bytes:raw.length};});
 const manifest={version:1,kind:'local-owner-replay-set-v1',actorId:actor,order,batchRecords,sources};
 const manifestPath=join(directory,'source.json');writeFileSync(manifestPath,JSON.stringify(manifest));
 const options={manifestPath,expectedManifestSha256:digest(readFileSync(manifestPath)),job:join(privateTemp,`job-${n}`),expectedCheckpoint:'new',maxBatches:20};
 return {options,manifest,raws,directory};
}
const status=f=>bulkReplay({...f.options,action:'status',expectedCheckpoint:undefined});
const exported=(f,head,name=`model-${n}.json`)=>{
 const out=join(privateTemp,name),result=bulkReplay({...f.options,action:'export',expectedCheckpoint:head,out});assert(result.exported);return JSON.parse(readFileSync(out));
};
function oracle(raws,order='curriculum'){const builder=new ReplayCorpus(scope);for(const row of virtual(raws).toString('utf8').split('\n'))if(row.trim())builder.add(JSON.parse(row));const corpus=builder.finish();return fitReplay(corpus,order,{kind:'local-owner-jsonl',sha256:digest(virtual(raws)),acceptedDigest:corpusDigest(corpus)},null);}
try {
 const legacy={...own[4]};delete legacy.rewardEvidence;
 const foreign={actorId:'foreign-private-actor',id:'FOREIGN_PRIVATE_SHOULD_NOT_PERSIST',privateMemory:'FOREIGN_PRIVATE_SHOULD_NOT_PERSIST'};
 const parts=[line(own[2])+'\r\n\n'+line(foreign)+'\r\n',line(own[0])+'\n'+line(own[1])+'\n'+line(own[2]),'',line(legacy)+'\n'+line(own[3])+'\n'];
 const f=fixture(parts);let current=bulkReplay({...f.options,maxBatches:1});assert(!current.complete);assert.equal(current.report.input,2);assert.equal(current.report.foreign,1);
 assert(!existsSync(join(f.options.job,'artifact.json')));assert.equal(readFileSync(join(f.options.job,'state.sqlite')).includes(Buffer.from('FOREIGN_PRIVATE_SHOULD_NOT_PERSIST')),false);
 const firstBytes=readFileSync(join(f.options.job,'state.sqlite'));assert.throws(()=>bulkReplay({...f.options,expectedCheckpoint:'0'.repeat(64)}),/checkpoint-stale/);assert.deepEqual(readFileSync(join(f.options.job,'state.sqlite')),firstBytes);
 assert.throws(()=>bulkReplay({...f.options,action:'export',expectedCheckpoint:current.checkpointSha256,out:join(privateTemp,'early.json')}),/checkpoint-incomplete/);
 current=bulkReplay({...f.options,expectedCheckpoint:current.checkpointSha256});assert(current.complete);assert.equal(current.report.duplicates,1);assert.equal(current.report.legacy,1);assert.equal(current.report.accepted,4);
 const model=exported(f,current.checkpointSha256);assert.deepEqual(model.artifact,oracle(f.raws),'Global final fit matches exact virtual single-file corpus, regardless of file/batch boundary');
 assert.deepEqual(bulkReplay({...f.options,expectedCheckpoint:current.checkpointSha256}),current,'A completed retry cannot add samples or refit');
 const beforeExport=readFileSync(join(f.options.job,'state.sqlite'));assert.throws(()=>bulkReplay({...f.options,action:'export',expectedCheckpoint:current.checkpointSha256,out:join(privateTemp,`model-${n}.json`)}),/output-exists/);assert.deepEqual(readFileSync(join(f.options.job,'state.sqlite')),beforeExport);
 // Same immutable manifest and different invocation boundaries produce the same final head/model bytes.
 const alternate={...f.options,job:join(privateTemp,'alternate')};let a=bulkReplay({...alternate,maxBatches:1});while(!a.complete)a=bulkReplay({...alternate,expectedCheckpoint:a.checkpointSha256,maxBatches:1});assert.equal(a.checkpointSha256,current.checkpointSha256);
 const getFailingBatch=(rows,code)=>{
  const x=fixture([line(own[0])+'\n',rows.join('\n')+'\n'],10);const one=bulkReplay({...x.options,maxBatches:1}),bytes=readFileSync(join(x.options.job,'state.sqlite'));
  assert.throws(()=>bulkReplay({...x.options,expectedCheckpoint:one.checkpointSha256}),new RegExp(code));assert.deepEqual(status(x).report,one.report);assert.equal(status(x).checkpointSha256,one.checkpointSha256);assert.deepEqual(readFileSync(join(x.options.job,'state.sqlite')),bytes);return x;
 };
 const collision=structuredClone(own[1]);collision.id=own[0].id;collision.rewardEvidence.identity.experienceId=collision.id;
 getFailingBatch([line(own[1]),line(collision)],'identity-conflict');
 const alias=structuredClone(own[0]);alias.id+='-alias';alias.rewardEvidence.identity.experienceId=alias.id;getFailingBatch([line(own[1]),line(alias)],'sample-conflict');
 getFailingBatch([line(own[1]),'{"PRIVATE_BROKEN_SECRET":invalid}'],'invalid-jsonl');
 const bad=structuredClone(own[1]);bad.reward+=.1;getFailingBatch([line(own[1]),line(bad)],'invalid-record');
 const downgrade=structuredClone(own[0]);delete downgrade.rewardEvidence;getFailingBatch([line(downgrade)],'identity-conflict');
 const reverse=fixture([line(downgrade)+'\n',line(own[0])+'\n'],10),r=bulkReplay({...reverse.options,maxBatches:1});assert.throws(()=>bulkReplay({...reverse.options,expectedCheckpoint:r.checkpointSha256}),/identity-conflict/);
 const fork=structuredClone(own[2]);fork.rewardEvidence.plan.settledSimMs=1e9;getFailingBatch([line(fork),line(own[3])],'temporal-conflict');
 // Fault injection after all SQL writes (including final artifact), before COMMIT.
 const fault=fixture([line(own[0])+'\n',line(own[1])+'\n']);const prior=bulkReplay({...fault.options,maxBatches:1});
 assert.throws(()=>bulkReplay({...fault.options,expectedCheckpoint:prior.checkpointSha256},{beforeCommit(){throw Error('injected');}}),/local-job-failed/);assert.equal(status(fault).checkpointSha256,prior.checkpointSha256);assert.equal(status(fault).complete,false);
 assert(bulkReplay({...fault.options,expectedCheckpoint:prior.checkpointSha256}).complete);
 // A second process cannot write while the first holds its batch transaction.
 const concurrent=fixture([line(own[0])+'\n',line(own[1])+'\n']);const base=bulkReplay({...concurrent.options,maxBatches:1});
 let contender;
 const done=bulkReplay({...concurrent.options,expectedCheckpoint:base.checkpointSha256},{beforeCommit(){contender=spawnSync(process.execPath,['scripts/replay-bulk.mjs',`--manifest=${concurrent.options.manifestPath}`,`--expected-manifest-sha256=${concurrent.options.expectedManifestSha256}`,`--job=${concurrent.options.job}`,`--expected-checkpoint=${base.checkpointSha256}`],{encoding:'utf8'});}});
 assert.equal(contender.status,1);assert.match(contender.stderr,/checkpoint-busy/);assert.equal(done.report.accepted,2);
 // Source/manifest tamper preserves the checkpoint. Status can inspect it without re-reading sources.
 const changed=fixture([line(own[0])+'\n',line(own[1])+'\n']);const original=bulkReplay({...changed.options,maxBatches:1});writeFileSync(join(changed.directory,'page-1.jsonl'),'{}\n');
 assert.throws(()=>bulkReplay({...changed.options,expectedCheckpoint:original.checkpointSha256}),/source-size|source-checksum/);assert.equal(status(changed).checkpointSha256,original.checkpointSha256);
 assert.throws(()=>bulkReplay({...changed.options,expectedManifestSha256:'0'.repeat(64),expectedCheckpoint:original.checkpointSha256}),/manifest-checksum/);
 const corrupt=fixture([line(own[0])+'\n',line(own[1])+'\n']);const good=bulkReplay({...corrupt.options,maxBatches:1});const db=new DatabaseSync(join(corrupt.options.job,'state.sqlite'));db.exec("UPDATE examples SET canonical='{}'");db.close();assert.throws(()=>bulkReplay({...corrupt.options,expectedCheckpoint:good.checkpointSha256}),/checkpoint-integrity/);
 for(const edit of [m=>m.sources[0].file='../page.jsonl',m=>m.sources[0].file='/tmp/page.jsonl',m=>m.sources[0].file='https://example.test/x.jsonl',m=>m.sources.push(m.sources[0]),m=>m.batchRecords=5001,m=>m.sources[0].bytes=BULK_LIMITS.fileBytes+1,m=>m.extra=true]){const copy=structuredClone(f.manifest);edit(copy);assert.equal(bulkManifestSchema.safeParse(copy).success,false);}
 const linked=fixture([line(own[0])+'\n']);const path=join(linked.directory,'page-0.jsonl');rmSync(path);symlinkSync(join(f.directory,'page-0.jsonl'),path);assert.throws(()=>bulkReplay(linked.options),/source-path/);assert(!existsSync(linked.options.job));
 const outside=join(temp,'outside');mkdirSync(outside);const redirect=join(privateTemp,'redirect');symlinkSync(outside,redirect);assert.throws(()=>bulkReplay({...f.options,job:join(redirect,'nested')}),/private-path/);assert.deepEqual(readdirSync(outside),[]);
 assert.throws(()=>bulkReplay({...f.options,job:join(temp,'not-private')}),/private-path/);
 // Real SIGKILL before COMMIT leaves a hot journal; normal run recovery keeps the old cursor.
 const crash=fixture([line(own[0])+'\n',line(own[1])+'\n']);const checkpoint=bulkReplay({...crash.options,maxBatches:1});
 const crashOptions={...crash.options,expectedCheckpoint:checkpoint.checkpointSha256,maxBatches:1};
 const script=`import{bulkReplay}from${JSON.stringify(new URL('./bulk-replay.mjs',import.meta.url).href)};bulkReplay(${JSON.stringify(crashOptions)},{beforeCommit(){process.kill(process.pid,'SIGKILL')}});`;
 const killed=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8'});assert.equal(killed.signal,'SIGKILL',killed.stderr);
 assert.throws(()=>bulkReplay({...crashOptions,expectedCheckpoint:'0'.repeat(64)}),/checkpoint-stale/);assert.equal(status(crash).checkpointSha256,checkpoint.checkpointSha256);
 const recovered=bulkReplay(crashOptions);assert(recovered.complete);assert.equal(recovered.report.accepted,2);
 // Prefixes committed earlier in one invocation remain inspectable after a later batch fails.
 const partial=fixture([line(own[0])+'\n',line(own[1])+'\n','{broken}\n']);const commits=[];
 assert.throws(()=>bulkReplay(partial.options,{onCommit:r=>commits.push(r)}),/invalid-jsonl/);assert.equal(commits.length,2);assert.equal(status(partial).checkpointSha256,commits.at(-1).checkpointSha256);assert.equal(status(partial).report.accepted,2);assert(!status(partial).complete);
 // Global record budget includes foreign rows, not just accepted examples.
 const budget=fixture(['{"actorId":"other"}\n'.repeat(99999),line(own[0])+'\n','{"actorId":"other"}\n'],5000);
 const almost=bulkReplay(budget.options);assert.equal(almost.report.input,99999);assert.equal(almost.report.accepted,0);
 const progress=[];assert.throws(()=>bulkReplay({...budget.options,expectedCheckpoint:almost.checkpointSha256,maxBatches:2},{onCommit:r=>progress.push(r)}),/record-budget/);
 assert.equal(progress.length,1);assert.equal(status(budget).report.input,100000);assert.equal(status(budget).checkpointSha256,progress[0].checkpointSha256);assert(!status(budget).complete);
 // Blank lines/bytes also bound work even when no replayable record occurs.
 const blank=fixture([' '.repeat(16383)+'\n'],1);const blankRaw=Buffer.concat([Buffer.from((' '.repeat(16383)+'\n').repeat(513)),Buffer.from(line(own[0])+'\n')]);
 writeFileSync(join(blank.directory,'page-0.jsonl'),blankRaw);blank.manifest.sources[0]={file:'page-0.jsonl',sha256:digest(blankRaw),bytes:blankRaw.length};writeFileSync(blank.options.manifestPath,JSON.stringify(blank.manifest));blank.options.expectedManifestSha256=digest(readFileSync(blank.options.manifestPath));
 let blankHead=bulkReplay({...blank.options,maxBatches:1});assert.equal(blankHead.cursor.offset,BULK_LIMITS.batchBytes);assert.equal(blankHead.report.input,0);blankHead=bulkReplay({...blank.options,expectedCheckpoint:blankHead.checkpointSha256});assert(blankHead.complete);assert.equal(blankHead.report.accepted,1);
 const lines=fixture(['\n'.repeat(10001)+line(own[0])+'\n'],5000),lineHead=bulkReplay({...lines.options,maxBatches:1});assert.equal(lineHead.cursor.line,10001);assert.equal(lineHead.report.input,0);
 for(const [raw,code] of [[Buffer.from([0xc0,0xaf,10]),'invalid-utf8'],[Buffer.from(' '.repeat(65536)+'\n'),'line-budget'],[Buffer.from('\ufeff'+line(own[0])+'\n'),'invalid-jsonl']]){
  const x=fixture([raw]);assert.throws(()=>bulkReplay(x.options),new RegExp(code));assert.equal(status(x).committedBatches,0);assert.equal(status(x).report.input,0);
 }
 const unicode=structuredClone(own[0]);unicode.id='H6b-漢-😀-é';unicode.rewardEvidence.identity.experienceId=unicode.id;unicode.privateMemory='LOCAL_EXTRA_TEXT_NOT_TO_STORE';
 const text=fixture([line(unicode)+'\r\n'],1,'chronological'),textHead=bulkReplay(text.options),textModel=exported(text,textHead.checkpointSha256,'unicode-model.json');assert.deepEqual(textModel.artifact,oracle(text.raws,'chronological'));assert(!readFileSync(join(text.options.job,'state.sqlite')).includes(Buffer.from('LOCAL_EXTRA_TEXT_NOT_TO_STORE')));
 for(const change of [m=>m.sources=Array.from({length:65},(_,i)=>({...m.sources[0],file:`p-${i}.jsonl`,bytes:0})),m=>m.sources=Array.from({length:9},(_,i)=>({...m.sources[0],file:`p-${i}.jsonl`,bytes:BULK_LIMITS.fileBytes}))]){const copy=structuredClone(f.manifest);change(copy);assert(!bulkManifestSchema.safeParse(copy).success);}
 const foreignDb=join(temp,'unrelated.sqlite');const unrelated=new DatabaseSync(foreignDb);unrelated.exec("CREATE TABLE worlds(id TEXT); INSERT INTO worlds VALUES('preserve')");unrelated.close();
 const wrongDb=fixture([line(own[0])+'\n',line(own[1])+'\n']),wrongHead=bulkReplay({...wrongDb.options,maxBatches:1});copyFileSync(foreignDb,join(wrongDb.options.job,'state.sqlite'));const unrelatedBytes=readFileSync(join(wrongDb.options.job,'state.sqlite'));
 assert.throws(()=>bulkReplay({...wrongDb.options,expectedCheckpoint:wrongHead.checkpointSha256}),/checkpoint-format/);assert.deepEqual(readFileSync(join(wrongDb.options.job,'state.sqlite')),unrelatedBytes);
 const hard=fixture([line(own[0])+'\n',line(own[1])+'\n']);const hardHead=bulkReplay({...hard.options,maxBatches:1});linkSync(join(hard.options.job,'state.sqlite'),join(privateTemp,'state-hardlink.sqlite'));assert.throws(()=>bulkReplay({...hard.options,expectedCheckpoint:hardHead.checkpointSha256}),/checkpoint-path/);
 assert.equal(statSync(join(f.options.job,'state.sqlite')).mode&0o777,0o600);
 const during=fixture([line(own[0])+'\n',line(own[1])+'\n']),duringHead=bulkReplay({...during.options,maxBatches:1});
 assert.throws(()=>bulkReplay({...during.options,expectedCheckpoint:duringHead.checkpointSha256},{beforeCommit(){writeFileSync(join(during.directory,'page-1.jsonl'),line(own[1])+' \n');}}),/source-changed/);assert.equal(status(during).checkpointSha256,duringHead.checkpointSha256);
 const cliPartial=fixture([line(own[0])+'\n',line(own[1])+'\n','{"PRIVATE_PARSE_TOKEN":notjson}\n']);
 const cliFailure=spawnSync(process.execPath,['scripts/replay-bulk.mjs',`--manifest=${cliPartial.options.manifestPath}`,`--expected-manifest-sha256=${cliPartial.options.expectedManifestSha256}`,`--job=${cliPartial.options.job}`,'--expected-checkpoint=new','--max-batches=3'],{encoding:'utf8'});
 assert.equal(cliFailure.status,1);const emitted=cliFailure.stdout.trim().split('\n').map(JSON.parse);assert.equal(emitted.length,2);assert.equal(status(cliPartial).checkpointSha256,emitted.at(-1).checkpointSha256);assert(!cliFailure.stderr.includes('PRIVATE_PARSE_TOKEN'));assert(!cliFailure.stderr.includes(actor));assert.match(cliFailure.stderr,/invalid-jsonl/);assert.match(cliFailure.stderr,/source 3, line 1/);
 assert(!readdirSync(privateTemp).some(x=>x.startsWith('.bulk-export-')),'Failed exports leave no partial/temp output');
 // A nontrivial accepted corpus spans 49 transactions and multiple resumes inside files.
 const many=[];runReplayRollout({variant:'personal-v1',profile:'cold-stress-v1',seeds:[11,37],agents:2,days:60,shiftDay:30},undefined,(_seed,o)=>{if(o.actorId===actor)many.push(replayExperience(o));});
 assert.equal(many.length,1440);const reversed=[...many].reverse(),partsMany=[];
 for(let i=0;i<reversed.length;i+=90)partsMany.push(reversed.slice(i,i+90).map(line).join('\n')+'\n');partsMany.push(reversed.slice(0,37).map(line).join('\n')+'\n');
 const large=fixture(partsMany,37);let largeHead=bulkReplay(large.options),resumed=0;assert(!largeHead.complete);assert(largeHead.cursor.offset>0);
 while(!largeHead.complete){assert(++resumed<10);largeHead=bulkReplay({...large.options,expectedCheckpoint:largeHead.checkpointSha256});}
 assert.equal(largeHead.report.accepted,1440);assert.equal(largeHead.report.duplicates,37);assert.equal(largeHead.committedBatches,49);assert.deepEqual(exported(large,largeHead.checkpointSha256,'many-model.json').artifact,oracle(large.raws));
 const cli=spawnSync(process.execPath,['scripts/replay-bulk.mjs',`--manifest=${f.options.manifestPath}`,`--expected-manifest-sha256=${f.options.expectedManifestSha256}`,`--job=${f.options.job}`,'--action=status'],{encoding:'utf8'});assert.equal(cli.status,0,cli.stderr);assert(!cli.stdout.includes(actor));assert(!cli.stdout.includes('FOREIGN_PRIVATE'));
 console.log(JSON.stringify({suite:'bulk-replay',singleFileEquivalent:true,globalOrderOnce:true,acceptedCorpusRecords:1440,acceptedCorpusBatches:49,midFileResume:true,actorIsolation:true,crossFileDedup:true,conflictsAndMalformedRollback:true,staleCursorCAS:true,concurrentWriterRejected:true,realSIGKILLRecovery:true,global100kBudget:true,blankLineAndByteBudgets:true,utf8AndUnicode:true,foreignDatabasePreserved:true,finalArtifactAtomic:true,sourceManifestAndCheckpointIntegrity:true,privatePaths:true,exclusiveExport:true,completedRetryIdempotent:true,productionAccess:false}));
}finally{rmSync(temp,{recursive:true,force:true});rmSync(privateTemp,{recursive:true,force:true});}
