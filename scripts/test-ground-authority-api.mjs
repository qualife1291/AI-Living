/** Compiled Worker + fresh ephemeral D1; no Site/user database or external context fetch. */
import assert from 'node:assert/strict';
import {readdirSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {meetingSteps} from '../lib/living/activities.ts';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json'))),{Miniflare}=require('miniflare'),initial=Date.now()+60000;
const files=readdirSync('dist/server',{recursive:true}).filter(p=>typeof p==='string'&&p.endsWith('.js'));
const options={modules:[{type:'ESModule',path:resolve('dist/server/__authority_fixture.mjs'),contents:`import worker from './index.js';const D=Date;let now=${initial};globalThis.Date=class extends D{constructor(...a){super(...(a.length?a:[now]))}static now(){return now}};export default{fetch(r,e,c){const u=new URL(r.url);if(u.pathname==='/__fixture/time'){now=Number(u.searchParams.get('at'));return Response.json({ok:true})}return worker.fetch(r,e,c)}}`},...files.map(p=>({type:'ESModule',path:resolve('dist/server',p)}))],modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{XOM_LOCAL_ADMIN:'false',XOM_ADMIN_USER_ID:'fixture-owner'},outboundService:()=>new Response('Context intentionally unavailable in isolated fixture',{status:503}),inspectorPort:0};
const mf=new Miniflare(options),origin='http://localhost',authorityUrl=origin+'/api/living/ground/authority',sharedUrl=origin+'/api/living/ground/shared';
const post=(body,headers={},url=authorityUrl)=>mf.dispatchFetch(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body)});
const tick=at=>mf.dispatchFetch(`${origin}/__fixture/time?at=${at}`);
async function ack(response){assert.equal(response.status,200,await response.clone().text());return response.json();}
try{
 assert.equal((await post({})).status,403);assert.equal((await post({},{'oai-authenticated-user-id':'fixture-owner'})).status,403);
 await mf.setOptions({...options,bindings:{XOM_LOCAL_ADMIN:'true',XOM_ADMIN_USER_ID:'fixture-owner'}});
 assert.equal((await post({},{'oai-authenticated-user-id':'fixture-owner'},'https://owner-private.example/api/living/ground/authority')).status,403);
 assert.equal((await post({},{origin:'https://wrong.invalid'})).status,403);assert.equal((await post('{')).status,400);assert.equal((await post(new Uint8Array([0xc0,0xaf]))).status,400);
 for(const bad of [{positions:[[1,2]]},{simMs:12000},{action:'advance'},{action:'start'}])assert.equal((await post(bad)).status,400);
 assert.equal((await post(JSON.stringify({text:'đ'.repeat(1100)}))).status,413);assert.equal((await post({})).status,503);
 const db=await mf.getD1Database('DB');assert.equal((await db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='worlds'").first()).n,0);
 const migrations=readMigrationFiles({migrationsFolder:'drizzle'}),isAuthority=m=>m.sql.some(sql=>sql.includes('CREATE TABLE `ground_authority_batches`'));
 for(const m of migrations.filter(m=>!isAuthority(m)))for(const sql of m.sql)await db.prepare(sql).run();
 const world={...structuredClone(seed),born:new Date(initial).toISOString(),living:initializeLiving(initial),clock:{pausedAt:null,pausedMs:0,scale:60,anchors:[{realMs:initial,simMs:0,scale:60}]}};world.living.residents=world.living.residents.slice(0,1);
 await db.prepare("INSERT INTO worlds VALUES('home',0,?)").bind(JSON.stringify(world)).run();await db.prepare("INSERT INTO memories(id,person_id,event_id,text,created_at) VALUES('keep','an','old','Giữ nguyên ký ức',?)").bind(new Date(initial).toISOString()).run();
 const status=await ack(await post({}));assert.equal(status.exists,false);assert.equal(status.sharedExists,false);assert.equal(status.schemaReady,false);
 const notStarted={action:'start',sessionId:randomUUID(),operationId:randomUUID(),expectedCheckpoint:'a'.repeat(64)};assert.equal((await post(notStarted)).status,409);assert.equal((await db.prepare('SELECT count(*) n FROM ground_shared_states').first()).n,0);
 const sessionId=randomUUID(),started=await ack(await post({action:'start',sessionId,operationId:randomUUID()},{},sharedUrl));const activation={action:'start',sessionId,operationId:randomUUID(),expectedCheckpoint:started.checkpoint},beforeMissing=(await db.prepare('SELECT * FROM ground_shared_states').all()).results;
 assert.equal((await post(activation)).status,503);assert.deepEqual((await db.prepare('SELECT * FROM ground_shared_states').all()).results,beforeMissing);
 for(const m of migrations.filter(isAuthority))for(const sql of m.sql)await db.prepare(sql).run();
 const beforeWorld=(await db.prepare('SELECT * FROM worlds').all()).results,active=await ack(await post(activation));assert.equal(active.scope,'server-ground-authority-v1');assert.equal(active.counts.heard,0);assert.deepEqual((await db.prepare('SELECT * FROM worlds').all()).results,beforeWorld);
 const snapshot=async()=>Promise.all(['ground_shared_states','ground_shared_batches','ground_authority_states','ground_authority_batches'].map(async table=>[table,(await db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results]));
 const savedStart=await snapshot();await tick(initial+1000);const duplicate=await ack(await post(activation));assert(duplicate.duplicate);assert.equal(duplicate.checkpoint,active.checkpoint);assert.deepEqual(await snapshot(),savedStart);
 assert.equal((await post({action:'advance',sessionId,operationId:activation.operationId,expectedCheckpoint:started.checkpoint},{},sharedUrl)).status,409);
 const readView=async()=>{const r=await mf.dispatchFetch(origin+'/api/world?ground=shared');assert.equal(r.status,200,await r.clone().text());return r.json();};let view=await readView();assert.equal(view.sharedAuthority.parentCheckpoint,view.sharedGround.checkpoint);assert.equal(view.sharedAuthority.parentSequence,view.sharedGround.sequence);assert.equal(view.sharedAuthority.utterances.length,0);assert.equal(view.sharedAuthority.eligibleForReward,false);
 const peer=world.living.residents[0],plan=()=>({createdAt:new Date(initial).toISOString(),pausedMs:0,from:'Sân chung',simStartedAt:0,steps:meetingSteps('Công viên','Gặp bạn có nguồn')});world.people[0].plan=plan();peer.plan=plan();world.livingTurn={id:'api-ground-turn',createdAt:new Date(initial).toISOString(),date:'2026-10-29',title:'Fixture',summary:'Not user history',location:'Công viên',activity:'Trò chuyện',kind:'social',residentId:peer.id,simStartedAt:0,dialogue:[{speaker:'an',text:'Chào bạn, mình đã đến rồi.'},{speaker:peer.id,text:'Mình đã nghe bạn.'}],generator:'rules',context:{date:'2026-10-29'}};
 await db.prepare("UPDATE worlds SET revision=revision+1,data=? WHERE id='home'").bind(JSON.stringify(world)).run();await tick(initial+3600);
 const make=head=>({action:'advance',sessionId,operationId:randomUUID(),expectedCheckpoint:head}),parallel=await Promise.all([post(make(active.sharedCheckpoint),{},sharedUrl),post(make(active.sharedCheckpoint),{},sharedUrl)]);assert.equal(parallel.filter(r=>r.status===200).length,1);assert.equal(parallel.filter(r=>r.status===409).length,1);
 let result=await parallel.find(r=>r.status===200).json(),head=result.checkpoint,iterations=0;
 while(result.cursorRealMs<initial+3600){assert(++iterations<100);result=await ack(await post(make(head),{},sharedUrl));head=result.checkpoint;}
 assert(result.authority.counts.arrivals>0&&result.authority.counts.presence>0&&result.authority.counts.heard===2,JSON.stringify(result));
 view=await readView();assert.equal(view.sharedAuthority.parentCheckpoint,head);assert.equal(view.sharedAuthority.simMs,view.sharedGround.simMs);assert.equal(view.sharedAuthority.utterances.filter(u=>u.completed).length,2);
 assert.deepEqual((await db.prepare('SELECT * FROM worlds').all()).results,beforeWorld.map(r=>({...r,revision:1,data:JSON.stringify(world)})));assert.equal((await db.prepare("SELECT text FROM memories WHERE id='keep'").first()).text,'Giữ nguyên ký ức');
 await assert.rejects(db.prepare('UPDATE ground_authority_batches SET created_at=0').run());await assert.rejects(db.prepare('DELETE FROM ground_authority_batches').run());
 for(const table of ['ground_shared_states','ground_shared_batches','ground_authority_states','ground_authority_batches']){const before=await snapshot();await db.prepare(`CREATE TRIGGER ignore_authority_fixture BEFORE ${table.endsWith('states')?'UPDATE':'INSERT'} ON ${table} BEGIN SELECT RAISE(IGNORE);END`).run();await tick(initial+3800);assert.equal((await post(make(head),{},sharedUrl)).status,503);assert.deepEqual(await snapshot(),before,`D1 must roll back both ledgers if ${table} silently ignores a write`);await db.prepare('DROP TRIGGER ignore_authority_fixture').run();}
 const oldOperation=make(head),zero=await ack(await post(oldOperation,{},sharedUrl)),afterOnce=await snapshot();assert((await ack(await post(oldOperation,{},sharedUrl))).duplicate);assert.deepEqual(await snapshot(),afterOnce);head=zero.checkpoint;
 await tick(initial+5000);const pulse=await ack(await post({}, {},origin+'/api/living/pulse'));assert(pulse.sharedGround?.authority,'Existing pulse couples authority without a new scheduler');
 const beforePreflight=(await db.prepare('SELECT * FROM worlds').all()).results;await db.prepare('DROP TRIGGER ground_authority_batches_immutable_update').run();await tick(initial+6000);assert.equal((await post({}, {},origin+'/api/living/pulse')).status,503);assert.deepEqual((await db.prepare('SELECT * FROM worlds').all()).results,beforePreflight,'Incomplete active0011 is rejected before world writes');
 console.log(JSON.stringify({suite:'ground-authority-api',compiledWorker:true,ephemeralD1:true,ownerLocalRemoteAndOriginGuards:true,bodyUtf8And2KiB:true,noBootstrapOrClientPositions:true,optionalInactive0011:true,explicitStartBaseline:true,coupledCAS:true,concurrentOneCommit:true,actualReplayCounts:result.authority.counts,immutableReceipts:true,silentIgnoreRollback:4,lostAckNoCredit:true,worldViewParentBound:true,reusedPulse:true,preflightBeforeWorldWrite:true,userMemoryPreserved:true,productionAccess:false,eligibleForReward:false,eligibleForP2P:false}));
}finally{await mf.dispose();}
