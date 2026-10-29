import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import {saveVisitorExchange,CHAT_GATE_KEY,CHAT_WINDOW_MS,CHAT_WINDOW_LIMIT} from '../lib/living/interaction-store.ts';
const native=new DatabaseSync(':memory:');
for(const migration of readMigrationFiles({migrationsFolder:'drizzle'}))for(const sql of migration.sql)native.exec(sql);
const db={prepare:(sql)=>({bind:(...params)=>({sql,params})}),async batch(statements){
 native.exec('BEGIN');
 try{
  const results=statements.map(({sql,params})=>{const stmt=native.prepare(sql);if(stmt.columns().length)return {results:stmt.all(...params)};return {results:[],meta:stmt.run(...params)};});
  native.exec('COMMIT');return results;
 }catch(error){native.exec('ROLLBACK');throw error;}
}};
const t=1_800_000_000_000;
const make=(actorId='an',now=t)=>({id:crypto.randomUUID(),actorId,message:'Chào bạn',reply:'Chào!',name:'An',source:'rules',createdAt:new Date(now).toISOString()});
const gate=()=>native.prepare('SELECT * FROM context_cache WHERE id=?').get(CHAT_GATE_KEY);
const count=()=>native.prepare('SELECT count(*) AS n FROM visitor_exchanges').get().n;
const snapshot=()=>JSON.stringify(['context_cache','visitor_exchanges','worlds'].map(table=>native.prepare(`SELECT * FROM ${table} ORDER BY id`).all()));
try{
 native.prepare('INSERT INTO worlds(id,revision,data) VALUES(?,?,?)').run('home',19,JSON.stringify({born:'preserve',people:[{id:'an',memories:['private old memory']}],living:{petOwners:{cun:'an'},learning:{an:{samples:11}},residents:[{id:'neighbor-1',home:{id:'unchanged'}}]}}));
 native.prepare('INSERT INTO context_cache(id,data,expires_at) VALUES(?,?,?)').run('hcm-weather','private unrelated cache',t+500000);
 const old=make();old.createdAt='2020-01-01T00:00:00Z';
 native.prepare('INSERT INTO visitor_exchanges VALUES(?,?,?,?)').run(old.id,old.actorId,old.createdAt,JSON.stringify(old));
 const oldRows=JSON.stringify(native.prepare('SELECT * FROM worlds').all()),weather=JSON.stringify(native.prepare("SELECT * FROM context_cache WHERE id='hcm-weather'").all());
 assert.deepEqual(await saveVisitorExchange(db,{...old,message:'different retry payload'},t),{ok:true,exchange:old});assert.equal(gate(),undefined,'Historical retry does not start a window');
 const first=make();assert.equal((await saveVisitorExchange(db,first,t)).ok,true);
 const afterFirst=JSON.stringify(gate());
 const retry=await Promise.all(Array.from({length:40},()=>saveVisitorExchange(db,{...first,reply:'not allowed to overwrite'},t+1)));
 assert(retry.every(x=>x.ok&&x.exchange.reply===first.reply));assert.equal(JSON.stringify(gate()),afterFirst,'Repeated and lost-ACK requests do not consume capacity');
 const candidates=Array.from({length:50},(_,i)=>make(i%2?'binh':'chi'));
 const wave=await Promise.all(candidates.map(x=>saveVisitorExchange(db,x,t+2)));
 assert.equal(wave.filter(x=>x.ok).length,CHAT_WINDOW_LIMIT-1);assert.equal(count(),CHAT_WINDOW_LIMIT+1,'Cap shared across actors, with old history preserved');
 assert(wave.filter(x=>!x.ok).every(x=>x.retryAfter===60));
 const full=snapshot(),blocked=make();assert.deepEqual(await saveVisitorExchange(db,blocked,t+CHAT_WINDOW_MS-1),{ok:false,retryAfter:1});assert.equal(snapshot(),full,'429 does not change cache or history');
 assert.deepEqual(await saveVisitorExchange(db,first,t+10),{ok:true,exchange:first},'Retries remain available while full');assert.equal(snapshot(),full);
 const atBoundary=await saveVisitorExchange(db,blocked,t+CHAT_WINDOW_MS);assert.equal(atBoundary.ok,true,'Exact window boundary admits previously denied UUID');
 assert.equal(JSON.parse(gate().data).count,1);assert.equal(gate().expires_at,t+2*CHAT_WINDOW_MS);
 await saveVisitorExchange(db,make(),t+CHAT_WINDOW_MS+1000);assert.equal(gate().expires_at,t+2*CHAT_WINDOW_MS,'Later messages do not extend fixed window');
 assert.deepEqual(await saveVisitorExchange(db,old,t+CHAT_WINDOW_MS+1001),{ok:true,exchange:old});
 const backwards=gate().expires_at;await saveVisitorExchange(db,make(),t-1000);assert.equal(gate().expires_at,backwards,'Backwards clock does not reopen capacity');
 for(const trigger of [
  "CREATE TRIGGER ignored_exchange BEFORE INSERT ON visitor_exchanges BEGIN SELECT RAISE(IGNORE); END",
  "CREATE TRIGGER ignored_counter BEFORE UPDATE ON context_cache WHEN OLD.id='internal:visitor-chat:v1' BEGIN SELECT RAISE(IGNORE); END",
  "CREATE TRIGGER rejected_exchange BEFORE INSERT ON visitor_exchanges BEGIN SELECT RAISE(ABORT,'private write failure'); END",
 ]){
  native.exec(trigger);const before=snapshot();await assert.rejects(saveVisitorExchange(db,make(),t+CHAT_WINDOW_MS+2000));assert.equal(snapshot(),before,'Admission+exchange failure rolls back atomically');
  const name=/CREATE TRIGGER (\w+)/.exec(trigger)[1];native.exec(`DROP TRIGGER ${name}`);
 }
 native.prepare('UPDATE context_cache SET data=? WHERE id=?').run('{broken',CHAT_GATE_KEY);
 const corrupt=snapshot();await assert.rejects(saveVisitorExchange(db,make(),t+CHAT_WINDOW_MS+2000));assert.equal(snapshot(),corrupt,'Corrupt active counter fails closed without deleting data');
 native.prepare('UPDATE context_cache SET data=? WHERE id=?').run(JSON.stringify({count:1,lastId:'previous'}),CHAT_GATE_KEY);
 assert.equal(JSON.stringify(native.prepare("SELECT * FROM context_cache WHERE id='hcm-weather'").all()),weather,'Unrelated provider cache unchanged');
 native.exec('DROP TABLE context_cache');await assert.rejects(saveVisitorExchange(db,make(),t+CHAT_WINDOW_MS+2000),'No unguarded save when coordination storage is unavailable');
 assert.equal(JSON.stringify(native.prepare('SELECT * FROM worlds').all()),oldRows,'IDs/born/memory/policy/home/pets and world revision unchanged');
 assert.equal(native.prepare('SELECT data FROM visitor_exchanges WHERE id=?').get(old.id).data,JSON.stringify(old));
 console.log(JSON.stringify({suite:'chat-admission',limit:CHAT_WINDOW_LIMIT,windowMs:CHAT_WINDOW_MS,burstRequests:50,duplicateRequests:40,globalActors:true,exactBoundary:true,fixedWindow:true,rollbackTriggers:3,corruptionFailsClosed:true,historyPreserved:true,productionAccess:false}));
}finally{native.close();}
