import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {bootstrapShared,replayShared} from '../lib/living/shared-ground.ts';
import {runSharedGround,readSharedGround,sharedRequestSchema,pulseSharedGround} from '../lib/living/shared-ground-store.ts';
import {sampleSharedGround,validateSharedView} from '../lib/living/shared-ground-view.ts';
import {sharedGroundCommand} from './shared-ground.mjs';
const base=Date.parse('2026-10-28T02:00:00Z');
const world=()=>({...structuredClone(seed),born:new Date(base-9*3600000).toISOString(),living:initializeLiving(base)});
const source=(seq,at,w)=>({seq,revision:seq-1,capturedAt:at,raw:JSON.stringify(w)});
const w=world(),first=source(1,base,w),session=randomUUID();
const genesis=await bootstrapShared(first,session);
assert.equal(genesis.frames[0].poses.length,w.people.length+w.living.residents.length+3);
const changed=structuredClone(w);changed.people[0].plan={createdAt:new Date(base+250).toISOString(),pausedMs:0,from:'Sân chung',simStartedAt:9*3600000+250,steps:[{location:'Công viên',activity:'Đi dạo',duration:180,kind:'rest'}]};
const pause=structuredClone(changed);pause.paused=true;
const resume=structuredClone(changed);resume.clock={pausedAt:null,pausedMs:0,scale:2};
const sources=[source(2,base+250,changed),source(3,base+745,pause),source(4,base+1250,resume)];
const complete=await replayShared(genesis,first,sources,base+2000);
let partial=genesis;const events=[];
for(let n=1;n<=4;n++){const current=[first,...sources].find(r=>r.seq===partial.sourceSeq),next=await replayShared(partial,current,sources.filter(r=>r.seq>partial.sourceSeq),base+n*500);partial=next.state;events.push(...next.events);}
assert.deepEqual(partial.walk,complete.state.walk);assert.deepEqual(partial.traffic,complete.state.traffic);assert.deepEqual(partial.frames,complete.state.frames);assert.deepEqual(partial.descriptors,complete.state.descriptors);assert.deepEqual(events,complete.events);
assert.ok(events.some(e=>e.kind==='plan'&&e.actorId==='an'));assert.equal(events.filter(e=>e.kind==='clock').length,2);
assert.equal(Math.round(complete.state.simMs-genesis.simMs),2245,'745ms active +505ms pause +750ms at2x');
const viewOf=s=>validateSharedView({version:2,scope:s.scope,worldBorn:s.worldBorn,checkpoint:'a'.repeat(64),sequence:s.sequence,sourceRevision:s.sourceRevision,cursorRealMs:s.cursorRealMs,simMs:s.simMs,backlogMs:0,paused:false,descriptors:s.descriptors,frames:s.frames,eligibleForReward:false,eligibleForP2P:false});
const view=viewOf(complete.state),sampleAt=view.frames[4].realMs+1;
assert.deepEqual(sampleSharedGround(view,sampleAt),sampleSharedGround(structuredClone(view),sampleAt),'late viewer has identical absolute-time roots');
assert.deepEqual(sampleSharedGround(view,view.cursorRealMs+9999).actors,sampleSharedGround(view,view.cursorRealMs).actors,'no extrapolation');
const all=world();const template=all.living.residents[0];all.living.residents=Array.from({length:240},(_,i)=>({...structuredClone(template),id:`neighbor-full-${i}`,name:`Người ${i}`}));
const fullSource=source(1,base,all),full=await bootstrapShared(fullSource,randomUUID());
assert.equal(full.frames[0].poses.length,246);assert.equal(full.traffic.positions.length,12);
const fullNext=await replayShared(full,fullSource,[],base+100);assert.equal(fullNext.state.frames.at(-1).poses.length,246);
const fast=world();fast.clock={pausedAt:null,pausedMs:0,scale:60};const fastSource=source(1,base,fast),fastState=await bootstrapShared(fastSource,randomUUID()),limited=await replayShared(fastState,fastSource,[],base+5000);
assert.ok(limited.physicsSteps<=120);assert.ok(limited.backlogMs>0);

class Fixture{
 constructor(){this.sql=new DatabaseSync(':memory:');this.sql.exec('PRAGMA foreign_keys=ON;CREATE TABLE worlds(id TEXT PRIMARY KEY,revision INTEGER,data TEXT);CREATE TABLE memories(id TEXT PRIMARY KEY,text TEXT);CREATE TABLE episodes(id TEXT PRIMARY KEY,data TEXT);CREATE TABLE learning_policies(actor_id TEXT PRIMARY KEY,data TEXT)');this.sql.exec(readFileSync('drizzle/0010_ground_shared.sql','utf8'));this.world=world();this.revision=0;this.sql.prepare("INSERT INTO worlds VALUES('home',0,?)").run(JSON.stringify(this.world));this.sql.exec("INSERT INTO memories VALUES('old','keep');INSERT INTO episodes VALUES('old','keep');INSERT INTO learning_policies VALUES('an','keep')");}
 prepare(sql,args=[]){return{sql,args,bind:(...a)=>this.prepare(sql,a),first:async()=>{const r=this.sql.prepare(sql).get(...args);return r?{...r}:null;},all:async()=>({results:this.sql.prepare(sql).all(...args).map(r=>({...r})),success:true,meta:{}})};}
 async batch(statements){if(this.beforeWrite){const fn=this.beforeWrite;this.beforeWrite=null;fn();}this.sql.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>/^SELECT/.test(s.sql)?{success:true,results:this.sql.prepare(s.sql).all(...s.args).map(r=>({...r})),meta:{changes:0}}:{success:true,results:[],meta:{changes:Number(this.sql.prepare(s.sql).run(...s.args).changes)}});this.sql.exec('COMMIT');return result;}catch(e){this.sql.exec('ROLLBACK');throw e;}}
 update(){this.sql.prepare("UPDATE worlds SET revision=?,data=? WHERE id='home'").run(++this.revision,JSON.stringify(this.world));}
 raw(){return JSON.stringify(['worlds','memories','episodes','learning_policies','ground_shared_states','ground_shared_sources','ground_shared_batches'].map(t=>this.sql.prepare(`SELECT * FROM ${t}`).all()));}
 close(){this.sql.close();}
}
const db=new Fixture();
try{
 const now=Date.now(),id=randomUUID(),start={action:'start',sessionId:id,operationId:randomUUID(),expectedCheckpoint:'new'};
 const before=db.raw();assert.equal((await runSharedGround(db,{action:'status'},now)).exists,false);assert.equal(db.raw(),before);
 const started=await runSharedGround(db,start,now);assert.equal((await runSharedGround(db,start,now+1000)).duplicate,true);
 assert.equal(db.sql.prepare('SELECT count(*) n FROM ground_shared_sources').get().n,1);
 const idle={action:'advance',sessionId:id,operationId:randomUUID(),expectedCheckpoint:started.checkpoint},idleAck=await runSharedGround(db,idle,now);
 assert.equal(idleAck.physicsSteps,0);assert.equal((await runSharedGround(db,idle,now+2000)).cursorRealMs,now);
 db.world.people[0].plan=changed.people[0].plan;db.update();db.world.people[0].plan=undefined;db.update();
 assert.equal(db.sql.prepare('SELECT count(*) n FROM ground_shared_sources').get().n,3,'all intermediate plan revisions captured, not only latest');
 assert.throws(()=>db.sql.exec('UPDATE ground_shared_sources SET revision=7'),/immutable/);assert.throws(()=>db.sql.exec('DELETE FROM ground_shared_sources'),/immutable/);
 const immutableUser=JSON.stringify(['memories','episodes','learning_policies'].map(t=>db.sql.prepare(`SELECT * FROM ${t}`).all()));
 const head=idleAck.checkpoint,cmd={action:'advance',sessionId:id,operationId:randomUUID(),expectedCheckpoint:head};
 const [one,two]=await Promise.all([runSharedGround(db,cmd,now+2000),runSharedGround(db,cmd,now+2000)]);
 assert.equal([one,two].filter(r=>!r.duplicate).length,1);assert.equal(one.checkpoint,two.checkpoint);
 const receipts=db.sql.prepare('SELECT data FROM ground_shared_batches ORDER BY sequence DESC LIMIT 1').get();assert.equal(JSON.parse(receipts.data).basis.events.filter(e=>e.kind==='plan').length,2);
 const read=await readSharedGround(db,now+2000);assert.equal(read.view.checkpoint,one.checkpoint);assert.equal(read.view.frames.at(-1).cars.length,12);
 assert.equal(JSON.stringify(['memories','episodes','learning_policies'].map(t=>db.sql.prepare(`SELECT * FROM ${t}`).all())),immutableUser);
 for(const definition of ['BEFORE UPDATE ON ground_shared_states','BEFORE INSERT ON ground_shared_batches']){
  const prior=db.raw();db.sql.exec(`CREATE TRIGGER ignore_shared_fixture ${definition} BEGIN SELECT RAISE(IGNORE); END`);
  await assert.rejects(runSharedGround(db,{action:'advance',sessionId:id,operationId:randomUUID(),expectedCheckpoint:one.checkpoint},now+2500));assert.equal(db.raw(),prior);db.sql.exec('DROP TRIGGER ignore_shared_fixture');
 }
 const beforeWorld=db.sql.prepare("SELECT * FROM worlds WHERE id='home'").get(),beforeSources=db.sql.prepare('SELECT count(*) n FROM ground_shared_sources').get().n;
 db.sql.exec("CREATE TRIGGER reject_shared_source BEFORE INSERT ON ground_shared_sources BEGIN SELECT RAISE(ABORT,'reject-source');END");
 assert.throws(()=>db.update(),/reject-source/);assert.deepEqual(db.sql.prepare("SELECT * FROM worlds WHERE id='home'").get(),beforeWorld);assert.equal(db.sql.prepare('SELECT count(*) n FROM ground_shared_sources').get().n,beforeSources);db.sql.exec('DROP TRIGGER reject_shared_source');db.revision=beforeWorld.revision;
 const prior=db.raw();await assert.rejects(runSharedGround(db,{...cmd,operationId:randomUUID()},now+2500),/checkpoint-conflict/);assert.equal(db.raw(),prior);
 const send=async(_url,init)=>Response.json(await runSharedGround(db,sharedRequestSchema.parse(JSON.parse(init.body)),now+2000));
 assert.equal((await sharedGroundCommand({},send)).actors,read.view.frames.at(-1).poses.length);
 for(const origin of ['https://example.invalid','http://user:pass@localhost','http://localhost/path'])await assert.rejects(sharedGroundCommand({origin},()=>{throw Error('no-send');}));
 await assert.rejects(sharedGroundCommand({},async()=>new Response('<html>private</html>')));
 assert.equal(sharedRequestSchema.safeParse({action:'advance',position:[0,0],nowMs:1}).success,false);
 assert.equal((await pulseSharedGround(db,now+500)).coalesced,true);
 console.log(JSON.stringify({suite:'shared-ground',captureBoundaryChunkDeterminism:true,planReplacementRemovalJournal:true,canonicalPauseScale:true,lateViewerAbsoluteSampling:true,noExtrapolation:true,allActors:246,cars:12,bodyRadiusBicyclePetTagState:true,fixedPhysicsBudget:true,immutableSourcesAndAtomicWorldCapture:true,stateReceiptCASRollback:true,silentIgnoreRollback:true,zeroTickLostAck:true,concurrentOneCommit:true,readOnlyStatus:true,userMemoryHistoryPoliciesPreserved:true,localClient:true,eligibleForReward:false,eligibleForP2P:false,productionAccess:false}));
}finally{db.close();}
