import {rememberDialogue,hasDialogue} from "../lib/living/dialogue-pool.ts";
import {retrievePromptMemories} from "../lib/living/prompt-memories.ts";
import {GARDEN_PLOTS} from "../lib/city/garden-plots.ts";
import { seed } from "../lib/world.ts";
import { initializeLiving, turnId, localDate, planLivingTurn } from "../lib/living/engine.ts";
import { scheduleResidentSocial } from "../lib/living/social-scheduler.ts";
import {auditExperience} from "../lib/living/experience-audit.ts";
import {planKey} from "../lib/living/plan-identity.ts";
import {ReplayCorpus,fitReplay} from "../lib/living/outcome-replay.ts";
import {createHash} from "node:crypto";
/** In-process local worker integration; no hosting, account or production DB access. */
import assert from 'node:assert/strict';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import { realpathSync, readdirSync, mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import {bulkReplay} from './bulk-replay.mjs';
import {digest,corpusDigest} from './replay-files.mjs';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json')));
const {Miniflare}=require('miniflare');
// A fixed daytime clock prevents five-minute slot rollovers and night-only
// behavior from changing what this isolated HTTP fixture actually exercises.
const NativeDate=Date,fixedNow=Date.parse('2026-10-25T02:00:00.000Z');
globalThis.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:[fixedNow]));}static now(){return fixedNow;}};
const moduleFiles=readdirSync("dist/server",{recursive:true}).filter(p=>typeof p==="string"&&p.endsWith(".js")&&p!=="index.js");
const modules=[{type:'ESModule',path:resolve('dist/server/__fixture_entry.mjs'),contents:`import worker from './index.js';const RealDate=Date;let fixtureNow=${fixedNow};globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[fixtureNow]))}static now(){return fixtureNow}};export default {fetch(request,env,ctx){const url=new URL(request.url);if(url.pathname==='/__fixture/time'){fixtureNow=Number(url.searchParams.get('now'));return Response.json({ok:true})}return worker.fetch(request,env,ctx)}};`},...["index.js",...moduleFiles].map(p=>({type:"ESModule",path:resolve("dist/server",p)}))];
const options={modules,modulesRoot:resolve("dist/server"),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{XOM_LOCAL_ADMIN:'false'},inspectorPort:0};
const mf=new Miniflare(options);
try{
 const url='http://localhost/api/diagnostics';
 assert.equal((await mf.dispatchFetch('http://localhost/api/living/pets',{method:'POST',body:'{}'})).status,403,'Pet ownership mutations require the owner');
 assert.equal((await mf.dispatchFetch('http://localhost/api/living/flora',{method:'POST',body:'{}'})).status,403,'Garden care requires the owner');
 assert.equal((await mf.dispatchFetch('http://localhost/api/living/pulse',{method:'POST',body:'{}'})).status,403,'Pulse requires the owner');
 assert.equal((await mf.dispatchFetch('http://localhost/api/living/memories/backfill',{method:'POST',body:'{}'})).status,403,'Backfill requires owner');
 assert.equal((await mf.dispatchFetch(url)).status,403,'non-owner GET denied');
 assert.equal((await mf.dispatchFetch('http://localhost/api/living/memories?actor=an')).status,403,'Structured memories require owner access');
 const deniedContext=await retrievePromptMemories('http://localhost',['an'],'góc sách',(url,init)=>mf.dispatchFetch(String(url),init));
 assert.equal(deniedContext.byActor.an.status,'denied');assert.deepEqual(deniedContext.byActor.an.records,[]);
 assert.equal((await mf.dispatchFetch(url,{method:'POST',body:'{}'})).status,403,'non-owner POST denied');
 await mf.setOptions({...options,bindings:{XOM_LOCAL_ADMIN:'true'}});
 const db=await mf.getD1Database('DB');
 await db.prepare('CREATE TABLE memories(id TEXT PRIMARY KEY,person_id TEXT,event_id TEXT,text TEXT,kind TEXT,importance INTEGER,witnessed_with TEXT,created_at TEXT)').run();
 const migrations=readMigrationFiles({migrationsFolder:'drizzle'}).filter(m=>m.sql.some(sql=>sql.includes('client_logs')||sql.includes('learning_policies')));
 for(const migration of migrations)for(const sql of migration.sql)await db.prepare(sql).run();
 assert(await db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='client_logs_created_at'").first(),'Drizzle statement splitting must create the telemetry index');
 await db.prepare('CREATE TABLE tick_runs(id TEXT PRIMARY KEY,started_at TEXT,finished_at TEXT,status TEXT,model TEXT,event_id TEXT,neurons_est INTEGER,error TEXT)').run();
 const post=(body,headers={})=>mf.dispatchFetch(url,{method:'POST',headers:{'content-type':'application/json',...headers},body});
 assert.equal((await post('{')).status,400);
 assert.equal((await post('x'.repeat(16385))).status,413);
 assert.equal((await post(JSON.stringify({logs:[{kind:'unapproved',at:Date.now(),data:{}}]}))).status,400);
 const valid=JSON.stringify({logs:[{id:'integration-event',kind:'frame_slow',at:Date.now(),data:{ms:55}}]});
 assert.equal((await post(valid,{origin:'https://example.invalid'})).status,403);
 assert.equal((await post(valid)).status,200);
 const exported=await mf.dispatchFetch(url);assert.equal(exported.status,200);assert.match(await exported.text(),/integration-event/);
 for(let i=1;i<20;i++)assert.equal((await post(valid)).status,200);
 assert.equal((await post(valid)).status,429);
 await db.prepare('INSERT INTO client_logs(id,created_at,data) VALUES (?,?,?)').bind('expired',Date.now()-8*86400000,JSON.stringify([{kind:'frame_slow',id:'expired'}])).run();
 const retained=await mf.dispatchFetch(url);
 assert(!((await retained.text()).includes('expired')),'GET filters expired diagnostics');
 assert(await db.prepare("SELECT id FROM client_logs WHERE id='expired'").first(),'GET diagnostics is read-only; existing POST retention owns cleanup');
 await mf.dispatchFetch(`http://localhost/__fixture/time?now=${fixedNow+61000}`);
 assert.equal((await post(valid)).status,200);
 assert.equal(await db.prepare("SELECT id FROM client_logs WHERE id='expired'").first(),null,'An accepted POST still cleans expired client telemetry');
 await mf.dispatchFetch(`http://localhost/__fixture/time?now=${fixedNow}`);
 // Test real compiled pulse persistence using an isolated synthetic world.
 await db.prepare('CREATE TABLE worlds(id TEXT PRIMARY KEY,revision INTEGER,data TEXT)').run();
 await db.prepare('CREATE TABLE episodes(id TEXT PRIMARY KEY,created_at TEXT,source TEXT,data TEXT)').run();
 await db.prepare('CREATE TABLE living_turns(id TEXT PRIMARY KEY,created_at TEXT,data TEXT)').run();
 await db.prepare('CREATE TABLE context_cache(id TEXT PRIMARY KEY,data TEXT,expires_at INTEGER)').run();
 const realNow=Date.now(),fixture={...structuredClone(seed),born:'2026-10-25T17:00:00Z',living:initializeLiving(realNow)};
 for(const role of fixture.living.catalog.roles){role.place='Công viên';role.kind='social';role.activity='Giao lưu tại công viên';}
 let selectedSim;
 for(let seconds=0;seconds<3600;seconds+=20){fixture.clock={scale:1,pausedAt:null,pausedMs:0,anchors:[{realMs:realNow,simMs:9*3600000+seconds*1000,scale:1}]};if(scheduleResidentSocial(fixture,realNow).pairs){selectedSim=9*3600000+seconds*1000;break;}}
 assert(selectedSim!==undefined);
 fixture.clock.anchors=[{realMs:Date.now(),simMs:selectedSim,scale:1}];
 await db.prepare("INSERT INTO worlds(id,revision,data) VALUES ('home',0,?)").bind(JSON.stringify(fixture)).run();
 // Suppress model/context retrieval for this test; a saved narrative slot is retried.
 await db.prepare('INSERT INTO living_turns(id,created_at,data) VALUES (?,?,?)').bind(turnId(Date.now()),new Date().toISOString(),'{}').run();
 const pulse=()=>mf.dispatchFetch('http://localhost/api/living/pulse',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
 const badOrigin=await mf.dispatchFetch('http://localhost/api/living/pulse',{method:'POST',headers:{origin:'https://example.invalid'},body:'{}'});
 assert.equal(badOrigin.status,403);
 assert.equal((await db.prepare('SELECT count(*) AS n FROM context_cache').first()).n,0,'Origin rejection precedes admission');
 const firstWave=await Promise.all(Array.from({length:12},()=>pulse()));
 const firstBodies=[];for(const response of firstWave){assert.equal(response.status,200);firstBodies.push(await response.json());}
 assert.equal(firstBodies.filter(b=>!b.coalesced).length,1,'Compiled HTTP route admits one pipeline across simultaneous viewers');
 const snapshot=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 assert(JSON.parse(snapshot.data).living.socialSchedule.pending.length>0,'pulse persists independent NPC meetings');
 const audits=await db.prepare('SELECT count(*) AS n FROM tick_runs').first();
 const again=await pulse();assert.equal(again.status,200);assert.equal((await again.json()).coalesced,true);
 const wave=await Promise.all(Array.from({length:12},()=>pulse()));
 for(const response of wave){assert.equal(response.status,200);assert.equal((await response.json()).coalesced,true);}
 assert.equal((await db.prepare('SELECT count(*) AS n FROM tick_runs').first()).n,audits.n,'Coalesced viewer pulses append no duplicate diagnostic');
 assert.equal((await db.prepare("SELECT revision FROM worlds WHERE id='home'").first()).revision,snapshot.revision,'retry within same simulation window makes no duplicate state write');
 const paused=JSON.parse(snapshot.data);paused.paused=true;
 await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(JSON.stringify(paused)).run();
 assert.equal((await pulse()).status,409,'paused world refuses mutation pulse');
 // Pet assignment is additive snapshot data, protected by the same revision CAS.
 const petPost=(body,headers={})=>mf.dispatchFetch('http://localhost/api/living/pets',{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
 const beforePets=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 const beforeWorld=JSON.parse(beforePets.data);
 assert.equal((await petPost('{')).status,400);
 assert.equal((await petPost('x'.repeat(2049))).status,413);
 assert.equal((await petPost({pet:'se',owner:'an',revision:beforePets.revision})).status,400);
 assert.equal((await petPost({pet:'cun',owner:'an',revision:beforePets.revision},{origin:'https://example.invalid'})).status,403);
 assert.equal((await petPost({pet:'cun',owner:'missing',revision:beforePets.revision})).status,404);
 assert.equal((await petPost({pet:'cun',owner:'binh',revision:beforePets.revision})).status,200);
 const afterPets=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 const afterWorld=JSON.parse(afterPets.data);assert.equal(afterWorld.living.petOwners.cun,'binh');
 assert.deepEqual(afterWorld.people,beforeWorld.people,'Assignment preserves every person, plan and memory');
 assert.deepEqual(afterWorld.living.animalLearning,beforeWorld.living.animalLearning,'Assignment preserves animal learning');
 assert.equal(afterPets.revision,beforePets.revision+1);
 assert.equal((await petPost({pet:'cun',owner:'an',revision:beforePets.revision})).status,409);
 const race=await Promise.all([petPost({pet:'cun',owner:null,revision:afterPets.revision}),petPost({pet:'muop',owner:'an',revision:afterPets.revision})]);
 assert.deepEqual(race.map(r=>r.status).sort(),[200,409],'Concurrent assignments cannot overwrite each other');
 const fresh=await db.prepare("SELECT revision FROM worlds WHERE id='home'").first();
 assert.equal((await petPost({pet:'cun',owner:null,revision:fresh.revision})).status,200);
 assert(!('cun' in JSON.parse((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data).living.petOwners),'Unassign is persisted explicitly');
 console.log('PASS pet ownership guard, schema, stream limit, origin, persisted assignment, unassignment, CAS race and history preservation');
 // Legacy snapshots receive additive home assignments on a real catalog save.
 const legacyRow=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 const legacyWorld=JSON.parse(legacyRow.data);
 for(const [i,r] of legacyWorld.living.residents.entries()) {
  delete r.home; delete r.identity;
  r.name=`${legacyWorld.living.catalog.names[i%legacyWorld.living.catalog.names.length]} ${Math.floor(i/legacyWorld.living.catalog.names.length)+1}`;
 }
 legacyWorld.living.residents[0].name='Tên riêng đã lưu';
 await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(JSON.stringify(legacyWorld)).run();
 const saveHomes=(revision)=>mf.dispatchFetch('http://localhost/api/living/catalog',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({revision,catalog:legacyWorld.living.catalog})});
 assert.equal((await saveHomes(legacyRow.revision)).status,200);
 const homeRow=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),homeWorld=JSON.parse(homeRow.data);
 assert.equal(homeWorld.living.residents.length,legacyWorld.living.residents.length);
 assert(homeWorld.living.residents.every(r=>r.home?.householdId&&r.home.anchorId&&r.home.address));
 for(const r of homeWorld.living.residents){
  const {home,identity,name,...original}=r,old=legacyWorld.living.residents.find(x=>x.id===r.id),{name:oldName,...oldHistory}=old;
  assert(home&&identity);assert.deepEqual(original,oldHistory,'Backfill preserves IDs, plans, memories and familiarity');
  if(name!==oldName)assert(identity.previousNames.includes(oldName));
 }
 assert.equal(homeWorld.living.residents[0].name,'Tên riêng đã lưu');
 assert(homeWorld.living.residents.slice(1).every(r=>!/[0-9]/.test(r.name)));
 assert.deepEqual(homeWorld.people,legacyWorld.people);assert.deepEqual(homeWorld.living.petOwners,legacyWorld.living.petOwners);
 assert.equal((await saveHomes(legacyRow.revision)).status,409);
 assert.equal((await saveHomes(homeRow.revision)).status,200);
 const repeated=JSON.parse((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data);
 assert.deepEqual(repeated.living.residents,homeWorld.living.residents,'Repeated save does not move assigned homes');
 console.log('PASS legacy household and identity backfill persisted through catalog CAS, repeatability and complete history preservation');
 // Settle one real compiled LinUCB outcome against isolated D1, then retry.
 await db.prepare('CREATE TABLE agent_experiences(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,actor_id TEXT NOT NULL,created_at TEXT NOT NULL,data TEXT NOT NULL)').run();
 const legacyRewardJSON=JSON.stringify({id:'legacy-reward-kept',actorId:'an',scenarioId:'lunch',at:new Date(fixedNow).toISOString(),reward:.2,source:'simulation',model:'contextual-bandit-v1'});
 await db.prepare('INSERT INTO agent_experiences(id,actor_id,created_at,data) VALUES (?,?,?,?)').bind('legacy-reward-kept','an',new Date(fixedNow).toISOString(),legacyRewardJSON).run();
 const linearWorld=structuredClone(repeated),linearNow=Date.now();linearWorld.paused=false;
 linearWorld.clock={anchors:[{realMs:linearNow,simMs:200000,scale:1}],pausedAt:null,pausedMs:0,scale:1};
 for(const policy of Object.values(linearWorld.living.learning??{}))if(policy.pending)policy.pending.completed=true;
 const learner=linearWorld.living.residents[0],policy=linearWorld.living.learning[learner.id],contextAtChoice=[1,.6,.3,.4,0,.02];
 const oldSamples=policy.samples,oldMemories=[...learner.memories];
 policy.pending={id:'linucb-api-receipt',scenarioId:'learn-trade',startedSimMs:0,durationMs:180000,completed:false,context:contextAtChoice};
 learner.plan={createdAt:new Date(linearNow).toISOString(),pausedMs:0,simStartedAt:0,from:'Khu dân cư',steps:[{location:'Trường nghề',activity:'Học nghề mô phỏng',kind:'read',duration:180}]};
 await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(JSON.stringify(linearWorld)).run();
 const settle=()=>mf.dispatchFetch('http://localhost/api/living/learning',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
 const outcome=await settle();assert.equal(outcome.status,200);assert.equal((await outcome.json()).humanExperiences,1);
 const learned=JSON.parse((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data),fitted=learned.living.learning[learner.id];
 assert.equal(fitted.samples,oldSamples+1);assert.equal(fitted.linear,undefined,'Ordinary snapshots omit posterior matrices');
 const separate=await db.prepare('SELECT data,updated_revision FROM learning_policies WHERE actor_id=?').bind(learner.id).first();
 assert.equal(JSON.parse(separate.data)['learn-trade'].samples,1);assert.equal(separate.updated_revision,fitted.policyRevision);
 const policyResponse=await mf.dispatchFetch('http://localhost/api/living/learning');assert.equal(policyResponse.status,200);
 assert.equal((await policyResponse.json()).models[learner.id].linear['learn-trade'].samples,1,'Learning API hydrates the exact posterior');
 await db.prepare('CREATE TABLE IF NOT EXISTS context_cache(id TEXT PRIMARY KEY,data TEXT,expires_at INTEGER)').run();
 const lightResponse=await mf.dispatchFetch('http://localhost/api/world?compact=1');assert.equal(lightResponse.status,200);
 const light=await lightResponse.json();
 assert.equal(light.world.living.learning[learner.id].linear,undefined,'Polling world excludes normalized matrices');
 assert(light.activeContexts.length>0&&light.activeContexts.every(c=>c.source==='editorial-suggestion'&&c.phase.includes(light.worldTime.phase)&&c.weather.includes(light.weatherState.kind)),'API suggestions match the effective weather/phase and retain editorial provenance');
 assert.deepEqual(learned.living.residents[0].memories.slice(0,oldMemories.length),oldMemories);
 const archive=JSON.parse((await db.prepare('SELECT data FROM agent_experiences WHERE id=?').bind('linucb-api-receipt').first()).data);
 assert.equal(archive.model,'disjoint-linucb-v1');assert.deepEqual(archive.context,contextAtChoice);
 assert.equal(auditExperience(archive).status,'verified-contextual');
 assert.equal(archive.rewardEvidence.plan.binding,'legacy-start-time','Legacy pending keeps the weaker start-time label');
 assert.equal(archive.rewardEvidence.samples.before,oldSamples);assert.equal(archive.rewardEvidence.samples.after,oldSamples+1);
 assert.deepEqual(archive.rewardEvidence.decisionContext,contextAtChoice);
 assert.equal(learned.living.experiences.find(e=>e.id===archive.id).rewardEvidence,undefined,'Snapshot summaries keep detailed evidence in the durable archive');
 const exportedRewards=await mf.dispatchFetch('http://localhost/api/living/learning?format=jsonl&limit=1000');
 const exportedRecords=(await exportedRewards.text()).trim().split('\n').map(s=>JSON.parse(s));
 assert.deepEqual(exportedRecords.find(e=>e.id===archive.id),archive,'JSONL exports the same durable evidence');
 assert.equal((await db.prepare('SELECT data FROM agent_experiences WHERE id=?').bind('legacy-reward-kept').first()).data,legacyRewardJSON,'Old archives remain byte-identical');
 assert.equal(fitted.domainSkills.learning,(policy.domainSkills?.learning??0)+2);
 assert.deepEqual(archive.skillGain,{domain:'learning',before:policy.domainSkills?.learning??0,after:fitted.domainSkills.learning,amount:2});
 assert.deepEqual(learned.living.petOwners,linearWorld.living.petOwners);assert.deepEqual(learned.living.residents.map(r=>r.home),linearWorld.living.residents.map(r=>r.home));
 const retry=await settle();assert.equal(retry.status,200);assert.equal((await retry.json()).updated,0);
 assert.equal((await db.prepare('SELECT count(*) AS count FROM agent_experiences WHERE id=?').bind('linucb-api-receipt').first()).count,1);
 console.log('PASS compiled LinUCB context/posterior/reward evidence archive persisted atomically; legacy bytes preserved and replay gives no duplicate credit');
 // Competing compiled requests share the same original-plan receipt and CAS.
 const rewardRaceRow=await db.prepare("SELECT data FROM worlds WHERE id='home'").first(),rewardRaceWorld=JSON.parse(rewardRaceRow.data);
 const raceAgent=rewardRaceWorld.living.learning[learner.id],racePerson=rewardRaceWorld.living.residents.find(r=>r.id===learner.id);
 raceAgent.pending={id:'reward-evidence-cas-race',scenarioId:'learn-trade',startedSimMs:0,durationMs:180000,completed:false,context:contextAtChoice,planKey:planKey(racePerson.plan)};
 await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(JSON.stringify(rewardRaceWorld)).run();
 const rewardReplies=await Promise.all([settle(),settle()]);
 let raceCredits=0;
 for(const response of rewardReplies){assert([200,409].includes(response.status));const body=await response.json();raceCredits+=body.humanExperiences??0;}
 assert.equal(raceCredits,1,'Only the winning CAS earns a sample/evidence record');
 assert.equal((await db.prepare('SELECT count(*) AS count FROM agent_experiences WHERE id=?').bind('reward-evidence-cas-race').first()).count,1);
 const raceArchive=JSON.parse((await db.prepare('SELECT data FROM agent_experiences WHERE id=?').bind('reward-evidence-cas-race').first()).data);
 assert.equal(auditExperience(raceArchive).status,'verified-contextual');assert.equal(raceArchive.rewardEvidence.plan.binding,'fingerprint-v1');
 const racePersisted=JSON.parse((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data);
 assert.equal(racePersisted.living.learning[learner.id].samples,oldSamples+2);
 assert.equal(JSON.parse((await db.prepare('SELECT data FROM learning_policies WHERE actor_id=?').bind(learner.id).first()).data)['learn-trade'].samples,2);
 console.log('PASS compiled original-plan reward evidence/one sample/one archive survive competing CAS writes');
 // The real compiled JSONL contract feeds an isolated owner-scoped replay.
 const replayBefore=await db.prepare("SELECT data FROM worlds WHERE id='home'").first();
 const replayExport=await mf.dispatchFetch('http://localhost/api/living/learning?format=jsonl&limit=1000');
 assert.equal(replayExport.status,200);const replayRaw=await replayExport.text();
 const replayBuilder=new ReplayCorpus({kind:'actor',actorId:learner.id});
 for(const line of replayRaw.trim().split('\n'))replayBuilder.add(JSON.parse(line));
 const replayCorpus=replayBuilder.finish(),replayDigest=createHash('sha256');
 for(const record of replayCorpus.examples)replayDigest.update(record.canonical+'\n');
 const offlineReplay=fitReplay(replayCorpus,'curriculum',{kind:'local-owner-jsonl',sha256:createHash('sha256').update(replayRaw).digest('hex'),acceptedDigest:replayDigest.digest('hex')},null);
 assert(offlineReplay.report.accepted>=1&&offlineReplay.report.weak>=1,'Full fingerprints replay while legacy binding stays unverified');
 assert.equal(offlineReplay.scope.actorId,learner.id);
 assert.equal(offlineReplay.rows.reduce((n,r)=>n+r.replayedRecords,0),offlineReplay.report.accepted);
 assert.deepEqual(await db.prepare("SELECT data FROM worlds WHERE id='home'").first(),replayBefore,'Offline fit cannot change snapshots, personal credit or source history');
 assert.equal(JSON.parse((await db.prepare('SELECT data FROM learning_policies WHERE actor_id=?').bind(learner.id).first()).data)['learn-trade'].samples,2);
 console.log('PASS compiled JSONL -> actor-filtered audited replay keeps legacy binding, source history and earned personal samples unchanged');
 // Multiple actual paginated JSONL responses feed the local transactional cursor job.
 const bulkRoot=resolve('.sites-runtime/training');mkdirSync(bulkRoot,{recursive:true});const bulkDir=mkdtempSync(join(bulkRoot,'h6b-api-'));
 try {
  const historyBefore=(await db.prepare('SELECT seq,data FROM agent_experiences ORDER BY seq').all()).results;
  const policiesBefore=(await db.prepare('SELECT * FROM learning_policies ORDER BY actor_id').all()).results;
  const memoriesBefore=(await db.prepare('SELECT * FROM memories ORDER BY id').all()).results;
  let after=0;const pages=[];
  for(;;){
   const response=await mf.dispatchFetch(`http://localhost/api/living/learning?format=jsonl&limit=2&after=${after}`);assert.equal(response.status,200);
   const raw=await response.text();if(!raw.trim())break;const next=Number(response.headers.get('X-Next-Cursor'));assert(Number.isSafeInteger(next)&&next>after);after=next;pages.push(raw);
  }
  assert(pages.length);pages.push(pages[0]); // Overlap is not an extra earned or replayed sample.
  const sources=pages.map((raw,i)=>{const file=`page-${i}.jsonl`;writeFileSync(join(bulkDir,file),raw);return{file,sha256:digest(raw),bytes:Buffer.byteLength(raw)};});
  const manifest={version:1,kind:'local-owner-replay-set-v1',actorId:learner.id,order:'curriculum',batchRecords:1,sources};
  const manifestPath=join(bulkDir,'source.json');writeFileSync(manifestPath,JSON.stringify(manifest));
  const args={manifestPath,expectedManifestSha256:digest(readFileSync(manifestPath)),job:join(bulkDir,'job'),expectedCheckpoint:'new',maxBatches:1};
  let progress=bulkReplay(args),resumes=0;
  while(!progress.complete){assert(++resumes<100);progress=bulkReplay({...args,expectedCheckpoint:progress.checkpointSha256});}
  assert(resumes>=1);const out=join(bulkDir,'replay.json');bulkReplay({...args,action:'export',expectedCheckpoint:progress.checkpointSha256,out});
  const exported=JSON.parse(readFileSync(out));
  const combined=pages.join(''),builder=new ReplayCorpus({kind:'actor',actorId:learner.id});for(const line of combined.split('\n'))if(line.trim())builder.add(JSON.parse(line));
  const corpus=builder.finish(),oracle=fitReplay(corpus,'curriculum',{kind:'local-owner-jsonl',sha256:digest(combined),acceptedDigest:corpusDigest(corpus)},null);
  assert.deepEqual(exported.artifact,oracle);assert(exported.artifact.report.weak>=1);assert.equal(progress.report.accepted,offlineReplay.report.accepted);
  assert.deepEqual(await db.prepare("SELECT data FROM worlds WHERE id='home'").first(),replayBefore);
  assert.deepEqual((await db.prepare('SELECT seq,data FROM agent_experiences ORDER BY seq').all()).results,historyBefore);
  assert.deepEqual((await db.prepare('SELECT * FROM learning_policies ORDER BY actor_id').all()).results,policiesBefore);
  assert.deepEqual((await db.prepare('SELECT * FROM memories ORDER BY id').all()).results,memoriesBefore);
  console.log('PASS compiled paginated JSONL -> bulk/cursor/resume/private export matches single-file replay and preserves world/history/memories/earned policies');
 }finally{rmSync(bulkDir,{recursive:true,force:true});}

 // Proposal validation must run on the actual server before dated-ID expansion.
 await db.prepare('CREATE TABLE IF NOT EXISTS context_cache(id TEXT PRIMARY KEY,data TEXT,expires_at INTEGER)').run();
 const proposalNow=Date.now(),date=localDate(proposalNow),vn=new Date(proposalNow+7*3600000);
 for(const key of ['hcm-weather',`vn-holidays-${date.slice(0,4)}`,`hcm-events-${date.slice(0,7)}`])await db.prepare('INSERT OR REPLACE INTO context_cache(id,data,expires_at) VALUES (?,?,?)').bind(key,'null',proposalNow+3600000).run();
 // Only the synthetic suppression marker from this isolated database is removed.
 await db.prepare('DELETE FROM living_turns WHERE id=? AND data=?').bind(turnId(proposalNow),'{}').run();
 const proposalRow=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),proposalWorld=JSON.parse(proposalRow.data);
 const context={date,hour:vn.getUTCHours()+vn.getUTCMinutes()/60,weekday:vn.getUTCDay(),timezone:'Asia/Ho_Chi_Minh',fetchedAt:new Date(proposalNow).toISOString(),weather:{status:'unavailable',source:'fixture',observedAt:null,temperature:null,humidity:null,precipitation:null,code:null,windKph:null},calendar:{weekend:[0,6].includes(vn.getUTCDay()),holidays:[],source:'fixture',status:'unavailable',coverage:'fixture'},traffic:{status:'unavailable',label:'fixture'},festivals:{status:'unavailable',label:'fixture',items:[]}};
 const preview=planLivingTurn(proposalWorld,context,proposalNow),residentId=preview.turn.residentId;
 const duplicateProposal={title:'Cùng xem góc vườn',summary:'Hai người trao đổi về góc vườn mô phỏng.',newRole:{...proposalWorld.living.catalog.roles[0],label:'Một tên nghề mới có dấu'},dialogue:[{speaker:'an',text:'Mình cùng xem góc vườn nhé.'},{speaker:residentId,text:'Được, mình đứng quan sát ở đây.'}]};
 const rejected=await mf.dispatchFetch('http://localhost/api/living/tick',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({proposal:duplicateProposal,basis:{revision:proposalRow.revision,turnId:turnId(proposalNow)}})});
 assert.equal(rejected.status,422);assert.match((await rejected.json()).error,/ID vai trò/);
 const unchanged=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();assert.equal(unchanged.revision,proposalRow.revision);assert.equal(unchanged.data,proposalRow.data);
 console.log('PASS compiled role expansion rejects duplicate IDs before suffixing and preserves snapshot/revision');
 const shortProposal={title:'Cùng xem góc vườn',summary:'Hai người bàn về góc vườn mô phỏng.',dialogue:duplicateProposal.dialogue};
 const shortReply=await mf.dispatchFetch('http://localhost/api/living/tick',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({proposal:shortProposal,basis:{revision:proposalRow.revision,turnId:turnId(proposalNow)}})});
 assert.equal(shortReply.status,422);assert.match((await shortReply.json()).error,/ít nhất4/);
 assert.deepEqual(await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),unchanged,'Rejected model narratives never write world state');
 // Structured event memory shares the same CAS transaction and is actor-bound.
 const memoryRow=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 const memoryEvent={id:'event-memory-integration',revision:memoryRow.revision,source:'ai',title:'Sắp xếp góc sách',summary:'An ghi lại một việc nhỏ trong thế giới mô phỏng.',dialogue:[{speaker:'an',text:'Mình muốn sắp xếp góc sách gọn hơn.'},{speaker:'binh',text:'Bạn thử phân loại sách theo chủ đề nhé.'}],changes:[{id:'an',moneyDelta:0,energyDelta:0,hungerDelta:0,skillDelta:0,activity:'Sắp xếp sách',location:'Sân chung',memory:'Mình ghi nhớ cách phân loại góc sách theo chủ đề.'}]};
 const memoryPost=body=>mf.dispatchFetch('http://localhost/api/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const savedMemory=await memoryPost(memoryEvent);assert.equal(savedMemory.status,200,await savedMemory.text());
 const ownRecords=await mf.dispatchFetch('http://localhost/api/living/memories?actor=an&topic='+encodeURIComponent('góc sách'));assert.equal(ownRecords.status,200);
 const own=(await ownRecords.json()).records;assert(own.some(r=>r.id==='event:event-memory-integration:an'&&r.kind==='event-report'));assert(own.every(r=>r.personId==='an'));
 const other=(await (await mf.dispatchFetch('http://localhost/api/living/memories?actor=binh')).json()).records;assert(!other.some(r=>r.eventId===memoryEvent.id),'A future dialogue speaker cannot receive another actor report');
 const promptMemory=await retrievePromptMemories('http://localhost',['an','binh'],'góc sách',(url,init)=>mf.dispatchFetch(String(url),init));
 assert.equal(promptMemory.byActor.an.status,'available');assert(promptMemory.byActor.an.records.some(r=>r.id==='event:event-memory-integration:an'&&r.ownerId==='an'));
 assert(!promptMemory.byActor.binh.records.some(r=>r.eventId===memoryEvent.id),'Daemon retrieval preserves compiled API actor privacy');
 assert.equal((await mf.dispatchFetch('http://localhost/api/living/memories?actor=missing')).status,404);
 assert.equal((await memoryPost(memoryEvent)).status,200);
 assert.equal((await db.prepare('SELECT count(*) AS count FROM memories WHERE event_id=?').bind(memoryEvent.id).first()).count,1);
 assert.equal((await memoryPost({...memoryEvent,id:'stale-memory-event'})).status,409);
 assert.equal((await db.prepare('SELECT count(*) AS count FROM memories WHERE event_id=?').bind('stale-memory-event').first()).count,0);
 assert.equal((await db.prepare('SELECT count(*) AS count FROM memories WHERE event_id=?').bind('linucb-api-receipt').first()).count,1,'Outcome memory is archived with its original recipient and provenance');
 console.log('PASS structured event/outcome memories persist with CAS, private top-K, idempotency and no cross-actor knowledge');
 // A final model narrative must persist its pool entry without leaking a rules draft.
 const poolNow=Date.now(),poolDate=localDate(poolNow),poolVn=new Date(poolNow+7*3600000),poolContext={...context,date:poolDate,hour:poolVn.getUTCHours()+poolVn.getUTCMinutes()/60,weekday:poolVn.getUTCDay(),fetchedAt:new Date(poolNow).toISOString()};
 const poolRow=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),poolWorld=JSON.parse(poolRow.data),poolPreview=planLivingTurn(poolWorld,poolContext,poolNow),peerId=poolPreview.turn.residentId;
 const recent={title:'Cùng dọn góc sách',summary:'An và hàng xóm bàn cách sắp xếp lại góc sách.',dialogue:[{speaker:'an',text:'Mình muốn phân loại mấy quyển sách này trước nhé?'},{speaker:peerId,text:'Được, mình xếp theo chủ đề để dễ tìm hơn.'},{speaker:'an',text:'Vậy mình làm nhãn nhỏ cho từng ngăn nhé.'},{speaker:peerId,text:'Mình giúp viết nhãn rồi cùng kiểm tra lại nhé.'}]};
 poolWorld.living.dialoguePool=rememberDialogue(undefined,'an',peerId,recent.dialogue,'local-llm');
 await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(JSON.stringify(poolWorld)).run();
 const narrativePost=proposal=>mf.dispatchFetch('http://localhost/api/living/tick',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({proposal,basis:{revision:poolRow.revision,turnId:turnId(poolNow)}})});
 const duplicateScene=await narrativePost(recent);assert.equal(duplicateScene.status,422);assert.match((await duplicateScene.json()).error,/trùng/);
 assert.equal((await db.prepare("SELECT revision FROM worlds WHERE id='home'").first()).revision,poolRow.revision);
 const novel={...recent,title:'Ghi chú cho từng ngăn sách',dialogue:recent.dialogue.map((line,i)=>({...line,text:['Mình thử ghi tên các nhóm sách lên tờ nhãn này nhé?','Được, mình sẽ chọn màu riêng cho truyện và tài liệu.','Mình đặt nhãn ở cạnh ngăn để mọi người nhìn rõ hơn nhé.','Xong mình cùng xem lại xem có nhóm nào còn thiếu nhé.'][i]}))};
 const acceptedScene=await narrativePost(novel);assert.equal(acceptedScene.status,200,await acceptedScene.text());
 const pooled=JSON.parse((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data).living.dialoguePool;
 assert.equal(pooled.entries.length,2);assert(hasDialogue(pooled,'an',peerId,recent.dialogue));assert(hasDialogue(pooled,'an',peerId,novel.dialogue));assert(pooled.entries.every(e=>e.source==='local-llm'));
 console.log('PASS duplicate persisted narrative is rejected and final model pool excludes the generated rules draft');
 // This time setter only exists in the in-memory test entry, never the artifact.
 const quietRow=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 const quietPolicies=await db.prepare('SELECT * FROM learning_policies ORDER BY actor_id').all();
 for(const advanced of [fixedNow+300000,fixedNow+13*3600000]){
  await mf.dispatchFetch('http://localhost/__fixture/time?now='+advanced);
  for(const key of ['hcm-weather',`vn-holidays-${poolDate.slice(0,4)}`,`hcm-events-${poolDate.slice(0,7)}`])await db.prepare('INSERT OR REPLACE INTO context_cache(id,data,expires_at) VALUES (?,?,?)').bind(key,'null',advanced+3600000).run();
  const quiet=await mf.dispatchFetch('http://localhost/api/living/tick',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({proposal:novel,basis:{revision:quietRow.revision,turnId:turnId(advanced)}})});
  assert.equal(quiet.status,422);assert.match((await quiet.json()).error,/không có cuộc gặp/);
  assert.deepEqual(await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),quietRow,'Busy or sleeping actors cannot be forced into a model conversation');
  assert.deepEqual((await db.prepare('SELECT * FROM learning_policies ORDER BY actor_id').all()).results,quietPolicies.results,'Rejected scene cannot train policies');
 }
 console.log('PASS busy and night plans reject model dialogue without world/policy writes');
 // A saved quiet slot must neither report an unfinished encounter nor lose the
 // original pending/turn link when it is eventually settled by learning first.
 const initialEncounter=JSON.parse(quietRow.data),originId=initialEncounter.living.learning.an.pending.id;
 const originPeer=initialEncounter.livingTurn.residentId,beforeFamiliarity=initialEncounter.living.residents.find(r=>r.id===originPeer).familiarity;
 const beforeAnMemory=[...initialEncounter.people.find(p=>p.id==='an').memories];
 const setFixtureTime=async time=>{
  await mf.dispatchFetch('http://localhost/__fixture/time?now='+time);
  for(const key of ['hcm-weather',`vn-holidays-${poolDate.slice(0,4)}`,`hcm-events-${poolDate.slice(0,7)}`])await db.prepare('INSERT OR REPLACE INTO context_cache(id,data,expires_at) VALUES (?,?,?)').bind(key,'null',time+3600000).run();
 };
 const rulesTick=()=>mf.dispatchFetch('http://localhost/api/living/tick',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
 await setFixtureTime(fixedNow+300000);const stillBusy=await rulesTick();assert.equal(stillBusy.status,200,await stillBusy.text());
 const busyWorld=JSON.parse((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data);
 assert.equal(busyWorld.living.learning.an.pending.id,originId);assert.notEqual(busyWorld.living.lastTurnId,originId);
 assert.deepEqual(busyWorld.people.find(p=>p.id==='an').memories,beforeAnMemory,'A 360-second encounter cannot be reported after 300 seconds');
 assert.equal(busyWorld.living.residents.find(r=>r.id===originPeer).familiarity,beforeFamiliarity);
 await setFixtureTime(fixedNow+600000);const learnedEncounter=await settle();assert.equal(learnedEncounter.status,200,await learnedEncounter.text());
 const reported=await rulesTick();assert.equal(reported.status,200,await reported.text());
 const reportedRow=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),reportedWorld=JSON.parse(reportedRow.data);
 assert(reportedWorld.living.reportedEncounters.includes(originId));assert.equal(reportedWorld.living.residents.find(r=>r.id===originPeer).familiarity,Math.min(100,beforeFamiliarity+1));
 assert(reportedWorld.people.find(p=>p.id==='an').memories.some(m=>m.includes('Kế hoạch mô phỏng hoàn tất:')));
 const duplicateReport=await rulesTick();assert.equal(duplicateReport.status,200);assert.deepEqual(await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),reportedRow,'A repeated tick cannot duplicate encounter credit');
 const secondOrigin=reportedWorld.living.learning.an.pending.id,secondPeer=reportedWorld.livingTurn.residentId;
 const secondFamiliarity=reportedWorld.living.residents.find(r=>r.id===secondPeer).familiarity;
 await setFixtureTime(fixedNow+1200000);const directReport=await rulesTick();assert.equal(directReport.status,200,await directReport.text());
 const directWorld=JSON.parse((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data);
 assert(directWorld.living.reportedEncounters.includes(secondOrigin));assert.equal(directWorld.living.residents.find(r=>r.id===secondPeer).familiarity,Math.min(100,secondFamiliarity+1));
 console.log('PASS full-plan encounter reporting survives quiet slots, consumes owned outcomes and remains idempotent for learning-first and direct ticks');
 // Garden care owns no character reward/memory effects and shares world CAS.
 const gardenPost=(body,headers={})=>mf.dispatchFetch('http://localhost/api/living/flora',{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
 assert.equal((await gardenPost('{')).status,400);assert.equal((await gardenPost('💧'.repeat(513))).status,413);
 assert.equal((await gardenPost({id:GARDEN_PLOTS[0].id,revision:0,actor:'an'})).status,400);
 assert.equal((await gardenPost({id:'__proto__',revision:0})).status,404);
 assert.equal((await gardenPost({}, {origin:'https://example.invalid'})).status,403);
 const gardenBefore=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),gardenWorld=JSON.parse(gardenBefore.data);
 const policyBeforeGarden=(await db.prepare('SELECT * FROM learning_policies ORDER BY actor_id').all()).results;
 const gardenBody={id:GARDEN_PLOTS[0].id,revision:gardenBefore.revision},waterResponse=await gardenPost(gardenBody);assert.equal(waterResponse.status,200,await waterResponse.text());
 const gardenAfter=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),wateredWorld=JSON.parse(gardenAfter.data);
 assert.equal(wateredWorld.living.flora.plots[gardenBody.id].moisture,100);const floraOnly=structuredClone(wateredWorld);delete floraOnly.living.flora;
 assert.deepEqual(floraOnly,gardenWorld,'Care changes flora only, preserving every character, plan, home, memory, experience and policy reference');
 assert.deepEqual((await db.prepare('SELECT * FROM learning_policies ORDER BY actor_id').all()).results,policyBeforeGarden);
 assert.equal((await gardenPost(gardenBody)).status,409,'A stale watering request cannot overwrite the snapshot');
 const alreadyWet=await gardenPost({...gardenBody,revision:gardenAfter.revision});assert.equal(alreadyWet.status,200);assert.equal((await alreadyWet.json()).changed,false);
 assert.deepEqual(await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),gardenAfter,'Fresh retry at the same time is a no-op');
 const raced=await Promise.all([gardenPost({id:GARDEN_PLOTS[1].id,revision:gardenAfter.revision}),gardenPost({id:GARDEN_PLOTS[2].id,revision:gardenAfter.revision})]);assert.deepEqual(raced.map(r=>r.status).sort(),[200,409]);
 const raceRow=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),raceWorld=JSON.parse(raceRow.data);assert.equal(Object.keys(raceWorld.living.flora.plots).length,2);
 const pausedGarden={...raceWorld,paused:true};await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(JSON.stringify(pausedGarden)).run();
 assert.equal((await gardenPost({id:GARDEN_PLOTS[3].id,revision:raceRow.revision})).status,409);assert.equal((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data,JSON.stringify(pausedGarden));
 const corruptGarden=structuredClone(raceWorld);corruptGarden.living.flora.version=2;await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(JSON.stringify(corruptGarden)).run();
 assert.equal((await gardenPost({id:GARDEN_PLOTS[3].id,revision:raceRow.revision})).status,409);assert.equal((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data,JSON.stringify(corruptGarden),'Unsupported garden data is preserved');
 const extendedGarden=structuredClone(raceWorld);extendedGarden.living.flora.plots.retired={growthSimMs:12345,anchoredSimMs:0,moisture:32,note:'Giữ khóm cây cũ'};extendedGarden.living.flora.plots[gardenBody.id].note='Giữ ghi chú';
 await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(JSON.stringify(extendedGarden)).run();await setFixtureTime(fixedNow+1200000+86400000);
 const rewater=await gardenPost({id:gardenBody.id,revision:raceRow.revision});assert.equal(rewater.status,200,await rewater.text());
 const keptGarden=JSON.parse((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data);
 assert.deepEqual(keptGarden.living.flora.plots.retired,extendedGarden.living.flora.plots.retired);assert.equal(keptGarden.living.flora.plots[gardenBody.id].note,'Giữ ghi chú');
 console.log('PASS garden owner/origin/schema/UTF-8 limit, persisted care, no-op/stale/CAS race, pause/corrupt/retired preservation and no character rewards');
 const healthMissing=await mf.dispatchFetch('http://localhost/api/health');assert.equal(healthMissing.status,503);assert.equal((await healthMissing.json()).database,'schema_or_query_error');
 for(const migration of readMigrationFiles({migrationsFolder:'drizzle'}).filter(m=>m.sql.some(sql=>sql.includes('CREATE TABLE `site_metrics`'))))for(const sql of migration.sql)await db.prepare(sql).run();
 const backfillUrl='http://localhost/api/living/memories/backfill';
 const backfillPost=(body,headers={},url=backfillUrl)=>mf.dispatchFetch(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
 const backfillRequest={jobId:crypto.randomUUID(),actorId:'an',limit:32,expectedCheckpoint:'new'};
 const beforeBackfillSchema=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 assert.equal((await backfillPost(backfillRequest)).status,503,'Missing maintenance migration does not bootstrap or write');
 assert.deepEqual(await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),beforeBackfillSchema);
 for(const migration of readMigrationFiles({migrationsFolder:'drizzle'}).filter(m=>m.sql.some(sql=>sql.includes('CREATE TABLE `memory_backfill_jobs`'))))for(const sql of migration.sql)await db.prepare(sql).run();
 assert.equal((await backfillPost('{')).status,400);assert.equal((await backfillPost({...backfillRequest,records:[{text:'do not accept arbitrary memory'}]})).status,400);
 assert.equal((await backfillPost('x'.repeat(2049))).status,413);assert.equal((await backfillPost(backfillRequest,{origin:'https://example.invalid'})).status,403);
 assert.equal((await backfillPost(backfillRequest,{},'https://example.invalid/api/living/memories/backfill')).status,403,'Owner authorization never enables a remote backfill');
 assert.equal((await backfillPost({...backfillRequest,action:'apply'})).status,400,'Apply requires reviewed plan hash');
 // An immutable legacy episode explicitly assigns its report to An; a dialogue speaker learns nothing from it.
 const legacyEpisode={title:'Bản ghi lịch sử',summary:'Giữ nguyên nguồn đã lưu',dialogue:[{speaker:'binh',text:'Một câu thoại không cấp quyền biết.'}],changes:[{id:'an',memory:'Ký ức nguồn lịch sử: mình phân loại góc sách.',skillDelta:0}]};
 await db.prepare('INSERT INTO episodes(id,created_at,source,data) VALUES(?,?,?,?)').bind('backfill-historical-episode','2026-10-24T01:00:00.000Z','ai',JSON.stringify(legacyEpisode)).run();
 // Isolated fixture only: emulate an old outcome archived before structured-memory writes existed.
 await db.prepare('DELETE FROM memories WHERE id=?').bind('outcome:reward-evidence-cas-race').run();
 const backfillWorld=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 const backfillHistory=(await db.prepare('SELECT * FROM episodes ORDER BY id').all()).results;
 const backfillExperiences=(await db.prepare('SELECT * FROM agent_experiences ORDER BY seq').all()).results;
 const backfillPolicies=(await db.prepare('SELECT * FROM learning_policies ORDER BY actor_id').all()).results;
 const backfillOldMemories=(await db.prepare('SELECT * FROM memories ORDER BY id').all()).results;
 const checkpointBefore=await db.prepare('SELECT count(*) n FROM memory_backfill_jobs').first();
 const firstPreview=await backfillPost(backfillRequest);assert.equal(firstPreview.status,200);const firstPlan=await firstPreview.json();assert.equal(firstPlan.mode,'dry-run');assert(firstPlan.records.some(r=>r.id==='event:backfill-historical-episode:an'));assert(firstPlan.records.every(r=>r.personId==='an'&&JSON.stringify(r.witnessedWith)==='["an"]'));
 assert.deepEqual((await db.prepare('SELECT * FROM memories ORDER BY id').all()).results,backfillOldMemories);assert.deepEqual(await db.prepare('SELECT count(*) n FROM memory_backfill_jobs').first(),checkpointBefore,'Dry-run does not create a job');
 const firstApplyBody={...backfillRequest,action:'apply',planSha256:firstPlan.planSha256};
 const firstApplied=await backfillPost(firstApplyBody);assert.equal(firstApplied.status,200);const firstHead=await firstApplied.json();assert.equal(firstHead.duplicate,false);
 const committedCount=await db.prepare('SELECT count(*) n FROM memories').first();assert.equal((await (await backfillPost(firstApplyBody)).json()).duplicate,true);assert.deepEqual(await db.prepare('SELECT count(*) n FROM memories').first(),committedCount,'Lost ACK retry is read-only');
 const finishBackfill=async(body,head)=>{let steps=0;while(!head.complete){assert(++steps<100);const next={...body,expectedCheckpoint:head.checkpoint};const p=await backfillPost(next);assert.equal(p.status,200);const plan=await p.json();const response=await backfillPost({...next,action:'apply',planSha256:plan.planSha256});assert.equal(response.status,200);head=await response.json();}return head;};
 await finishBackfill(backfillRequest,firstHead);
 const outcomeJob={...backfillRequest,jobId:crypto.randomUUID(),actorId:learner.id,limit:1};const outcomePlan=await(await backfillPost(outcomeJob)).json();const outcomeFirst=await backfillPost({...outcomeJob,action:'apply',planSha256:outcomePlan.planSha256});assert.equal(outcomeFirst.status,200);await finishBackfill(outcomeJob,await outcomeFirst.json());
 const restoredOutcome=await db.prepare('SELECT * FROM memories WHERE id=?').bind('outcome:reward-evidence-cas-race').first();assert.equal(restoredOutcome.person_id,learner.id);assert.equal(restoredOutcome.kind,'simulation-plan-outcome');assert.equal(restoredOutcome.created_at,raceArchive.at);
 assert.equal((await db.prepare("SELECT count(*) n FROM memories WHERE person_id='binh' AND event_id='backfill-historical-episode'").first()).n,0);
 for(const row of backfillOldMemories)assert.deepEqual(await db.prepare('SELECT * FROM memories WHERE id=?').bind(row.id).first(),row,'Every preexisting row/text/metadata is preserved');
 assert.deepEqual(await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),backfillWorld);assert.deepEqual((await db.prepare('SELECT * FROM episodes ORDER BY id').all()).results,backfillHistory);assert.deepEqual((await db.prepare('SELECT * FROM agent_experiences ORDER BY seq').all()).results,backfillExperiences);assert.deepEqual((await db.prepare('SELECT * FROM learning_policies ORDER BY actor_id').all()).results,backfillPolicies);
 // Actual compiled concurrent requests consume one plan/receipt, not two memories.
 await db.prepare('INSERT INTO episodes(id,created_at,source,data) VALUES(?,?,?,?)').bind('backfill-race','2026-10-24T02:00:00.000Z','ai',JSON.stringify(legacyEpisode)).run();
 const raceJob={...backfillRequest,jobId:crypto.randomUUID()},racePlan=await(await backfillPost(raceJob)).json();
 const raceBody={...raceJob,action:'apply',planSha256:racePlan.planSha256};const replies=await Promise.all([backfillPost(raceBody),backfillPost(raceBody)]);assert(replies.every(r=>r.status===200));const heads=await Promise.all(replies.map(r=>r.json()));assert.equal(heads.filter(h=>!h.duplicate).length,1);assert.equal((await db.prepare("SELECT count(*) n FROM memories WHERE id='event:backfill-race:an'").first()).n,1);assert.equal((await db.prepare('SELECT count(*) n FROM memory_backfill_batches WHERE job_id=?').bind(raceJob.jobId).first()).n,1);
 // A silent dropped INSERT must still abort the complete D1 transaction via receipt assertion.
 await db.prepare('INSERT INTO episodes(id,created_at,source,data) VALUES(?,?,?,?)').bind('backfill-silent-skip','2026-10-24T03:00:00.000Z','ai',JSON.stringify(legacyEpisode)).run();
 const badJob={...backfillRequest,jobId:crypto.randomUUID()},badPlan=await(await backfillPost(badJob)).json();
 const beforeSilent=(await db.prepare('SELECT * FROM memories ORDER BY id').all()).results;
 await db.prepare("CREATE TRIGGER backfill_ignore_fixture BEFORE INSERT ON memories BEGIN SELECT RAISE(IGNORE); END").run();
 assert.equal((await backfillPost({...badJob,action:'apply',planSha256:badPlan.planSha256})).status,503);
 assert.equal((await db.prepare('SELECT count(*) n FROM memory_backfill_jobs WHERE id=?').bind(badJob.jobId).first()).n,0);assert.equal((await db.prepare('SELECT count(*) n FROM memory_backfill_batches WHERE job_id=?').bind(badJob.jobId).first()).n,0);assert.deepEqual((await db.prepare('SELECT * FROM memories ORDER BY id').all()).results,beforeSilent);assert.deepEqual(await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),backfillWorld);
 await db.prepare('DROP TRIGGER backfill_ignore_fixture').run();
 console.log('PASS compiled local-only memory backfill dry-run/plan-CAS/atomic receipts/concurrency/silent-insert rollback; source/history/world/policies/existing memories preserved');
 const beforeHealth=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 const healthy=await mf.dispatchFetch('http://localhost/api/health');assert.equal(healthy.status,200);const healthBody=await healthy.json();assert.equal(healthBody.ok,true);assert.equal(healthBody.database,'ready');assert(healthBody.lastTick?.id);
 assert.deepEqual(await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),beforeHealth,'Health schema batch does not mutate a valid world');
 console.log('PASS health schema batch detects missing tables, reports ready after additive schema and preserves world');
 console.log(JSON.stringify({suite:'local-diagnostics-http',ownerReadGuard:true,ownerWriteGuard:true,streamByteLimit:true,schema:true,origin:true,ack:true,jsonlReadback:true,rateLimit:true,retention:true,diagnosticsReadOnly:true,pulsePersistence:true,pulseRetry:true,pulseConcurrentViewers:12,pulseNoDuplicateAudit:true,pulsePause:true,healthSchemaBatch:true,bulkReplay:true,memoryBackfill:true,productionAccess:false}));
}finally{await mf.dispose();globalThis.Date=NativeDate;}
