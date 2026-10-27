import {rememberDialogue,hasDialogue} from "../lib/living/dialogue-pool.ts";
import { seed } from "../lib/world.ts";
import { initializeLiving, turnId, localDate, planLivingTurn } from "../lib/living/engine.ts";
import { scheduleResidentSocial } from "../lib/living/social-scheduler.ts";
/** In-process local worker integration; no hosting, account or production DB access. */
import assert from 'node:assert/strict';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import { realpathSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json')));
const {Miniflare}=require('miniflare');
const moduleFiles=readdirSync("dist/server",{recursive:true}).filter(p=>typeof p==="string"&&p.endsWith(".js")&&p!=="index.js");
const modules=["index.js",...moduleFiles].map(p=>({type:"ESModule",path:resolve("dist/server",p)}));
const options={modules,modulesRoot:resolve("dist/server"),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{XOM_LOCAL_ADMIN:'false'},inspectorPort:0};
const mf=new Miniflare(options);
try{
 const url='http://localhost/api/diagnostics';
 assert.equal((await mf.dispatchFetch('http://localhost/api/living/pets',{method:'POST',body:'{}'})).status,403,'Pet ownership mutations require the owner');
 assert.equal((await mf.dispatchFetch(url)).status,403,'non-owner GET denied');
 assert.equal((await mf.dispatchFetch('http://localhost/api/living/memories?actor=an')).status,403,'Structured memories require owner access');
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
 await db.prepare('INSERT INTO client_logs(id,created_at,data) VALUES (?,?,?)').bind('expired',Date.now()-8*86400000,'[]').run();
 await mf.dispatchFetch(url);
 assert.equal(await db.prepare("SELECT id FROM client_logs WHERE id='expired'").first(),null);
 // Test real compiled pulse persistence using an isolated synthetic world.
 await db.prepare('CREATE TABLE worlds(id TEXT PRIMARY KEY,revision INTEGER,data TEXT)').run();
 await db.prepare('CREATE TABLE episodes(id TEXT PRIMARY KEY,created_at TEXT,source TEXT,data TEXT)').run();
 await db.prepare('CREATE TABLE living_turns(id TEXT PRIMARY KEY,created_at TEXT,data TEXT)').run();
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
 const persisted=await pulse();assert.equal(persisted.status,200,await persisted.text());
 const snapshot=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 assert(JSON.parse(snapshot.data).living.socialSchedule.pending.length>0,'pulse persists independent NPC meetings');
 const again=await pulse();assert.equal(again.status,200,await again.text());
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
 assert.equal((await lightResponse.json()).world.living.learning[learner.id].linear,undefined,'Polling world excludes normalized matrices');
 assert.deepEqual(learned.living.residents[0].memories.slice(0,oldMemories.length),oldMemories);
 const archive=JSON.parse((await db.prepare('SELECT data FROM agent_experiences WHERE id=?').bind('linucb-api-receipt').first()).data);
 assert.equal(archive.model,'disjoint-linucb-v1');assert.deepEqual(archive.context,contextAtChoice);
 assert.deepEqual(learned.living.petOwners,linearWorld.living.petOwners);assert.deepEqual(learned.living.residents.map(r=>r.home),linearWorld.living.residents.map(r=>r.home));
 const retry=await settle();assert.equal(retry.status,200);assert.equal((await retry.json()).updated,0);
 assert.equal((await db.prepare('SELECT count(*) AS count FROM agent_experiences WHERE id=?').bind('linucb-api-receipt').first()).count,1);
 console.log('PASS compiled LinUCB context/posterior/archive persisted atomically and replay gives no duplicate credit');
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
 // Structured event memory shares the same CAS transaction and is actor-bound.
 const memoryRow=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 const memoryEvent={id:'event-memory-integration',revision:memoryRow.revision,source:'ai',title:'Sắp xếp góc sách',summary:'An ghi lại một việc nhỏ trong thế giới mô phỏng.',dialogue:[{speaker:'an',text:'Mình muốn sắp xếp góc sách gọn hơn.'},{speaker:'binh',text:'Bạn thử phân loại sách theo chủ đề nhé.'}],changes:[{id:'an',moneyDelta:0,energyDelta:0,hungerDelta:0,skillDelta:0,activity:'Sắp xếp sách',location:'Sân chung',memory:'Mình ghi nhớ cách phân loại góc sách theo chủ đề.'}]};
 const memoryPost=body=>mf.dispatchFetch('http://localhost/api/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const savedMemory=await memoryPost(memoryEvent);assert.equal(savedMemory.status,200,await savedMemory.text());
 const ownRecords=await mf.dispatchFetch('http://localhost/api/living/memories?actor=an&topic='+encodeURIComponent('góc sách'));assert.equal(ownRecords.status,200);
 const own=(await ownRecords.json()).records;assert(own.some(r=>r.id==='event:event-memory-integration:an'&&r.kind==='event-report'));assert(own.every(r=>r.personId==='an'));
 const other=(await (await mf.dispatchFetch('http://localhost/api/living/memories?actor=binh')).json()).records;assert(!other.some(r=>r.eventId===memoryEvent.id),'A future dialogue speaker cannot receive another actor report');
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
 console.log(JSON.stringify({suite:'local-diagnostics-http',ownerReadGuard:true,ownerWriteGuard:true,streamByteLimit:true,schema:true,origin:true,ack:true,jsonlReadback:true,rateLimit:true,retention:true,pulsePersistence:true,pulseRetry:true,pulsePause:true,productionAccess:false}));
}finally{await mf.dispose();}
