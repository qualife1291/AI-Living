/** Actual compiled Worker + isolated D1; never requests a remote environment. */
import assert from 'node:assert/strict';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import {realpathSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json'))),{Miniflare,Log,LogLevel}=require('miniflare');
const files=readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js'&&!p.split('/').includes('.wrangler'));
// Vite can emit a manifest before index.js alphabetically; entry must be explicit.
const modules=['index.js',...files].map(p=>({type:'ESModule',path:resolve('dist/server',p)}));
const options={cf:false,outboundService:async()=>new Response('',{status:503}),log:new Log(LogLevel.ERROR),modules,modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],inspectorPort:0};
const mf=new Miniflare({...options,bindings:{XOM_LOCAL_ADMIN:'true',XOM_SYSTEM_LOGS:'true'}}),denied=new Miniflare({...options,bindings:{XOM_LOCAL_ADMIN:'false',XOM_SYSTEM_LOGS:'true'}});
try{
 const url='http://localhost/api/system/progress';
 const noOwner=await denied.dispatchFetch(url,{headers:{'x-request-id':'PRIVATE'}});assert.equal(noOwner.status,403);assert.match(noOwner.headers.get('X-Request-Id'),/^[a-f0-9-]{36}$/);assert.notEqual(noOwner.headers.get('X-Request-Id'),'PRIVATE');
 const db=await mf.getD1Database('DB');for(const m of readMigrationFiles({migrationsFolder:'drizzle'}))for(const sql of m.sql)await db.prepare(sql).run();
 assert.equal((await mf.dispatchFetch(url)).status,503);assert.equal((await db.prepare('SELECT count(*) AS n FROM worlds').first()).n,0,'Read-only inspector does not bootstrap');
 const born='2026-10-29T02:00:00.000Z';await db.prepare("INSERT INTO worlds VALUES ('home',7,?)").bind(JSON.stringify({born,paused:false,private:'PRIVATE_WORLD'})).run();
 const snapshot=async()=>{const all=[];for(const table of ['worlds','episodes','memories','learning_policies','agent_experiences','context_cache','client_logs','tick_runs','living_turns'])all.push((await db.prepare(`SELECT * FROM ${table}`).all()).results);return JSON.stringify(all);};
 const before=await snapshot(),responses=await Promise.all(Array.from({length:12},()=>mf.dispatchFetch(url)));
 assert(responses.every(r=>r.status===200));assert.equal(new Set(responses.map(r=>r.headers.get('X-Request-Id'))).size,12);
 for(const r of responses){assert.equal(r.headers.get('Cache-Control'),'private, no-store');const text=await r.text();assert(!text.includes('PRIVATE'));const value=JSON.parse(text);assert.equal(value.worldBorn,born);assert.equal(value.revision,7);assert.equal(value.completedTicks,0);assert.equal(value.environment,'local');}
 assert.equal(await snapshot(),before,'Concurrent inspector reads never change persisted state or diagnostics');
 // Check router canonicalization cannot turn an unauthenticated alias into a
 // private route after the Worker classified the original URL.
 await mf.setOptions({...options,bindings:{XOM_LOCAL_ADMIN:'false',XOM_SYSTEM_LOGS:'true',XOM_QA_HOSTNAME:'ai-living-qa.hoanglonglea1mtl.workers.dev',XOM_QA_ACCESS_AUD:'test-audience',XOM_QA_ACCESS_TEAM_DOMAIN:'test.cloudflareaccess.com'}});
 const aliases=['/api/system/progress','/api/system/progress/','//api/system/progress','/api/%73ystem/progress','/api/system/%70rogress','/api/system%2Fprogress'];
 const aliasResults=[];
 for(const path of aliases){const r=await mf.dispatchFetch('https://ai-living-qa.hoanglonglea1mtl.workers.dev'+path);aliasResults.push({path,status:r.status});}
 console.log(JSON.stringify({suite:'progress-private-aliases',results:aliasResults}));
 assert(aliasResults.every(x=>[400,403,404,301,302,307,308].includes(x.status)),'Private aliases must never reach the aggregate inspector');
 for(const path of ['/api/diagnostics/','/api/living/memories/','/api/living/learning/?format=jsonl'])assert.equal((await mf.dispatchFetch('https://ai-living-qa.hoanglonglea1mtl.workers.dev'+path)).status,403,'Existing private reader aliases also require owner authorization');
 await mf.setOptions({...options,bindings:{XOM_LOCAL_ADMIN:'true',XOM_SYSTEM_LOGS:'true'}});
 await db.prepare('DROP TABLE learning_policies').run();assert.equal((await mf.dispatchFetch(url)).status,503);assert.equal((await db.prepare('SELECT revision FROM worlds').first()).revision,7);
 assert.equal((await mf.dispatchFetch('https://public.invalid/api/system/progress')).status,403,'Local admin does not grant remote inspector access');
 console.log(JSON.stringify({suite:'progress-compiled-http',concurrentReaders:12,ownerGate:true,loopbackGate:true,noBootstrap:true,noWrites:true,noPrivatePayloads:true,missingSchema503:true,requestCorrelation:true,productionAccess:false}));
}finally{await mf.dispose();await denied.dispose();}
