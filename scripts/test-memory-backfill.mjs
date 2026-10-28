import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync,mkdtempSync,rmSync,existsSync,statSync,symlinkSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {sourceMemoryCandidates,reconcileMemoryCandidates,projectedMemoryRow} from '../lib/memory-backfill.ts';
import {runMemoryBackfill,memoryBackfillRequest} from '../lib/memory-backfill-store.ts';
import {eventMemories,outcomeMemory} from '../lib/memory-records.ts';
import {eventSchema} from '../lib/event-schema.ts';
import {runReplayRollout} from '../lib/living/replay-harness.ts';
import {replayExperience} from '../lib/living/outcome-replay.ts';
import {seed} from '../lib/world.ts';
import {memoryBackfillCommand} from './memory-backfill.mjs';
const at='2026-10-28T00:00:00.000Z';
const generated=[];runReplayRollout({variant:'personal-v1',profile:'cold-stress-v1',seeds:[11,37],agents:2,days:3,shiftDay:1},undefined,(_s,o)=>{if(generated.length<3)generated.push(replayExperience(o));});
const experience=structuredClone(generated[0]);experience.id='backfill-outcome';experience.actorId='an';experience.rewardEvidence.identity.experienceId=experience.id;experience.rewardEvidence.identity.actorId='an';
const event=(id='archived-event',who='an',text='Mình đã sắp xếp góc sách theo chủ đề.')=>eventSchema.parse({id,revision:3,source:'ai',title:'Góc sách',summary:'Sắp xếp góc sách trong mô phỏng.',dialogue:[{speaker:'an',text:'Mình cùng đọc nhé.'},{speaker:'binh',text:'Mình nghe bạn kể.'}],changes:[{id:who,memory:text,activity:'Ghi chú',location:'Thư viện',skillDelta:1}]});
const episodeRow=e=>({position:1,id:e.id,created_at:at,owner:e.source,data:JSON.stringify(e)});
const candidate=sourceMemoryCandidates('episodes',[episodeRow(event())],'an');assert.deepEqual(candidate.records,eventMemories(event(),at));assert.deepEqual(candidate.records[0].witnessedWith,['an']);
assert.equal(sourceMemoryCandidates('episodes',[episodeRow(event())],'binh').records.length,0,'A dialogue speaker is not the report recipient');
assert.equal(sourceMemoryCandidates('outcomes',[{position:1,id:'other',owner:'binh',created_at:at,data:'PRIVATE_BROKEN',bytes:1e9}],'an').counts.foreign,1,'Filter actor before audit/budget/storage');
const source={position:1,id:experience.id,created_at:experience.at,owner:'an',data:JSON.stringify(experience)};
const outcome=sourceMemoryCandidates('outcomes',[source],'an');assert.equal(outcome.records.length,1);assert.deepEqual(outcome.records[0],outcomeMemory(experience,`Kết quả kế hoạch mô phỏng ${experience.scenarioId}; phản hồi ${experience.reward.toFixed(2)}.`));
for(const edit of [r=>delete r.rewardEvidence,r=>r.rewardEvidence.plan.binding='legacy-start-time',r=>r.rewardEvidence.rewardVersion='future',r=>r.reward+=.1]){const r=structuredClone(experience);edit(r);assert.equal(sourceMemoryCandidates('outcomes',[{...source,data:JSON.stringify(r)}],'an').records.length,0);}
const ambiguous=event();ambiguous.changes.push({...ambiguous.changes[0]});assert.throws(()=>sourceMemoryCandidates('episodes',[episodeRow(ambiguous)],'an'),/ambiguous/);
const wrong=structuredClone(experience);wrong.actorId='binh';assert.throws(()=>sourceMemoryCandidates('outcomes',[{...source,data:JSON.stringify(wrong)}],'an'),/source-identity/);
const old={...projectedMemoryRow(candidate.records[0]),id:'legacy-custom',kind:'observation',text:'Giữ bản ghi gốc của chủ dự án.',witnessed_with:null};
let result=reconcileMemoryCandidates(candidate.records,[old],candidate.counts);assert.equal(result.missing.length,0);assert.equal(result.counts.legacyPreserved,1);assert.equal(result.counts.divergent,1);assert.equal(old.text,'Giữ bản ghi gốc của chủ dự án.');
assert.throws(()=>reconcileMemoryCandidates(candidate.records,[{...projectedMemoryRow(candidate.records[0]),person_id:'binh'}],candidate.counts),/memory-identity/);
const differentKind={...projectedMemoryRow(candidate.records[0]),id:'outcome:same-source',kind:'simulation-plan-outcome'};assert.equal(reconcileMemoryCandidates(candidate.records,[differentKind],candidate.counts).missing.length,1);
class D1Fixture {
 constructor(){this.sql=new DatabaseSync(':memory:');this.sql.exec('PRAGMA foreign_keys=ON');this.sql.exec('CREATE TABLE worlds(id TEXT PRIMARY KEY,revision INTEGER,data TEXT);CREATE TABLE episodes(id TEXT PRIMARY KEY,created_at TEXT,source TEXT,data TEXT);CREATE TABLE agent_experiences(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE,actor_id TEXT,created_at TEXT,data TEXT);CREATE TABLE memories(id TEXT PRIMARY KEY,person_id TEXT,event_id TEXT,text TEXT,kind TEXT,importance INTEGER,witnessed_with TEXT,created_at TEXT);CREATE TABLE learning_policies(actor_id TEXT PRIMARY KEY,data TEXT,updated_revision INTEGER,updated_at TEXT)');this.sql.exec(readFileSync('drizzle/0008_memory_backfill.sql','utf8'));this.sql.prepare("INSERT INTO worlds VALUES('home',7,?)").run(JSON.stringify({...structuredClone(seed),born:at,paused:true,living:{petOwners:{cun:'an'},learning:{an:{samples:42,memories:['Bản nhớ hiện tại không phải nguồn lịch sử']}}}}));this.sql.prepare("INSERT INTO learning_policies VALUES('an','posterior',7,?)").run(at);}
 prepare(sql,args=[]){return{sql,args,bind:(...x)=>this.prepare(sql,x),first:async()=>{const r=this.sql.prepare(sql).get(...args);return r?{...r}:null;},all:async()=>({results:this.sql.prepare(sql).all(...args).map(r=>({...r})),success:true,meta:{}}),run:async()=>{const r=this.sql.prepare(sql).run(...args);return{success:true,results:[],meta:{changes:Number(r.changes)}};}};}
 async batch(statements){if(/^(INSERT|UPDATE) INTO? memory_backfill_jobs|^UPDATE memory_backfill_jobs/.test(statements[0].sql)&&this.beforeWrite){const fn=this.beforeWrite;this.beforeWrite=null;fn();}this.sql.exec('BEGIN IMMEDIATE');try{const results=[];for(const st of statements){if(/^SELECT/.test(st.sql))results.push({success:true,results:this.sql.prepare(st.sql).all(...st.args).map(r=>({...r})),meta:{changes:0}});else{const r=this.sql.prepare(st.sql).run(...st.args);results.push({success:true,results:[],meta:{changes:Number(r.changes)}});}}this.sql.exec('COMMIT');return results;}catch(e){this.sql.exec('ROLLBACK');throw e;}}
 episode(e=event(),position){this.sql.prepare(`INSERT INTO episodes(${position?'rowid,':''}id,created_at,source,data) VALUES(${position?'?,':''}?,?,?,?)`).run(...(position?[position]:[]),e.id,at,e.source,JSON.stringify(e));}
 outcome(e=experience){this.sql.prepare('INSERT INTO agent_experiences(id,actor_id,created_at,data) VALUES(?,?,?,?)').run(e.id,e.actorId,e.at,JSON.stringify(e));}
 snapshot(){return JSON.stringify(['worlds','episodes','agent_experiences','memories','learning_policies','memory_backfill_jobs','memory_backfill_batches'].map(t=>this.sql.prepare(`SELECT * FROM ${t} ORDER BY 1`).all()));}
 close(){this.sql.close();}
}
const request=(jobId=randomUUID(),extra={})=>memoryBackfillRequest.parse({jobId,actorId:'an',limit:2,...extra});
async function preview(db,r){return runMemoryBackfill(db,{...r,action:'preview'});}
async function apply(db,r,p){return runMemoryBackfill(db,{...r,action:'apply',expectedCheckpoint:p.checkpoint,planSha256:p.planSha256});}
const db=new D1Fixture();
try{
 db.episode();db.episode(event('foreign','binh'));db.outcome();const legacy=structuredClone(experience);legacy.id='legacy-outcome';delete legacy.rewardEvidence;db.outcome(legacy);
 const r=request(),initial=db.snapshot(),p=await preview(db,r);assert.equal(db.snapshot(),initial,'Dry-run performs no bootstrap/checkpoint/memory writes');assert.equal(p.records.length,1);assert.equal(p.records[0].personId,'an');
 const first=await apply(db,r,p);assert.equal(first.duplicate,false);assert.equal(first.totals.inserted,1);const afterFirst=db.snapshot();assert.equal((await apply(db,r,p)).duplicate,true);assert.equal(db.snapshot(),afterFirst,'Lost-ACK retry is a true no-op');
 await assert.rejects(runMemoryBackfill(db,{...r,action:'apply',planSha256:'0'.repeat(64)}),/checkpoint-stale/);
 let head=first,steps=0;while(!head.complete){assert(++steps<10);const next={...r,expectedCheckpoint:head.checkpoint};const plan=await preview(db,next);head=await apply(db,next,plan);}
 const completeBefore=db.snapshot();await assert.rejects(runMemoryBackfill(db,{...r,action:'apply',expectedCheckpoint:head.checkpoint,planSha256:'a'.repeat(64)}),/job-complete/);assert.equal(db.snapshot(),completeBefore);
 assert.equal(head.totals.inserted,2);assert.equal(head.totals.unverified,1);assert.equal(db.sql.prepare('SELECT count(*) n FROM memories').get().n,2);assert.equal(JSON.parse(db.sql.prepare("SELECT data FROM worlds WHERE id='home'").get().data).living.learning.an.samples,42);
 const oldRows=db.sql.prepare('SELECT * FROM memories ORDER BY id').all(),newJob=request(),again=await preview(db,newJob);assert.equal(again.records.length,0);await apply(db,newJob,again);assert.deepEqual(db.sql.prepare('SELECT * FROM memories ORDER BY id').all(),oldRows);
 for(const mutation of ['source','memory','world','phantom']){
  const x=new D1Fixture();try{x.episode(event('one'),1);x.episode(event('three'),3);const q=request(),plan=await preview(x,q);
   x.beforeWrite=()=>{if(mutation==='source')x.sql.prepare('UPDATE episodes SET data=? WHERE id=?').run(JSON.stringify(event('one','an','Nguồn đã thay đổi.')),'one');if(mutation==='memory')x.sql.prepare('INSERT INTO memories VALUES(?,?,?,?,?,?,?,?)').run('external-memory','an','one','Bản ghi khác','event-report',3,'["an"]',at);if(mutation==='world')x.sql.exec("UPDATE worlds SET revision=revision+1");if(mutation==='phantom')x.episode(event('gap'),2);};
   await assert.rejects(apply(x,q,plan),/conflict/);assert.equal(x.sql.prepare('SELECT count(*) n FROM memory_backfill_jobs').get().n,0);assert.equal(x.sql.prepare('SELECT count(*) n FROM memory_backfill_batches').get().n,0);assert.equal(x.sql.prepare('SELECT count(*) n FROM memories').get().n,mutation==='memory'?1:0);
  }finally{x.close();}
 }
 for(const trigger of ['ignore','abort','world','existing']){
  const x=new D1Fixture();try{x.episode(event('one'));x.episode(event('two'));if(trigger==='existing')x.sql.prepare('INSERT INTO memories VALUES(?,?,?,?,?,?,?,?)').run('old','an','one','Giữ nguyên ghi chú này','observation',2,null,at);
   const body=trigger==='ignore'?"SELECT RAISE(IGNORE);":trigger==='abort'?"SELECT RAISE(ABORT,'injected');":trigger==='world'?"UPDATE worlds SET revision=revision+1;":"UPDATE memories SET text='changed' WHERE id='old';";
   x.sql.exec(`CREATE TRIGGER inject_${trigger} ${['ignore','abort'].includes(trigger)?'BEFORE':'AFTER'} INSERT ON memories BEGIN ${body} END`);
   const q=request(),plan=await preview(x,q),before=x.snapshot();await assert.rejects(apply(x,q,plan));assert.equal(x.snapshot(),before,`True rollback on ${trigger}, including silent dropped rows`);
  }finally{x.close();}
 }
 const race=new D1Fixture();try{race.episode();const q=request(),plan=await preview(race,q);const wave=await Promise.all([apply(race,q,plan),apply(race,q,plan)]);assert.equal(wave.filter(v=>!v.duplicate).length,1);assert.equal(race.sql.prepare('SELECT count(*) n FROM memories').get().n,1);assert.equal(race.sql.prepare('SELECT count(*) n FROM memory_backfill_batches').get().n,1);}finally{race.close();}
 const closed=new D1Fixture();try{closed.episode(event('first'));const q=request(),plan=await preview(closed,q);closed.beforeWrite=()=>closed.episode(event('later'));let h=await apply(closed,q,plan);while(!h.complete){const qr={...q,expectedCheckpoint:h.checkpoint};h=await apply(closed,qr,await preview(closed,qr));}assert.equal(closed.sql.prepare('SELECT count(*) n FROM memories').get().n,1,'Appends beyond frozen bounds need a new job');}finally{closed.close();}
 assert.throws(()=>sourceMemoryCandidates('episodes',[{...episodeRow(event()),data:'x'.repeat(65537)}],'an'),/source-budget/);
 assert.throws(()=>sourceMemoryCandidates('episodes',Array.from({length:32},()=>({...episodeRow(event()),data:' '.repeat(32768)})),'an'),/source-budget/);
 assert.throws(()=>reconcileMemoryCandidates(candidate.records,Array.from({length:257},(_,i)=>({...old,id:`old-${i}`})),candidate.counts),/target-budget/);
 const oversized=new D1Fixture();try{oversized.episode(event('one'));oversized.sql.prepare('INSERT INTO memories VALUES(?,?,?,?,?,?,?,?)').run('large','an','one','x'.repeat(8193),'observation',3,null,at);const before=oversized.snapshot();await assert.rejects(preview(oversized,request()),/target-budget/);assert.equal(oversized.snapshot(),before);}finally{oversized.close();}
 const tampered=new D1Fixture();try{tampered.episode();const q=request(),h=await apply(tampered,q,await preview(tampered,q));tampered.sql.prepare("UPDATE memory_backfill_batches SET data=json_set(data,'$.sourceDigest',?) WHERE job_id=?").run('0'.repeat(64),q.jobId);const before=tampered.snapshot();await assert.rejects(runMemoryBackfill(tampered,{...q,action:'status',expectedCheckpoint:h.checkpoint}),/checkpoint-receipt/);assert.equal(tampered.snapshot(),before);}finally{tampered.close();}
 const stableLegacy={...old,id:candidate.records[0].id};assert.equal(reconcileMemoryCandidates(candidate.records,[stableLegacy],candidate.counts).counts.legacyPreserved,1);
 const oldOutcome={...projectedMemoryRow(outcome.records[0]),text:'Giữ nguyên câu ghi nhận đã lưu từ trước.'};assert.equal(reconcileMemoryCandidates(outcome.records,[oldOutcome],outcome.counts).missing.length,0);
 const localRoot=resolve('.sites-runtime/training');mkdirSync(localRoot,{recursive:true});const privateDir=mkdtempSync(join(localRoot,'memory-client-'));
 try{
  db.episode(event('client-new'));
  const q=request(randomUUID(),{limit:32}),send=async(_url,options)=>Response.json(await runMemoryBackfill(db,memoryBackfillRequest.parse(JSON.parse(options.body))));
  const review=join(privateDir,'review.json');const reply=await memoryBackfillCommand({...q,origin:'http://127.0.0.1:5173',reviewOut:review},send);assert.equal(reply.mode,'dry-run');assert.equal(JSON.parse(readFileSync(review)).records.length,1);assert(!JSON.stringify(reply).includes('Mình đã'));assert.equal(statSync(review).mode&0o777,0o600);const bytes=readFileSync(review);await assert.rejects(memoryBackfillCommand({...q,reviewOut:review},send));assert.deepEqual(readFileSync(review),bytes);
  for(const origin of ['https://example.com','http://localhost.evil.test','file:///tmp/','http://user:pass@127.0.0.1','http://127.0.0.1/path'])await assert.rejects(memoryBackfillCommand({...q,origin},()=>{throw Error('must not send');}));
  await assert.rejects(memoryBackfillCommand({...q,action:'apply'},()=>{throw Error('must not send');}));
  for(const response of [new Response('<html>secret</html>'),Response.json({ok:true,mode:'applied',checkpoint:'new'}),Response.json({ok:true,mode:'dry-run',checkpoint:'new',planSha256:'a'.repeat(64),counts:{PRIVATE_SECRET:'leak'}})])await assert.rejects(memoryBackfillCommand(q,async()=>response));
  const foreignReply={...await preview(db,q),records:[{...candidate.records[0],personId:'binh'}]};await assert.rejects(memoryBackfillCommand(q,async()=>Response.json(foreignReply)),/foreign/);
  const outside=mkdtempSync('/tmp/memory-review-');try{const link=join(privateDir,'redirect');symlinkSync(outside,link);await assert.rejects(memoryBackfillCommand({...q,reviewOut:join(link,'sub','review.json')},send),/private-review-path/);assert.deepEqual(readdirSync(outside),[]);}finally{rmSync(outside,{recursive:true,force:true});}
  assert(!existsSync(join(privateDir,'.memory-review-temp')));
 }finally{rmSync(privateDir,{recursive:true,force:true});}
 console.log(JSON.stringify({suite:'memory-backfill',explicitRecipientOnly:true,verifiedOutcomeOnly:true,legacyNotUpgraded:true,existingRowsPreserved:true,dryRunZeroWrites:true,planAndCheckpointCAS:true,sourceMemoryWorldAndPhantomGuards:true,concurrentSamePlanIdempotent:true,atomicCursorMemoryReceipt:true,receiptIntegrityChecked:true,silentIgnoreRollback:true,frozenBounds:true,privateLoopbackClient:true,worldHistoryAndPoliciesPreserved:true,productionAccess:false}));
}finally{db.close();}
