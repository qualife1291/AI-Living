import assert from 'node:assert/strict';
import {realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {runCoalescedPulse,PULSE_GATE_KEY,PULSE_COOLDOWN_MS,PULSE_LEASE_MS} from '../lib/living/pulse-gate.ts';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json'))),{Miniflare}=require('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15',inspectorPort:0});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
try {
 const rawDb=await mf.getD1Database('DB'),t=1_800_000_000_000;
 // Miniflare's host-side synchronous proxy can mix response IDs when multiple
 // prepared-statement proxy chains overlap. Queue complete host RPC operations,
 // keeping the pulse callers/pipelines concurrent and all CAS assertions intact.
 // The compiled HTTP suite separately exercises 12 actual Worker requests.
 let transport=Promise.resolve();
 const prepare=(sql,parameters=[])=>({
  bind:(...args)=>prepare(sql,args),
  ...Object.fromEntries(['first','run'].map(method=>[method,(...args)=>{
   const request=transport.then(async()=>JSON.parse(JSON.stringify(
    await rawDb.prepare(sql).bind(...parameters)[method](...args))));
   transport=request.catch(()=>{});
   return request;
  }])),
 });
 const db={prepare};
 await db.prepare('CREATE TABLE worlds(id TEXT PRIMARY KEY,revision INTEGER,data TEXT)').run();
 await db.prepare('CREATE TABLE context_cache(id TEXT PRIMARY KEY,data TEXT,expires_at INTEGER)').run();
 const history=JSON.stringify({paused:false,people:[{id:'an',memories:['Giữ ký ức này']}],living:{petOwners:{cun:'an'},flora:{version:1,plots:{}},learning:{an:{samples:12}}}});
 await db.prepare("INSERT INTO worlds VALUES ('home',17,?)").bind(history).run();
 await db.prepare("INSERT INTO context_cache VALUES ('hcm-weather','observed-source',?)").bind(t+60_000).run();
 const gate=()=>db.prepare('SELECT data,expires_at FROM context_cache WHERE id=?').bind(PULSE_GATE_KEY).first();
 let calls=0;
 const ready=deferred(),release=deferred();
 const wave=Array.from({length:20},()=>runCoalescedPulse(db,async()=>{calls++;ready.resolve();await release.promise;return {status:200,data:{ok:true,performed:true}}},t));
 await ready.promise;
 const early=await Promise.race(wave);assert.equal(early.data.coalesced,true,'Followers return while the admitted pulse is still running');
 release.resolve();
 const results=await Promise.all(wave);
 assert.equal(calls,1);assert.equal(results.filter(r=>r.data.coalesced).length,19);
 assert.equal((await gate()).expires_at,t+PULSE_COOLDOWN_MS);
 const ok=async()=>{calls++;return {status:200,data:{ok:true}}};
 assert.equal((await runCoalescedPulse(db,ok,t+PULSE_COOLDOWN_MS-1)).data.coalesced,true);
 assert.equal(calls,1);
 await runCoalescedPulse(db,ok,t+10_000);assert.equal(calls,2,'A single 10s viewer keeps its cadence');

 // Pausing is checked before the cooldown, without overwriting simulation data.
 const activeGate=await gate();
 await db.prepare("UPDATE worlds SET data=json_set(data,'$.paused',1)").run();
 assert.equal((await runCoalescedPulse(db,ok,t+10_001)).status,409);
 assert.deepEqual(await gate(),activeGate);assert.equal(calls,2);
 await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(history).run();
 for(const status of [409,422,503]) {
  const failed=await runCoalescedPulse(db,async()=>({status,data:{error:'retryable fixture'}}),t+20_000);
  assert.equal(failed.status,status);assert.equal((await gate()).expires_at,0);
 }
 await assert.rejects(runCoalescedPulse(db,async()=>{throw Error('pipeline failure')},t+20_000),/pipeline failure/);
 assert.equal((await gate()).expires_at,0);
 await runCoalescedPulse(db,ok,t+20_000);assert.equal(calls,3,'Failures allow an immediate retry');

 // A crashed request expires; a late old request cannot shorten a new lease.
 const oldReady=deferred(),oldRelease=deferred(),newReady=deferred(),newRelease=deferred();
 const old=runCoalescedPulse(db,async()=>{oldReady.resolve();await oldRelease.promise;return {status:200,data:{}}},t+40_000,'old-owner');
 await oldReady.promise;
 assert.equal((await runCoalescedPulse(db,ok,t+40_000+PULSE_LEASE_MS-1)).data.coalesced,true);
 const next=runCoalescedPulse(db,async()=>{newReady.resolve();await newRelease.promise;return {status:200,data:{}}},t+40_000+PULSE_LEASE_MS,'new-owner');
 await newReady.promise;
 const newer=await gate();assert.equal(JSON.parse(newer.data).nonce,'new-owner');
 oldRelease.resolve();await old;assert.deepEqual(await gate(),newer,'Expired owner must not release the new lease');
 newRelease.resolve();await next;

 const row=await db.prepare("SELECT revision,data FROM worlds WHERE id='home'").first();
 assert.equal(row.revision,17);assert.deepEqual(JSON.parse(row.data),JSON.parse(history));
 assert.equal((await db.prepare("SELECT data FROM context_cache WHERE id='hcm-weather'").first()).data,'observed-source');
 await db.prepare('DROP TABLE context_cache').run();
 await assert.rejects(runCoalescedPulse(db,ok,t+120_000));assert.equal(calls,3,'Unavailable admission storage must not run an unguarded pipeline');
 console.log(JSON.stringify({suite:'pulse-gate',concurrentRequests:20,pipelines:1,coalesced:19,cooldownMs:PULSE_COOLDOWN_MS,leaseMs:PULSE_LEASE_MS,pause:true,failureRetry:true,expiry:true,nonceOwnership:true,historyPreserved:true,productionAccess:false}));
} finally {await mf.dispose();}
