/** Actual compiled routes with isolated D1 and in-isolate hostile streams. */
import assert from 'node:assert/strict';
import {realpathSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json'))),{Miniflare,Log,LogLevel}=require('miniflare');
const paths=readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js'&&!p.split('/').includes('.wrangler'));
const probe=`import worker from './index.js';
export default {async fetch(req,env,ctx){
 const u=new URL(req.url);if(u.pathname!=='/__probe')return worker.fetch(req,env,ctx);
 let reads=0,cancelled=false;const size=Number(u.searchParams.get('limit'));
 const body=new ReadableStream({pull(c){reads++;if(reads===1)c.enqueue(new Uint8Array(size+1).fill(32));else c.error(Error('tail must not be read'));},cancel(){cancelled=true;return new Promise(()=>{});}},{highWaterMark:0});
 const request=new Request('http://localhost'+u.searchParams.get('path'),{method:'POST',headers:{Origin:'http://localhost'},body,duplex:'half'});
 const response=await worker.fetch(request,env,ctx);
 return Response.json({status:response.status,reads,cancelled});
}};`;
const options={cf:false,log:new Log(LogLevel.ERROR),modules:[{type:'ESModule',path:resolve('dist/server/__probe.mjs'),contents:probe},...['index.js',...paths].map(p=>({type:'ESModule',path:resolve('dist/server',p)}))],modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{XOM_LOCAL_ADMIN:'true'},inspectorPort:0};
const mf=new Miniflare(options);
try {
 const db=await mf.getD1Database('DB');
 const schema=async()=>(await db.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT GLOB '_cf_*' ORDER BY name").all()).results;
 const initial=await schema();
 // Invalid cursors must be rejected without bootstrap or policy hydration.
 for(const query of ['after=-1','after=1.5','limit=0','limit=1001','limit=NaN']){
  const response=await mf.dispatchFetch('http://localhost/api/living/learning?format=jsonl&'+query);
  assert.equal(response.status,400,'Validate cursor before accessing absent world/policy tables');
 }
 assert.deepEqual(await schema(),initial);
 // An archive-only DB deliberately has no worlds/episodes/learning_policies.
 await db.prepare('CREATE TABLE agent_experiences(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE,data TEXT)').run();
 for(let i=1;i<=3;i++)await db.prepare('INSERT INTO agent_experiences(id,data) VALUES (?,?)').bind('sample-'+i,JSON.stringify({id:'sample-'+i,source:'simulation'})).run();
 const before=JSON.stringify((await db.prepare('SELECT * FROM agent_experiences ORDER BY seq').all()).results),schemaBefore=await schema();
 const responses=await Promise.all(Array.from({length:12},()=>mf.dispatchFetch('http://localhost/api/living/learning?format=jsonl&after=1&limit=1')));
 for(const response of responses){
  assert.equal(response.status,200);assert.equal(response.headers.get('x-next-cursor'),'2');
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual((await response.text()).trim().split('\n').map(JSON.parse),[{id:'sample-2',source:'simulation'}]);
 }
 const empty=await mf.dispatchFetch('http://localhost/api/living/learning?format=jsonl&after=3');assert.equal(await empty.text(),'');assert.equal(empty.headers.get('x-next-cursor'),'3');
 assert.equal(JSON.stringify((await db.prepare('SELECT * FROM agent_experiences ORDER BY seq').all()).results),before);
 assert.deepEqual(await schema(),schemaBefore,'Export cannot create a world or require policy tables');
 const limits={'/api/world':2000,'/api/events':20000,'/api/visits':200,'/api/living/tick':12000,'/api/living/catalog':32000,'/api/living/appearance':4000,'/api/diagnostics':16384};
 for(const [path,limit] of Object.entries(limits)){
  const response=await mf.dispatchFetch('http://localhost/__probe?'+new URLSearchParams({path,limit:String(limit)}),{signal:AbortSignal.timeout(2500)});
  const result=await response.json();assert.deepEqual(result,{status:413,reads:1,cancelled:true},path);
  const invalid=await mf.dispatchFetch('http://localhost'+path,{method:'POST',headers:{Origin:'http://localhost'},body:new Uint8Array([34,255,34])});assert.equal(invalid.status,400,path+': malformed UTF-8');
 }
 assert.deepEqual(await schema(),schemaBefore,'Rejected streams do not reach persistence or audit writes');
 await mf.setOptions({...options,bindings:{XOM_LOCAL_ADMIN:'false'}});
 const denied=await mf.dispatchFetch('http://localhost/api/living/learning?format=jsonl&after=-1');assert.equal(denied.status,403);
 for(const [path,limit] of Object.entries(limits)){
  const result=await (await mf.dispatchFetch('http://localhost/__probe?'+new URLSearchParams({path,limit:String(limit)}))).json();
  assert.deepEqual(result,{status:403,reads:0,cancelled:false},path+': owner check precedes body consumption');
 }
 console.log(JSON.stringify({suite:'api-resource-budgets',compiledWorker:true,isolatedD1:true,archiveReaders:12,invalidCursorWithoutDatabase:true,archiveRequiresWorldOrPolicy:false,streamLimitedRoutes:7,overflowReads:1,nonCooperativeCancel:true,invalidUtf8:true,ownerBeforeBody:true,noWrites:true,productionAccess:false}));
} finally {await mf.dispose();}
