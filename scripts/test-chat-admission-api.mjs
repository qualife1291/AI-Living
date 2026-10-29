/** Compiled Worker + isolated D1; no production requests or external providers. */
import assert from 'node:assert/strict';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import {realpathSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {CHAT_GATE_KEY,CHAT_WINDOW_LIMIT,CHAT_WINDOW_MS} from '../lib/living/interaction-store.ts';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json')));
const {Miniflare,Log,LogLevel}=require('miniflare');
const fixed=Date.parse('2026-10-29T02:00:00Z');
const files=readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&!p.split('/').includes('.wrangler'));
const modules=[{type:'ESModule',path:resolve('dist/server/__chat_admission_fixture.mjs'),contents:`import worker from './index.js';const NativeDate=Date;let now=${fixed};globalThis.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:[now]))}static now(){return now}};export default {fetch(req,env,ctx){const u=new URL(req.url);if(u.pathname==='/__chat/time'){now=Number(u.searchParams.get('now'));return Response.json({ok:true});}return worker.fetch(req,env,ctx)}};`},...files.map(p=>({type:'ESModule',path:resolve('dist/server',p)}))];
const options={cf:false,outboundService:async()=>new Response('',{status:503}),log:new Log(LogLevel.WARN),modules,modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],inspectorPort:0};
const workerOptions={...options,bindings:{XOM_LOCAL_ADMIN:'true'},d1Databases:{DB:'chat-admission-shared'}};
const mf=new Miniflare({workers:[{...workerOptions,name:'chat-primary'},{...workerOptions,name:'chat-secondary'}]}),denied=new Miniflare({...options,bindings:{XOM_LOCAL_ADMIN:'false'}});
const setTime=async now=>{await mf.dispatchFetch(`http://localhost/__chat/time?now=${now}`);await secondary.fetch(`http://localhost/__chat/time?now=${now}`);};
const make=(actorId='an')=>({id:crypto.randomUUID(),actorId,message:'Chào bạn'});
let secondary;let dispatches=0;
const post=(body,headers={})=>(secondary&&++dispatches%2?secondary.fetch.bind(secondary):mf.dispatchFetch.bind(mf))('http://localhost/api/living/interact',{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body)});
try{
 secondary=await mf.getWorker('chat-secondary');
 const db=await mf.getD1Database('DB','chat-primary');for(const m of readMigrationFiles({migrationsFolder:'drizzle'}))for(const sql of m.sql)await db.prepare(sql).run();
 assert.equal((await denied.dispatchFetch('http://localhost/api/living/interact',{method:'POST',body:JSON.stringify(make())})).status,403);
 assert.equal((await mf.dispatchFetch('http://localhost/api/world')).status,200);
 const original=await db.prepare("SELECT * FROM worlds WHERE id='home'").first();
 const protectedTables=['worlds','episodes','memories','learning_policies','agent_experiences'];
 const protectedSnapshot=async()=>{const rows=[];for(const name of protectedTables)rows.push((await db.prepare(`SELECT * FROM ${name}`).all()).results);return JSON.stringify(rows);};
 const unchanged=await protectedSnapshot();
 await db.prepare('INSERT INTO context_cache(id,data,expires_at) VALUES(?,?,?)').bind('unrelated-chat-test','keep-provider-cache',fixed+500000).run();
 const gate=async()=>db.prepare('SELECT * FROM context_cache WHERE id=?').bind(CHAT_GATE_KEY).first();
 const history=async()=>JSON.stringify((await db.prepare('SELECT * FROM visitor_exchanges ORDER BY id').all()).results);
 assert.equal((await post(make(),{origin:'https://wrong.example'})).status,403);
 assert.equal((await post('{')).status,400);
 assert.equal((await post(new Uint8Array([34,0xff,34]))).status,400);
 assert.equal((await post({...make(),message:'ệ'.repeat(700)})).status,413);
 assert.equal((await post(make('missing'))).status,404);
 assert.equal(await gate(),null,'Invalid and denied inputs never consume admission');
 await db.prepare("UPDATE worlds SET data=json_set(data,'$.paused',1) WHERE id='home'").run();
 assert.equal((await post(make())).status,409);assert.equal(await gate(),null);
 await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(original.data).run();
 const same=make(),duplicates=await Promise.all(Array.from({length:16},()=>post(same)));
 assert(duplicates.every(r=>r.status===200));
 const replies=await Promise.all(duplicates.map(r=>r.json()));assert(replies.every(r=>r.id===same.id&&r.reply===replies[0].reply));
 assert.equal(JSON.parse((await gate()).data).count,1,'Concurrent duplicate UUID consumes only one slot');
 const messages=Array.from({length:60},(_,i)=>make(i%2?'binh':'chi'));
 const burst=await Promise.all(messages.map(body=>post(body)));
 assert.equal(burst.filter(r=>r.status===200).length,CHAT_WINDOW_LIMIT-1);
 const rejected=burst.filter(r=>r.status===429);assert.equal(rejected.length,31);
 for(const response of rejected){assert.equal(response.headers.get('retry-after'),'60');assert.match(response.headers.get('cache-control'),/private.*no-store/);assert.equal((await response.json()).retryAfter,60);}
 const saturated=await gate(),saved=await history();assert.equal(JSON.parse(saturated.data).count,30);
 const retry=await post({...same,message:'Do not replace the stored message'});assert.equal(retry.status,200);assert.equal((await retry.json()).message,same.message);assert.deepEqual(await gate(),saturated);assert.equal(await history(),saved);
 const pending=make();assert.equal((await post(pending)).status,429);assert.deepEqual(await gate(),saturated);assert.equal(await history(),saved);
 await db.prepare("UPDATE worlds SET data=json_set(data,'$.paused',1) WHERE id='home'").run();assert.equal((await post(make())).status,409,'Pause precedence remains stable while quota is full');
 await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(original.data).run();
 await setTime(fixed+CHAT_WINDOW_MS-1);assert.equal((await post(pending)).headers.get('retry-after'),'1');
 await setTime(fixed+CHAT_WINDOW_MS);assert.equal((await post(pending)).status,200);assert.equal(JSON.parse((await gate()).data).count,1);
 let rollbackCases=0;
 for(const [name,sql] of [
  ['chat_ignore_exchange',"CREATE TRIGGER chat_ignore_exchange BEFORE INSERT ON visitor_exchanges BEGIN SELECT RAISE(IGNORE); END"],
  ['chat_ignore_counter',"CREATE TRIGGER chat_ignore_counter BEFORE UPDATE ON context_cache WHEN OLD.id='internal:visitor-chat:v1' BEGIN SELECT RAISE(IGNORE); END"],
  ['chat_delete_counter',"CREATE TRIGGER chat_delete_counter AFTER INSERT ON visitor_exchanges BEGIN DELETE FROM context_cache WHERE id='internal:visitor-chat:v1'; END"],
  ['chat_rewrite_reply',"CREATE TRIGGER chat_rewrite_reply AFTER INSERT ON visitor_exchanges BEGIN UPDATE visitor_exchanges SET data='{}' WHERE id=NEW.id; END"],
  ['chat_abort_exchange',"CREATE TRIGGER chat_abort_exchange BEFORE INSERT ON visitor_exchanges BEGIN SELECT RAISE(ABORT,'private fixture detail'); END"],
  ['chat_decrement_counter',"CREATE TRIGGER chat_decrement_counter AFTER INSERT ON visitor_exchanges BEGIN UPDATE context_cache SET data=json_set(data,'$.count',json_extract(data,'$.count')-1) WHERE id='internal:visitor-chat:v1'; END"],
 ]){
  const next=make(),beforeGate=await gate(),beforeHistory=await history();await db.prepare(sql).run();
  const failed=await post(next);assert.equal(failed.status,503);assert.equal((await failed.json()).error,'Chưa lưu được lời nhắn. Hãy thử lại.');assert.deepEqual(await gate(),beforeGate);assert.equal(await history(),beforeHistory);
  await db.prepare(`DROP TRIGGER ${name}`).run();assert.equal((await post(next)).status,200,'Failed write UUID is immediately retryable');rollbackCases++;
 }
 const goodGate=await gate();
 for(const data of [{count:.5,lastId:crypto.randomUUID()},{count:true,lastId:crypto.randomUUID()},{count:5,lastId:crypto.randomUUID(),nonce:crypto.randomUUID(),previousCount:3}]){
  await db.prepare('UPDATE context_cache SET data=? WHERE id=?').bind(JSON.stringify(data),CHAT_GATE_KEY).run();const badGate=await gate(),beforeHistory=await history();
  assert.equal((await post(make())).status,503,'Malformed active counter fails closed');assert.deepEqual(await gate(),badGate);assert.equal(await history(),beforeHistory);
  assert.equal((await post(same)).status,200,'Valid historic UUID does not depend on counter health');
 }
 await db.prepare('UPDATE context_cache SET data=? WHERE id=?').bind(JSON.stringify({count:1,lastId:same.id}),CHAT_GATE_KEY).run();
 assert.equal((await post(make())).status,200,'Prior two-field counter format upgrades without migration');assert.equal(JSON.parse((await gate()).data).count,2);assert.equal(JSON.parse((await gate()).data).previousCount,1);
 await db.prepare('UPDATE context_cache SET data=?,expires_at=? WHERE id=?').bind(goodGate.data,goodGate.expires_at,CHAT_GATE_KEY).run();
 const savedSame=await db.prepare('SELECT * FROM visitor_exchanges WHERE id=?').bind(same.id).first();
 const beforeCorruptGate=await gate();
 for(const sql of ["UPDATE visitor_exchanges SET data='{}' WHERE id=?","UPDATE visitor_exchanges SET actor_id='chi' WHERE id=?","UPDATE visitor_exchanges SET created_at='2000-01-01T00:00:00Z' WHERE id=?"]){
  await db.prepare(sql).bind(same.id).run();const corrupted=await history();assert.equal((await post(same)).status,503,'Never ACK an invalid stored response');assert.equal(await history(),corrupted);assert.deepEqual(await gate(),beforeCorruptGate);
  await db.prepare('UPDATE visitor_exchanges SET data=?,actor_id=?,created_at=? WHERE id=?').bind(savedSame.data,savedSame.actor_id,savedSame.created_at,same.id).run();
 }
 assert.equal((await db.prepare("SELECT data FROM context_cache WHERE id='unrelated-chat-test'").first()).data,'keep-provider-cache');
 assert.equal(await protectedSnapshot(),unchanged,'World revision, IDs, born, memory, episodes and learned policy unchanged');
 await db.prepare('DROP TABLE context_cache').run();assert.equal((await post(same)).status,200,'Historic retry remains available without coordination storage');assert.equal((await post(make())).status,503,'Storage failures do not admit unguarded exchanges');assert.equal(await protectedSnapshot(),unchanged);
 console.log(JSON.stringify({suite:'chat-admission-compiled-http',concurrentUnique:60,concurrentDuplicate:16,workerIsolates:2,sharedD1:true,limit:30,windowMs:60000,atomicRollbackCases:rollbackCases,originOwnerBodyPauseActorGuards:true,retryAfter:true,rejectedUuidReusable:true,historyPreserved:true,productionAccess:false}));
}finally{await mf.dispose();await denied.dispose();}
