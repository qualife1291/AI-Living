/** Native SQLite atomicity fixtures for GND3. No production DB access. */
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {meetingSteps} from '../lib/living/activities.ts';
import {runGroundAuthorityV3,authorityRequestSchema} from '../lib/living/ground-authority-service.ts';
import {groundAuthorityCommand} from './ground-authority.mjs';
import {AUTHORITY_SCOPE} from '../lib/living/ground-authority.ts';
import {runSharedGround,readSharedGround,preflightSharedGround} from '../lib/living/shared-ground-store.ts';
const base=Date.parse('2026-10-29T03:00:00Z');
class Fixture {
 constructor(authority=true){this.sql=new DatabaseSync(':memory:');this.sql.exec('PRAGMA foreign_keys=ON;CREATE TABLE worlds(id TEXT PRIMARY KEY,revision INTEGER,data TEXT);CREATE TABLE memories(id TEXT PRIMARY KEY,text TEXT);CREATE TABLE episodes(id TEXT PRIMARY KEY,data TEXT);CREATE TABLE learning_policies(actor_id TEXT PRIMARY KEY,data TEXT)');this.sql.exec(readFileSync('drizzle/0010_ground_shared.sql','utf8'));if(authority)this.sql.exec(readFileSync('drizzle/0011_ground_authority.sql','utf8'));this.world={...structuredClone(seed),born:new Date(base).toISOString(),living:initializeLiving(base),clock:{pausedAt:null,pausedMs:0,scale:60,anchors:[{realMs:base,simMs:0,scale:60}]}};this.world.living.residents=this.world.living.residents.slice(0,1);this.revision=0;this.sql.prepare("INSERT INTO worlds VALUES('home',0,?)").run(JSON.stringify(this.world));this.sql.exec("INSERT INTO memories VALUES('old','keep');INSERT INTO episodes VALUES('old','keep');INSERT INTO learning_policies VALUES('an','keep')");}
 prepare(sql,args=[]){return {sql,args,bind:(...a)=>this.prepare(sql,a),first:async()=>{const r=this.sql.prepare(sql).get(...args);return r?{...r}:null;},all:async()=>({results:this.sql.prepare(sql).all(...args).map(r=>({...r})),success:true,meta:{}})};}
 async batch(statements){if(this.beforeWrite){const fn=this.beforeWrite;this.beforeWrite=null;fn();}this.sql.exec('BEGIN IMMEDIATE');try{const r=statements.map(s=>/^SELECT/.test(s.sql)?{success:true,results:this.sql.prepare(s.sql).all(...s.args),meta:{changes:0}}:{success:true,results:[],meta:{changes:Number(this.sql.prepare(s.sql).run(...s.args).changes)}});this.sql.exec('COMMIT');return r;}catch(e){this.sql.exec('ROLLBACK');throw e;}}
 update(){this.sql.prepare("UPDATE worlds SET revision=?,data=? WHERE id='home'").run(++this.revision,JSON.stringify(this.world));}
 snapshot(){return JSON.stringify(['worlds','ground_shared_states','ground_shared_sources','ground_shared_batches','ground_authority_states','ground_authority_batches','memories','episodes','learning_policies'].map(t=>[t,this.sql.prepare(`SELECT * FROM ${t} ORDER BY 1`).all()]));}
}
const request=(session,head,action='advance',operationId=randomUUID())=>({action,sessionId:session,operationId,expectedCheckpoint:head});
async function setup(authority=true){const db=new Fixture(authority),session=randomUUID(),started=await runSharedGround(db,request(session,'new','start'),base);return {db,session,started};}
const optional=await setup(false),optionalBefore=JSON.stringify(optional.db.sql.prepare('SELECT * FROM ground_shared_states').all());
await assert.rejects(runSharedGround(optional.db,request(optional.session,optional.started.checkpoint),base,{activateAuthority:true}),/authority-schema/);assert.equal(JSON.stringify(optional.db.sql.prepare('SELECT * FROM ground_shared_states').all()),optionalBefore);assert(await preflightSharedGround(optional.db));
const {db,session,started}=await setup(),worldBefore=JSON.stringify(db.sql.prepare('SELECT * FROM worlds').all()),activate=request(session,started.checkpoint);
const active=await runSharedGround(db,activate,base,{activateAuthority:true});assert.equal(active.authority.sequence,1);assert.deepEqual(active.authority.counts,{arrivals:0,presence:0,encounters:0,heard:0});assert.equal(JSON.stringify(db.sql.prepare('SELECT * FROM worlds').all()),worldBefore,'Activation does not bootstrap/reset/update world');
assert(await preflightSharedGround(db));const stable=db.snapshot();const retry=await runSharedGround(db,activate,base+5000,{activateAuthority:true});assert(retry.duplicate);assert.equal(retry.authority.checkpoint,active.authority.checkpoint);assert.equal(db.snapshot(),stable,'Lost ACK repeats neither physics nor credit');
await assert.rejects(runSharedGround(db,activate,base),/operation-reused/);await assert.rejects(runSharedGround(db,request(session,active.checkpoint),base,{activateAuthority:true}),/already-active/);
const freshPlan=()=>({createdAt:new Date(base).toISOString(),pausedMs:0,from:'Sân chung',simStartedAt:0,steps:meetingSteps('Công viên','Gặp nhau')});
db.world.people[0].plan=freshPlan();db.world.living.residents[0].plan=freshPlan();db.world.livingTurn={id:'store-turn',createdAt:new Date(base).toISOString(),date:'2026-10-29',title:'Fixture',summary:'Not user history',location:'Công viên',activity:'Trò chuyện',kind:'social',residentId:db.world.living.residents[0].id,simStartedAt:0,dialogue:[{speaker:'an',text:'Chào bạn.'},{speaker:db.world.living.residents[0].id,text:'Mình đã nghe bạn.'}],generator:'rules',context:{date:'2026-10-29'}};db.update();
let head=active.checkpoint,result=active,iterations=0;
while(result.cursorRealMs<base+3600){assert(++iterations<100);result=await runSharedGround(db,request(session,head),base+3600);head=result.checkpoint;}
assert(result.authority.counts.arrivals>0&&result.authority.counts.presence>0&&result.authority.counts.heard===2,JSON.stringify(result));const view=await readSharedGround(db,base+3600);assert.equal(view.authority.state.parentCheckpoint,view.view.checkpoint);assert.equal(view.authority.state.cursorSimMs,view.view.simMs);assert(await preflightSharedGround(db));
assert.throws(()=>db.sql.exec('UPDATE ground_authority_batches SET created_at=0'),/immutable/);assert.throws(()=>db.sql.exec('DELETE FROM ground_authority_batches'),/immutable/);
// Each ignored/failed write must roll back BOTH heads and BOTH ledgers.
for(const target of ['ground_shared_states','ground_shared_batches','ground_authority_states','ground_authority_batches']){
 const before=db.snapshot(),operation=request(session,head);db.sql.exec(`CREATE TRIGGER qa_ignore BEFORE ${target.endsWith('states')?'UPDATE':'INSERT'} ON ${target} BEGIN SELECT RAISE(IGNORE);END`);
 await assert.rejects(runSharedGround(db,operation,base+3800));assert.equal(db.snapshot(),before,`Atomic rollback when ${target} silently ignores a write`);db.sql.exec('DROP TRIGGER qa_ignore');
}
const requests=[request(session,head),request(session,head)],parallel=await Promise.allSettled(requests.map(r=>runSharedGround(db,r,base+3800)));assert.equal(parallel.filter(r=>r.status==='fulfilled').length,1);const winner=parallel.find(r=>r.status==='fulfilled').value;head=winner.checkpoint;
const beforeRetry=db.snapshot(),winningRequest=requests[parallel.findIndex(r=>r.status==='fulfilled')];assert((await runSharedGround(db,winningRequest,base+3900)).duplicate);assert.equal(db.snapshot(),beforeRetry);
const beforeBroken=db.sql.prepare('SELECT revision,data FROM worlds').get();db.sql.exec('DROP TRIGGER ground_authority_batches_immutable_update');await assert.rejects(preflightSharedGround(db),/authority-schema/);assert.deepEqual(db.sql.prepare('SELECT revision,data FROM worlds').get(),beforeBroken,'Fail before any ordinary pulse write when active schema is incomplete');
assert.equal(db.sql.prepare("SELECT text FROM memories WHERE id='old'").get().text,'keep');assert.equal(db.sql.prepare("SELECT data FROM learning_policies WHERE actor_id='an'").get().data,'keep');
// Service/CLI admission never starts the shared world implicitly and never retries.
const empty=new Fixture(),emptyBefore=empty.snapshot(),status=await runGroundAuthorityV3(empty,authorityRequestSchema.parse({}),base);
assert.equal(status.exists,false);assert.equal(status.sharedExists,false);assert.equal(status.schemaReady,true);assert.equal(empty.snapshot(),emptyBefore);
await assert.rejects(runGroundAuthorityV3(empty,authorityRequestSchema.parse({action:'start',sessionId:randomUUID(),operationId:randomUUID(),expectedCheckpoint:'a'.repeat(64)}),base),/start-requires-shared/);assert.equal(empty.snapshot(),emptyBefore);
assert.equal(authorityRequestSchema.safeParse({action:'advance'}).success,false);assert.equal(authorityRequestSchema.safeParse({action:'status',positions:[[1,2]]}).success,false);assert.equal(authorityRequestSchema.safeParse({action:'start',simMs:0}).success,false);
let sends=0;const command=await groundAuthorityCommand({origin:'http://127.0.0.1:5173'},async(url,request)=>{sends++;assert.equal(url.pathname,'/api/living/ground/authority');assert.equal(request.method,'POST');assert.equal(JSON.parse(request.body).action,'status');return Response.json(status);});assert.equal(command.scope,AUTHORITY_SCOPE);assert.equal(sends,1);
await assert.rejects(groundAuthorityCommand({origin:'https://example.com'},()=>{throw Error('must not send');}),/loopback/);
await assert.rejects(groundAuthorityCommand({origin:'http://127.0.0.1:5173'},async()=>Response.json({...status,eligibleForReward:true})),/unconfirmed/);
await assert.rejects(groundAuthorityCommand({origin:'http://127.0.0.1:5173'},async()=>new Response(' '.repeat(32769))),/response-budget/);
const service=await setup(),serviceRequest=authorityRequestSchema.parse({action:'start',sessionId:service.session,operationId:randomUUID(),expectedCheckpoint:service.started.checkpoint}),serviceStarted=await runGroundAuthorityV3(service.db,serviceRequest,base);assert.equal(serviceStarted.mode,'started');assert.equal(serviceStarted.scope,AUTHORITY_SCOPE);assert.notEqual(serviceStarted.checkpoint,serviceStarted.sharedCheckpoint);assert((await runGroundAuthorityV3(service.db,serviceRequest,base+100)).duplicate);
console.log(JSON.stringify({suite:'ground-authority-store',nativeSQLite:true,optionalInactiveSchema:true,explicitCoupledStart:true,baselineNotCredited:true,lostAckNoCredit:true,actualReplayCounts:result.authority.counts,exactParentBinding:true,immutableLedger:true,ignoredWriteRollback:4,concurrentOneCommit:true,preflightBeforeWorldWrites:true,serviceNoBootstrap:true,cliStrictLoopbackBodyAckAnd32KiB:true,worldReset:false,training:false}));
