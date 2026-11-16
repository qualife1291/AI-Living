/** Learning-first fare settlement through compiled HTTP, isolated D1 only. */
import assert from 'node:assert/strict';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import {realpathSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {initializeAgent,transportActions} from '../lib/living/learning.ts';
import {planKey} from '../lib/living/plan-identity.ts';
import {decisionContext} from '../lib/living/linucb.ts';
import {fareForAction} from '../lib/city/mobility-economy.ts';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json'))),{Miniflare,Log,LogLevel}=require('miniflare');
const paths=readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js'&&!p.split('/').includes('.wrangler'));
const mf=new Miniflare({cf:false,outboundService:async()=>new Response('',{status:503}),log:new Log(LogLevel.ERROR),modules:['index.js',...paths].map(p=>({type:'ESModule',path:resolve('dist/server',p)})),modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{XOM_LOCAL_ADMIN:'true'},inspectorPort:0});
try {
 const db=await mf.getD1Database('DB');for(const m of readMigrationFiles({migrationsFolder:'drizzle'}))for(const sql of m.sql)await db.prepare(sql).run();
 const now=Date.now(),world=structuredClone(seed);world.born=new Date(now-86400000).toISOString();world.living=initializeLiving(now);
 world.clock={scale:1,pausedAt:null,pausedMs:0,anchors:[{realMs:now,simMs:180001,scale:1}]};
 const initialBalances=new Map(world.people.map(p=>[p.id,p.money]));
 for(const [i,s] of transportActions.entries()){
  const actor=world.people[i];actor.plan={createdAt:new Date(now-180000).toISOString(),simStartedAt:0,pausedMs:0,from:s.place,transport:s.transport,generator:'rules',steps:[{location:s.place,activity:s.title,kind:s.kind,duration:180}]};
  const agent=initializeAgent(actor.id);agent.needsUpdatedSimMs=180001;
  agent.pending={id:'paid-learning-'+i,scenarioId:s.id,startedSimMs:0,durationMs:180000,completed:false,planKey:planKey(actor.plan),context:decisionContext(agent,{status:'unavailable',temperature:null,precipitation:null})};
  world.living.learning??={};world.living.learning[actor.id]=agent;
 }
 await db.prepare("INSERT INTO worlds(id,revision,data) VALUES ('home',1,?)").bind(JSON.stringify(world)).run();
 const post=path=>mf.dispatchFetch('http://localhost'+path,{method:'POST',headers:{Origin:'http://localhost','content-type':'application/json'},body:'{}'});
 const responses=await Promise.all(Array.from({length:8},()=>post('/api/living/learning')));
 for(const response of responses)assert([200,409].includes(response.status));
 const snapshot=async()=>JSON.parse((await db.prepare("SELECT data FROM worlds WHERE id='home'").first()).data);
 const learned=await snapshot();assert.equal(learned.mobilityPayments.length,3,'Learning-first must charge every verified fare');
 assert.equal((await db.prepare('SELECT count(*) AS n FROM agent_experiences').first()).n,3);
 for(const [i,s] of transportActions.entries()){
  const actor=world.people[i],payer=learned.people.find(p=>p.id===actor.id);
  assert.equal(payer.money,initialBalances.get(actor.id)-fareForAction(s.id));
  assert.equal(learned.living.learning[actor.id].samples,1);
 }
 const policyBefore=(await db.prepare('SELECT * FROM learning_policies ORDER BY actor_id').all()).results;
 assert.equal((await post('/api/living/tick')).status,200);
 const ticked=await snapshot();assert.deepEqual(ticked.mobilityPayments,learned.mobilityPayments,'Tick after learning must not charge again');
 for(const payer of learned.people)assert.equal(ticked.people.find(p=>p.id===payer.id).money,payer.money);
 for(const row of policyBefore)assert.deepEqual(await db.prepare('SELECT * FROM learning_policies WHERE actor_id=?').bind(row.actor_id).first(),row);
 assert.equal((await db.prepare('SELECT count(*) AS n FROM agent_experiences').first()).n,3);
 console.log(JSON.stringify({suite:'mobility-learning-api',compiledWorker:true,isolatedD1:true,concurrentLearningRequests:8,completedFares:3,doubleCharges:0,duplicateSamples:0,unchangedPolicies:true,productionAccess:false}));
} finally {await mf.dispose();}
