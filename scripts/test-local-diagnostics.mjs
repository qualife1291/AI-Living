import { seed } from "../lib/world.ts";
import { initializeLiving, turnId } from "../lib/living/engine.ts";
import { scheduleResidentSocial } from "../lib/living/social-scheduler.ts";
/** In-process local worker integration; no hosting, account or production DB access. */
import assert from 'node:assert/strict';
import { readFileSync, realpathSync, readdirSync } from 'node:fs';
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
 assert.equal((await mf.dispatchFetch(url)).status,403,'non-owner GET denied');
 assert.equal((await mf.dispatchFetch(url,{method:'POST',body:'{}'})).status,403,'non-owner POST denied');
 await mf.setOptions({...options,bindings:{XOM_LOCAL_ADMIN:'true'}});
 const db=await mf.getD1Database('DB');
 for(const sql of readFileSync('drizzle/0006_client_logs.sql','utf8').split(';').map(x=>x.trim()).filter(Boolean))await db.prepare(sql).run();
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
 console.log(JSON.stringify({suite:'local-diagnostics-http',ownerReadGuard:true,ownerWriteGuard:true,streamByteLimit:true,schema:true,origin:true,ack:true,jsonlReadback:true,rateLimit:true,retention:true,pulsePersistence:true,pulseRetry:true,pulsePause:true,productionAccess:false}));
}finally{await mf.dispose();}
