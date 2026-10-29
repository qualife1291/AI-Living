/** Native SQLite + actual GND2/GND3 replay. No live DB, network or model. */
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {meetingSteps} from '../lib/living/activities.ts';
import {runSharedGround} from '../lib/living/shared-ground-store.ts';
import {recordPeerOffer,verifyPeerOfferDelivery} from '../lib/living/peer-offer-store.ts';
// Same deterministic meeting fixture as GND3 store acceptance (10:00 Vietnam).
const base=Date.parse('2026-10-29T03:00:00Z');
const text='Tưới cây vừa đủ và kiểm tra đất trước khi tưới thêm.';
const tables=['worlds','memories','episodes','learning_policies','ground_shared_sources','ground_shared_states','ground_shared_batches','ground_authority_states','ground_authority_batches','peer_offers'];
class Fixture {
 constructor(migrated=true){
  this.sql=new DatabaseSync(':memory:');this.now=base;
  this.sql.function('julianday',value=>{assert.equal(value,'now');return this.now/86400000+2440587.5;});
  this.sql.exec('PRAGMA foreign_keys=ON;CREATE TABLE worlds(id TEXT PRIMARY KEY,revision INTEGER,data TEXT);CREATE TABLE memories(id TEXT PRIMARY KEY,text TEXT);CREATE TABLE episodes(id TEXT PRIMARY KEY,data TEXT);CREATE TABLE learning_policies(actor_id TEXT PRIMARY KEY,data TEXT)');
  for(const file of ['0010_ground_shared','0011_ground_authority',...(migrated?['0012_peer_offers']:[])])this.sql.exec(readFileSync(`drizzle/${file}.sql`,'utf8'));
  this.world={...structuredClone(seed),born:new Date(base).toISOString(),living:initializeLiving(base),clock:{pausedAt:null,pausedMs:0,scale:60,anchors:[{realMs:base,simMs:0,scale:60}]}};
  this.world.living.residents=this.world.living.residents.slice(0,1);delete this.world.livingTurn;
  this.revision=0;this.sql.prepare("INSERT INTO worlds VALUES('home',0,?)").run(JSON.stringify(this.world));
  this.sql.exec("INSERT INTO memories VALUES('keep','private memory');INSERT INTO episodes VALUES('keep','private history');INSERT INTO learning_policies VALUES('an','personal policy')");
 }
 prepare(sql,args=[]){return {sql,args,bind:(...a)=>this.prepare(sql,a),first:async()=>{const r=this.sql.prepare(sql).get(...args);return r?{...r}:null;},all:async()=>({results:this.sql.prepare(sql).all(...args).map(r=>({...r})),success:true,meta:{}})};}
 async batch(statements){
  if(this.beforeWrite){const fn=this.beforeWrite;this.beforeWrite=null;fn();}
  this.sql.exec('BEGIN IMMEDIATE');let result;
  try{result=statements.map(s=>/^SELECT/.test(s.sql)?{success:true,results:this.sql.prepare(s.sql).all(...s.args),meta:{changes:0}}:{success:true,results:[],meta:{changes:Number(this.sql.prepare(s.sql).run(...s.args).changes)}});this.sql.exec('COMMIT');}catch(error){this.sql.exec('ROLLBACK');throw error;}
  if(this.loseAck){this.loseAck=false;throw Error('fixture lost ACK after commit');}return result;
 }
 update(){this.sql.prepare("UPDATE worlds SET revision=?,data=? WHERE id='home'").run(++this.revision,JSON.stringify(this.world));}
 snapshot(selected=tables){return JSON.stringify(selected.map(t=>[t,this.sql.prepare(`SELECT * FROM ${t} ORDER BY 1`).all()]));}
}
const req=(sessionId,expectedCheckpoint,action='advance')=>({sessionId,expectedCheckpoint,action,operationId:randomUUID()});
async function setup(){
 const db=new Fixture(),session=randomUUID(),start=await runSharedGround(db,req(session,'new','start'),base);
 const active=await runSharedGround(db,req(session,start.checkpoint),base,{activateAuthority:true});
 const request={id:randomUUID(),sessionId:session,expectedSharedCheckpoint:active.checkpoint,expectedAuthorityCheckpoint:active.authority.checkpoint,speakerId:'an',recipientId:db.world.living.residents[0].id,topic:'gardening',text};
 return {db,session,active,request};
}
const missing=new Fixture(false),missingBefore=missing.snapshot(tables.filter(t=>t!=='peer_offers'));
await assert.rejects(recordPeerOffer(missing,{id:randomUUID(),sessionId:randomUUID(),expectedSharedCheckpoint:'0'.repeat(64),expectedAuthorityCheckpoint:'0'.repeat(64),speakerId:'an',recipientId:'npc-test',topic:'gardening',text},base),/peer-schema-incomplete/);
assert.equal(missing.snapshot(tables.filter(t=>t!=='peer_offers')),missingBefore,'Missing migration does not bootstrap or repair anything');
const legacySession=randomUUID(),legacyStart=await runSharedGround(missing,req(legacySession,'new','start'),base);
await runSharedGround(missing,req(legacySession,legacyStart.checkpoint),base,{activateAuthority:true});
const legacyBefore=missing.snapshot(tables.filter(t=>t!=='peer_offers'));
missing.sql.exec(readFileSync('drizzle/0012_peer_offers.sql','utf8'));
assert.equal(missing.snapshot(tables.filter(t=>t!=='peer_offers')),legacyBefore,'Append-only migration preserves existing worlds, heads and receipts');

const {db,session,active,request}=await setup(),protectedTables=['worlds','memories','episodes','learning_policies'],protectedBefore=db.snapshot(protectedTables);
const offered=await recordPeerOffer(db,request,base);
assert.equal(offered.duplicate,false);assert.equal(offered.offer.sourceHighWater,1);assert.equal(offered.offer.worldRevision,0);assert.equal(offered.offer.offeredAtSimMs,0);
assert.equal(offered.offer.eligibleForRuntimeP2P,false);assert.equal(db.snapshot(protectedTables),protectedBefore);
const afterOffer=db.snapshot();assert.deepEqual(await recordPeerOffer(db,request,base+100),{...offered,duplicate:true});assert.equal(db.snapshot(),afterOffer);
await assert.rejects(recordPeerOffer(db,{...request,text:'Thay nội dung bằng cùng UUID.'},base),/peer-operation-reused/);
for(const change of [{recipientId:'an'},{recipientId:'binh'},{speakerId:'missing'}, {expectedAuthorityCheckpoint:'0'.repeat(64)}, {expectedSharedCheckpoint:'0'.repeat(64)}, {proof:{trusted:true}}, {eligibleForRuntimeP2P:true}]){
 await assert.rejects(recordPeerOffer(db,{...request,id:randomUUID(),...change},base));assert.equal(db.snapshot(),afterOffer);
}
assert.throws(()=>db.sql.exec('UPDATE peer_offers SET created_at=0'),/immutable/);
assert.throws(()=>db.sql.exec('DELETE FROM peer_offers'),/immutable/);
assert.throws(()=>db.sql.exec('UPDATE ground_shared_batches SET created_at=0'),/immutable/);
assert.throws(()=>db.sql.exec('DELETE FROM ground_shared_batches'),/immutable/);

// D1 batch postconditions detect silent ignores and abort every new row.
for(const body of ["SELECT RAISE(IGNORE)","SELECT json('fixture-invalid-json')"]){
 db.sql.exec(`CREATE TRIGGER fixture_failure BEFORE INSERT ON peer_offers BEGIN ${body};END`);
 await assert.rejects(recordPeerOffer(db,{...request,id:randomUUID()},base));assert.equal(db.snapshot(),afterOffer);db.sql.exec('DROP TRIGGER fixture_failure');
}
const parallelRequest={...request,id:randomUUID()};
const parallel=await Promise.all([recordPeerOffer(db,parallelRequest,base),recordPeerOffer(db,parallelRequest,base)]);
assert.equal(parallel.filter(r=>!r.duplicate).length,1);assert.equal(parallel[0].checkpoint,parallel[1].checkpoint);
const lostRequest={...request,id:randomUUID()};db.loseAck=true;
assert.equal((await recordPeerOffer(db,lostRequest,base)).duplicate,true);
assert.equal(db.sql.prepare('SELECT count(*) n FROM peer_offers WHERE id=?').get(lostRequest.id).n,1);

// A concurrent writer keeps its world revision; the stale offer must not commit.
const racing=await setup();racing.db.beforeWrite=()=>racing.db.update();
await assert.rejects(recordPeerOffer(racing.db,racing.request,base));
assert.equal(racing.db.sql.prepare('SELECT count(*) n FROM peer_offers').get().n,0);
assert.equal(racing.db.sql.prepare('SELECT revision FROM worlds').get().revision,1);
await assert.rejects(recordPeerOffer(racing.db,racing.request,base),/peer-source-not-current/);
const noAuthority=new Fixture(),newSession=randomUUID(),started=await runSharedGround(noAuthority,req(newSession,'new','start'),base);
await assert.rejects(recordPeerOffer(noAuthority,{...request,sessionId:newSession,expectedSharedCheckpoint:started.checkpoint},base),/peer-authority-required/);

// Commit a NEW turn after the durable offer. Delivery is generated by accepted
// physics, never by hand-written receipt fixtures or client pose/caption ACKs.
const plan=()=>({createdAt:new Date(base).toISOString(),pausedMs:0,from:'Sân chung',simStartedAt:0,steps:meetingSteps('Công viên','Trao đổi lời khuyên')});
db.world.people[0].plan=plan();db.world.living.residents[0].plan=plan();
db.world.livingTurn={id:'h5b-actual-turn',createdAt:new Date(base).toISOString(),date:'2026-10-29',title:'Fixture',summary:'Synthetic test, not user history',location:'Công viên',activity:'Trò chuyện',kind:'social',residentId:request.recipientId,simStartedAt:0,dialogue:[{speaker:'an',text},{speaker:request.recipientId,text:'Mình đã nghe, sẽ cân nhắc.'}],generator:'rules',context:{date:'2026-10-29'}};
db.update();let result=active,iterations=0;
async function advance(target){while(result.cursorRealMs<target){assert(++iterations<120);result=await runSharedGround(db,req(session,result.checkpoint),target);}}
await advance(base+4500);assert.equal(result.authority.counts.heard,2,JSON.stringify(result.authority.counts));
const batches=db.sql.prepare('SELECT operation_id,data FROM ground_authority_batches ORDER BY sequence').all().map(r=>({...r,records:JSON.parse(r.data).basis.records}));
const emitted=batches.find(b=>b.records.some(r=>r.type==='utterance-emitted'&&r.text===text));
const heard=batches.find(b=>b.records.some(r=>r.type==='heard-utterance'&&r.text===text));
assert(emitted&&heard);const utteranceId=heard.records.find(r=>r.type==='heard-utterance'&&r.text===text).utteranceId;
const verify={offerId:request.id,recipientId:request.recipientId,emittedOperationId:emitted.operation_id,heardOperationId:heard.operation_id,utteranceId};
const beforeVerify=db.snapshot(),delivery=await verifyPeerOfferDelivery(db,verify);
assert.equal(delivery.text,text);assert.equal(delivery.truth,'unverified-advice');assert.equal(delivery.knowledge,'heard-from-peer');assert.equal(delivery.ownExperience,false);assert.equal(delivery.eligibleForReward,false);assert.equal(delivery.eligibleForRuntimeP2P,false);assert.equal(db.snapshot(),beforeVerify,'Verification is read-only');
// A retry after clocks/head have advanced must still return the original offer.
assert.deepEqual(await recordPeerOffer(db,request,base+4500),{...offered,duplicate:true});assert.equal(db.snapshot(),beforeVerify);
for(const change of [{recipientId:'binh'}, {offerId:randomUUID()}, {emittedOperationId:randomUUID()}, {heardOperationId:emitted.operation_id}, {utteranceId:'forged-caption'}, {records:heard.records}]){
 await assert.rejects(verifyPeerOfferDelivery(db,{...verify,...change}));assert.equal(db.snapshot(),beforeVerify);
}
// Receipt body changes are not authenticated by a supplied checksum. Corruption
// is injected only by deliberately removing/restoring immutable triggers in SQL.
function alterBatch(table,operationId,alter){
 const trigger=`${table}_immutable_update`,definition=db.sql.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(trigger).sql;
 const row=db.sql.prepare(`SELECT data,checksum FROM ${table} WHERE operation_id=?`).get(operationId);
 db.sql.exec(`DROP TRIGGER ${trigger}`);const next=alter({...row});db.sql.prepare(`UPDATE ${table} SET data=?,checksum=? WHERE operation_id=?`).run(next.data,next.checksum,operationId);db.sql.exec(definition);
 return ()=>alterBatch(table,operationId,()=>row);
}
const restore=alterBatch('ground_authority_batches',emitted.operation_id,row=>({...row,checksum:'0'.repeat(64)}));
await assert.rejects(verifyPeerOfferDelivery(db,verify),/authority-receipt-integrity/);restore();
const restoreParent=alterBatch('ground_shared_batches',emitted.operation_id,row=>({...row,data:JSON.stringify({...JSON.parse(row.data),checkpoint:'0'.repeat(64)})}));
await assert.rejects(verifyPeerOfferDelivery(db,verify),/peer-receipt-binding/);restoreParent();
assert.deepEqual(await verifyPeerOfferDelivery(db,verify),delivery);

// Cross-session receipts are valid on their own, but cannot authenticate this offer.
const other=await setup();
const foreignOperation=other.db.sql.prepare('SELECT operation_id FROM ground_authority_batches').get().operation_id;
// Simulate a wrong DB route for historical lookups, preserving both valid rows.
const crossDb={prepare(sql){return /ground_(authority|shared)_batches/.test(sql)&&sql.includes('AND operation_id=?')?other.db.prepare(sql):db.prepare(sql);}};
await assert.rejects(verifyPeerOfferDelivery(crossDb,{...verify,emittedOperationId:foreignOperation}),/peer-receipt-binding/);

// Neither an already-published turn nor a later offer can retroactively claim hearing.
const currentRequest={...request,id:randomUUID(),expectedSharedCheckpoint:result.checkpoint,expectedAuthorityCheckpoint:result.authority.checkpoint};
await assert.rejects(recordPeerOffer(db,currentRequest,base+4500),/peer-offer-already-published/);
delete db.world.livingTurn;db.now=base+4500;db.update();await advance(base+4600);
const late=await recordPeerOffer(db,{...currentRequest,id:randomUUID(),expectedSharedCheckpoint:result.checkpoint,expectedAuthorityCheckpoint:result.authority.checkpoint},base+4600);
await assert.rejects(verifyPeerOfferDelivery(db,{...verify,offerId:late.offer.id}),/peer-receipt-binding|peer-offer-causality/);
const finalBefore=db.snapshot();db.sql.exec('DROP TRIGGER peer_offers_immutable_delete');
await assert.rejects(verifyPeerOfferDelivery(db,verify),/peer-schema-incomplete/);assert.equal(db.snapshot(),finalBefore);
assert.equal(db.snapshot(['memories','episodes','learning_policies']),JSON.stringify(protectedTables.slice(1).map(t=>[t,JSON.parse(protectedBefore).find(([name])=>name===t)[1]])));
console.log(JSON.stringify({suite:'peer-offer-store',nativeSQLite:true,actualGroundReplay:true,heard:2,prePublicationJournal:true,sourceCAS:true,immutableOfferAndSharedLedger:true,lostAckIdempotent:true,parallelSameUuidOneCommit:true,silentIgnoreRollback:true,readOnlyRecipientVerification:true,wrongReceiptSourceRejected:true,retroactiveOfferRejected:true,protectedPersonalStateUnchanged:true,runtimeP2P:false,training:false,liveDatabaseWrites:0}));
