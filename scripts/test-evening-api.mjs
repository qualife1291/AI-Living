/** Compiled Worker, isolated D1; all nine new arms through real settlement CAS. */
import assert from 'node:assert/strict';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import {realpathSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {eveningActions,initializeAgent,EVENING_SCENARIO_SIGNATURE} from '../lib/living/learning.ts';
import {runtimePlace} from '../lib/living/evening-life.ts';
import {planKey} from '../lib/living/plan-identity.ts';
import {decisionContext} from '../lib/living/linucb.ts';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json'))),{Miniflare,Log,LogLevel}=require('miniflare');
const paths=readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js'&&!p.split('/').includes('.wrangler'));
const mf=new Miniflare({cf:false,outboundService:async()=>new Response('',{status:503}),log:new Log(LogLevel.ERROR),modules:['index.js',...paths].map(p=>({type:'ESModule',path:resolve('dist/server',p)})),modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{XOM_LOCAL_ADMIN:'true'},inspectorPort:0});
try{
 const db=await mf.getD1Database('DB');for(const m of readMigrationFiles({migrationsFolder:'drizzle'}))for(const sql of m.sql)await db.prepare(sql).run();
 const now=Date.now(),world=structuredClone(seed);world.born=new Date(now-86400000).toISOString();world.living=initializeLiving(now);world.living.lifeScheduleVersion=1;
 world.clock={scale:1,pausedAt:null,pausedMs:0,anchors:[{realMs:now,simMs:180001,scale:1}]};
 const actors=[...world.people,...world.living.residents.slice(0,6)];
 for(const [i,s] of eveningActions.entries()){
  const actor=actors[i],location=runtimePlace(s,actor.id);
  actor.plan={createdAt:new Date(now-180000).toISOString(),simStartedAt:0,pausedMs:0,from:location,transport:'walk',generator:'rules',steps:[{location,activity:s.title,kind:s.kind,duration:180}]};
  const a=initializeAgent(actor.id);a.needsUpdatedSimMs=180001;
  a.pending={id:'evening-test-'+i,scenarioId:s.id,startedSimMs:0,durationMs:180000,completed:false,planKey:planKey(actor.plan),context:decisionContext(a,{status:'unavailable',temperature:null,precipitation:null})};
  world.living.learning??={};world.living.learning[actor.id]=a;
 }
 await db.prepare("INSERT INTO worlds(id,revision,data) VALUES ('home',1,?)").bind(JSON.stringify(world)).run();
 const url='http://localhost/api/living/learning',request=()=>mf.dispatchFetch(url,{method:'POST',headers:{Origin:'http://localhost'}});
 const result=await request();assert.equal(result.status,200,await result.clone().text());
 const rows=(await db.prepare('SELECT data FROM agent_experiences').all()).results.map(r=>JSON.parse(r.data));
 assert.equal(rows.length,9);assert.equal(new Set(rows.map(r=>r.id)).size,9);
 for(const row of rows){assert.equal(row.rewardEvidence.scenarioSignature,EVENING_SCENARIO_SIGNATURE);assert.equal(row.rewardEvidence.authority,'simulation-plan-time-v1');assert.equal(row.source,'simulation');}
 assert.deepEqual(rows.map(r=>r.scenarioId).sort(),eveningActions.map(s=>s.id).sort());
 const stored=JSON.parse((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data);
 assert.equal(stored.born,world.born);assert.deepEqual(stored.living.petOwners,world.living.petOwners);
 for(const actor of actors)assert.equal(stored.living.learning[actor.id].samples,1);
 const policies=(await db.prepare('SELECT data FROM learning_policies').all()).results;
 assert.equal(policies.length,9);for(const row of policies)assert.equal(Object.values(JSON.parse(row.data))[0].samples,1,'Personal LinUCB posterior must persist separately');
 const retries=await Promise.all([request(),request(),request()]);assert(retries.every(r=>[200,409].includes(r.status)));
 assert.equal((await db.prepare('SELECT count(*) AS n FROM agent_experiences').first()).n,9,'Retries cannot duplicate earned samples');
 console.log(JSON.stringify({suite:'evening-api',pass:true,compiledWorker:true,isolatedD1:true,newActionsSettled:9,namespaceEvidence:true,retries:3,duplicateSamples:0,identityAndPetOwnersPreserved:true,productionAccess:false,physicalCompletionProven:false}));
}finally{await mf.dispose();}
