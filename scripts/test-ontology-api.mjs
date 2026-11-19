/** Real compiled Worker routing: feature off, scoped auth, hostile streams and legacy boundaries. */
import assert from 'node:assert/strict';
import {realpathSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readMigrationFiles} from 'drizzle-orm/migrator';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json'))),{Miniflare,Log,LogLevel}=require('miniflare');
const paths=readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js'&&!p.split('/').includes('.wrangler'));
const probe=`import worker from './index.js';export default{async fetch(req,env,ctx){if(new URL(req.url).pathname!=='/__probe')return worker.fetch(req,env,ctx);let reads=0,cancelled=false;const stream=new ReadableStream({pull(c){reads++;if(reads===1)c.enqueue(new Uint8Array(8193));else c.error(Error('Must not read tail'));},cancel(){cancelled=true;return new Promise(()=>{})}},{highWaterMark:0});const r=await worker.fetch(new Request('http://localhost/api/ontology/actions',{method:'POST',headers:{Origin:'http://localhost'},body:stream,duplex:'half'}),env,ctx);return Response.json({status:r.status,reads,cancelled});}};`;
const options={cf:false,modules:[{type:'ESModule',path:resolve('dist/server/__ontology_probe.mjs'),contents:probe},...['index.js',...paths].map(p=>({type:'ESModule',path:resolve('dist/server',p)}))],modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{XOM_LOCAL_ADMIN:'true',XOM_ONTOLOGY_ENABLED:'false'},inspectorPort:0,log:new Log(LogLevel.ERROR),outboundService:()=>new Response('No real network in fixture',{status:503})};
const mf=new Miniflare(options);let cases=0;
try{
 let db=await mf.getD1Database('DB');
 assert.deepEqual(await(await mf.dispatchFetch('http://localhost/__probe',{signal:AbortSignal.timeout(5000)})).json(),{status:503,reads:0,cancelled:false});cases++;
 await mf.setOptions({...options,bindings:{XOM_LOCAL_ADMIN:'true',XOM_ONTOLOGY_ENABLED:'true'}});db=await mf.getD1Database('DB');
 assert.equal((await mf.dispatchFetch('https://outside.example/api/ontology')).status,403);assert.equal((await mf.dispatchFetch('http://localhost/api/ontology')).status,503);cases++;
 for(const m of readMigrationFiles({migrationsFolder:'drizzle'}))for(const sql of m.sql)await db.prepare(sql).run();
 const before=JSON.stringify((await db.prepare('SELECT * FROM worlds').all()).results);
 assert.deepEqual(await(await mf.dispatchFetch('http://localhost/__probe',{signal:AbortSignal.timeout(5000)})).json(),{status:413,reads:1,cancelled:true});cases++;
 let revision=0;const action=async(type,input={})=>{
  const r=await mf.dispatchFetch('http://localhost/api/ontology/actions',{method:'POST',headers:{Origin:'http://localhost','content-type':'application/json'},body:JSON.stringify({operationId:crypto.randomUUID(),expectedRevision:revision,action:{type,input}})}),v=await r.json();assert.equal(r.status,200,JSON.stringify(v));revision=v.revision;return v;
 };
 await action('workspace.initialize');await action('agent.register',{id:'agent:limited',name:'Limited',roles:['reader']});const issued=await action('credential.issue',{agentId:'agent:limited',ttlSeconds:3600}),token=issued.data.token;cases++;
 const headers={Authorization:'Bearer '+token,'X-Ontology-Role':'owner','oai-authenticated-user-id':'fake'};
 for(const view of ['schema','actions','entities','relationships','analysis']){assert.equal((await mf.dispatchFetch('http://localhost/api/ontology?view='+view,{headers})).status,200,view);cases++;}
 for(const url of ['/api/world','/api/events','/api/living/tick','/api/living/learning','/api/living/catalog','/api/living/appearance','/api/living/pets','/api/living/ground','/api/system/progress','/api/diagnostics']){
  assert.equal((await mf.dispatchFetch('http://localhost'+url,{method:'POST',headers,body:'{}'})).status,403,url);cases++;
 }
 for(const suffix of ['', '/'])assert.equal((await mf.dispatchFetch('https://outside.example/api/ontology'+suffix)).status,403);cases++;
 const denied=await mf.dispatchFetch('http://localhost/api/ontology/actions',{method:'POST',headers:{...headers,Origin:'http://localhost'},body:JSON.stringify({operationId:crypto.randomUUID(),expectedRevision:revision,action:{type:'agent.configure',input:{id:'agent:limited',roles:['maintainer'],active:true}}})});assert.equal(denied.status,403);cases++;
 const deniedRows=(await db.prepare("SELECT count(*) n FROM ontology_audit WHERE json_extract(result,'$.code')='OWNER_REQUIRED'").first()).n;assert.equal(deniedRows,1);cases++;
 assert.equal((await mf.dispatchFetch('http://localhost/api/ontology?role=owner',{headers})).status,400);
 assert.equal((await mf.dispatchFetch('http://localhost/api/ontology?limit=0',{headers})).status,400);
 assert.equal((await mf.dispatchFetch('http://localhost/api/ontology?limit=1&limit=2',{headers})).status,400);
 assert.equal((await mf.dispatchFetch('http://localhost/api/ontology?revision=0',{headers})).status,409);cases++;
 const streamMalformed=await mf.dispatchFetch('http://localhost/api/ontology/actions',{method:'POST',body:new Uint8Array([34,255,34])});assert.equal(streamMalformed.status,400);cases++;
 assert.equal(JSON.stringify((await db.prepare('SELECT * FROM worlds').all()).results),before,'Ontology GET/auth/action cannot bootstrap simulation');cases++;
 assert.equal((await db.prepare('SELECT revision FROM ontology_states').first()).revision,revision);cases++;
 console.log(JSON.stringify({suite:'ontology-compiled-api',cases,compiledWorker:true,passed:true,isolatedD1:true,featureOffNoRead:true,scopeDoesNotGrantLegacyOwner:true,headerRolesIgnored:true,overflowSingleRead:true,nonCooperativeCancel:true,noWorldBootstrap:true,realNetwork:false,productionAccess:false}));
}finally{await mf.dispose();}
