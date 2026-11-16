/** Durable no-op audit and telemetry batches through actual compiled HTTP/D1. */
import assert from 'node:assert/strict';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import {realpathSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {seed} from '../lib/world.ts';
import {initializeLiving,turnId} from '../lib/living/engine.ts';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json'))),{Miniflare,Log,LogLevel}=require('miniflare');
const paths=readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js'&&!p.split('/').includes('.wrangler'));
const fixed=Date.parse('2026-11-16T02:00:00Z');
const entry=`import worker from './index.js';const NativeDate=Date;let now=${fixed};globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}};export default {fetch(request,env,ctx){const url=new URL(request.url);if(url.pathname==='/__clock'){now=Number(url.searchParams.get('at'));return Response.json({ok:true})}return worker.fetch(request,env,ctx)}};`;
const mf=new Miniflare({cf:false,outboundService:async()=>new Response('',{status:503}),log:new Log(LogLevel.ERROR),modules:[{type:'ESModule',path:resolve('dist/server/__clock.mjs'),contents:entry},...['index.js',...paths].map(p=>({type:'ESModule',path:resolve('dist/server',p)}))],modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{XOM_LOCAL_ADMIN:'true'},inspectorPort:0});
try {
 const db=await mf.getD1Database('DB');for(const m of readMigrationFiles({migrationsFolder:'drizzle'}))for(const sql of m.sql)await db.prepare(sql).run();
 const world={...structuredClone(seed),born:'2026-11-15T17:00:00Z',living:initializeLiving(fixed)};
 await db.prepare("INSERT INTO worlds(id,revision,data) VALUES ('home',17,?)").bind(JSON.stringify(world)).run();
 await db.prepare('INSERT INTO living_turns(id,created_at,data) VALUES (?,?,?)').bind(turnId(fixed),new Date(fixed).toISOString(),'{}').run();
 const before=await db.prepare("SELECT * FROM worlds WHERE id='home'").first();
 const post=(path,body='{}')=>mf.dispatchFetch('http://localhost'+path,{method:'POST',headers:{Origin:'http://localhost','content-type':'application/json'},body});
 for(let i=0;i<12;i++){const response=await post('/api/living/tick');assert.equal(response.status,200);assert.equal((await response.json()).duplicate,true);}
 assert.equal((await db.prepare('SELECT count(*) AS n FROM tick_runs').first()).n,0,'A stored turn already provides durable proof; no-op requests need no audit rows');
 assert.deepEqual(await db.prepare("SELECT * FROM worlds WHERE id='home'").first(),before);
 const invalid=await post('/api/living/tick','{"extra":true}');assert.equal(invalid.status,400);
 assert.equal((await db.prepare("SELECT count(*) AS n FROM tick_runs WHERE status='rejected'").first()).n,1,'Rejected genuine requests retain diagnostics');
 const logs=Array.from({length:121},(_,i)=>({id:'frame-'+i,kind:'frame_sample',at:fixed+i*5000,data:{ms:16}}));
 const counts=[];
 for(const interval of [15,60]){
  // Only this isolated telemetry fixture is cleared between the two workloads.
  await db.prepare('DELETE FROM client_logs').run();let cursor=0;
  for(let seconds=0;seconds<=600;seconds+=interval){
   await mf.dispatchFetch('http://localhost/__clock?at='+(fixed+seconds*1000));
   const batch=[];while(cursor<logs.length&&logs[cursor].at<=fixed+seconds*1000)batch.push(logs[cursor++]);
   assert.equal((await post('/api/diagnostics',JSON.stringify({logs:batch}))).status,200);
  }
  const rows=(await db.prepare('SELECT data FROM client_logs ORDER BY created_at').all()).results;
  assert.deepEqual(rows.flatMap(r=>JSON.parse(r.data)),logs,'Batching preserves every observed sample');counts.push(rows.length);
 }
 assert.deepEqual(counts,[41,11]);
 assert.deepEqual(await db.prepare("SELECT * FROM worlds WHERE id='home'").first(),before);
 assert.equal((await db.prepare('SELECT count(*) AS n FROM agent_experiences').first()).n,0);
 console.log(JSON.stringify({suite:'write-churn-api',compiledWorker:true,isolatedD1:true,duplicateTicks:12,duplicateAuditRows:0,rejectedAuditPreserved:true,telemetryLogs:121,telemetryRowsBefore:counts[0],telemetryRowsAfter:counts[1],worldAndLearningPreserved:true,productionAccess:false}));
} finally {await mf.dispose();}
