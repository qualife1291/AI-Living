/** Isolated bundled H5b functions + real workerd D1. NOT an app API or server. */
import assert from 'node:assert/strict';
import {realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {meetingSteps} from '../lib/living/activities.ts';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json')));
const {Miniflare}=require('miniflare'),{build}=require('esbuild'),base=Date.parse('2026-10-29T03:00:00Z');
const bundle=await build({stdin:{contents:`
 import {runSharedGround} from './lib/living/shared-ground-store.ts';
 import {recordPeerOffer,verifyPeerOfferDelivery} from './lib/living/peer-offer-store.ts';
 export default{async fetch(r,e){try{const b=await r.json();const value=b.kind==='shared'?await runSharedGround(e.DB,b.input,b.now,b.options):b.kind==='offer'?await recordPeerOffer(e.DB,b.input,b.now):await verifyPeerOfferDelivery(e.DB,b.input);return Response.json(value)}catch(error){return Response.json({error:String(error.message)},{status:409})}}};
 `,resolveDir:process.cwd(),sourcefile:'peer-offer-isolated-fixture.ts'},bundle:true,write:false,platform:'neutral',format:'esm',target:'es2022',logLevel:'silent'});
const mf=new Miniflare({modules:[{type:'ESModule',path:resolve('scripts/__peer_offer_fixture.mjs'),contents:bundle.outputFiles[0].text}],modulesRoot:process.cwd(),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],inspectorPort:0,outboundService:()=>new Response('No network in fixture',{status:503})});
const send=body=>mf.dispatchFetch('http://localhost/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
async function ack(body){const r=await send(body);assert.equal(r.status,200,await r.clone().text());return r.json();}
const request=(sessionId,expectedCheckpoint,action='advance')=>({action,sessionId,expectedCheckpoint,operationId:randomUUID()});
try{
 const db=await mf.getD1Database('DB');
 for(const migration of readMigrationFiles({migrationsFolder:'drizzle'}))for(const sql of migration.sql)await db.prepare(sql).run();
 // Fixture clock injection, like SQLite's julianday override in the native suite.
 // Only the wall-time expression changes; sources are still minted by UPDATE.
 const capture=await db.prepare("SELECT sql FROM sqlite_master WHERE name='ground_shared_capture_world'").first();
 const fixedCapture=capture.sql.replace("(julianday('now')-2440587.5)*86400000",String(base));
 assert.notEqual(fixedCapture,capture.sql);await db.prepare('DROP TRIGGER ground_shared_capture_world').run();await db.prepare(fixedCapture).run();
 const world={...structuredClone(seed),born:new Date(base).toISOString(),living:initializeLiving(base),clock:{pausedAt:null,pausedMs:0,scale:60,anchors:[{realMs:base,simMs:0,scale:60}]}};
 world.living.residents=world.living.residents.slice(0,1);delete world.livingTurn;
 await db.prepare("INSERT INTO worlds VALUES('home',0,?)").bind(JSON.stringify(world)).run();
 await db.prepare("INSERT INTO memories(id,person_id,event_id,text,created_at) VALUES('keep','an','old','Keep memory',?)").bind(new Date(base).toISOString()).run();
 const snapshot=async()=>JSON.stringify(await Promise.all(['worlds','memories','episodes','learning_policies'].map(async table=>[table,(await db.prepare(`SELECT * FROM ${table}`).all()).results])));
 const sessionId=randomUUID(),started=await ack({kind:'shared',input:request(sessionId,'new','start'),now:base});
 const active=await ack({kind:'shared',input:request(sessionId,started.checkpoint),options:{activateAuthority:true},now:base});
 const offer={id:randomUUID(),sessionId,expectedSharedCheckpoint:active.checkpoint,expectedAuthorityCheckpoint:active.authority.checkpoint,speakerId:'an',recipientId:world.living.residents[0].id,topic:'repair',text:'Kiểm tra dụng cụ trước khi sửa chữa.'};
 const before=await snapshot(),calls=await Promise.all([send({kind:'offer',input:offer,now:base}),send({kind:'offer',input:offer,now:base})]);
 const admissions=await Promise.all(calls.map(async r=>{assert.equal(r.status,200,await r.clone().text());return r.json();}));
 assert.equal(admissions.filter(a=>!a.duplicate).length,1);assert.equal(admissions[0].checkpoint,admissions[1].checkpoint);assert.equal((await db.prepare('SELECT count(*) n FROM peer_offers').first()).n,1);assert.equal(await snapshot(),before);
 await db.prepare('CREATE TRIGGER fixture_ignore BEFORE INSERT ON peer_offers BEGIN SELECT RAISE(IGNORE);END').run();
 assert.equal((await send({kind:'offer',input:{...offer,id:randomUUID()},now:base})).status,409);
 assert.equal((await db.prepare('SELECT count(*) n FROM peer_offers').first()).n,1);await db.prepare('DROP TRIGGER fixture_ignore').run();
 await assert.rejects(db.prepare('UPDATE peer_offers SET created_at=0').run());await assert.rejects(db.prepare('DELETE FROM ground_shared_batches').run());
 const plan=()=>({createdAt:new Date(base).toISOString(),pausedMs:0,from:'Sân chung',simStartedAt:0,steps:meetingSteps('Công viên','Trao đổi lời khuyên')});
 world.people[0].plan=plan();world.living.residents[0].plan=plan();
 world.livingTurn={id:'h5b-d1-turn',createdAt:new Date(base).toISOString(),date:'2026-10-29',title:'Fixture',summary:'Synthetic test only',location:'Công viên',activity:'Trò chuyện',kind:'social',residentId:offer.recipientId,simStartedAt:0,dialogue:[{speaker:'an',text:offer.text},{speaker:offer.recipientId,text:'Mình đã nghe.'}],generator:'rules',context:{date:'2026-10-29'}};
 await db.prepare("UPDATE worlds SET revision=revision+1,data=? WHERE id='home'").bind(JSON.stringify(world)).run();
 let result=active,iterations=0;
 while(result.cursorRealMs<base+4500){assert(++iterations<100);result=await ack({kind:'shared',input:request(sessionId,result.checkpoint),now:base+4500});}
 assert.equal(result.authority.counts.heard,2);
 const batches=(await db.prepare('SELECT operation_id,data FROM ground_authority_batches ORDER BY sequence').all()).results.map(row=>({...row,records:JSON.parse(row.data).basis.records}));
 const emitted=batches.find(b=>b.records.some(r=>r.type==='utterance-emitted'&&r.text===offer.text)),heard=batches.find(b=>b.records.some(r=>r.type==='heard-utterance'&&r.text===offer.text));
 const verify={offerId:offer.id,recipientId:offer.recipientId,emittedOperationId:emitted.operation_id,heardOperationId:heard.operation_id,utteranceId:heard.records.find(r=>r.type==='heard-utterance'&&r.text===offer.text).utteranceId};
 const beforeRead=await snapshot(),delivery=await ack({kind:'verify',input:verify});
 assert.equal(delivery.text,offer.text);assert.equal(delivery.ownExperience,false);assert.equal(delivery.eligibleForRuntimeP2P,false);assert.equal(await snapshot(),beforeRead);
 assert.equal((await send({kind:'verify',input:{...verify,recipientId:'binh'}})).status,409);
 assert.equal((await send({kind:'verify',input:{...verify,receipt:delivery}})).status,409);
 assert((await ack({kind:'offer',input:offer,now:base+4500})).duplicate);
 console.log(JSON.stringify({suite:'peer-offer-workerd-d1',bundledInternalFunctions:true,allMigrations:true,parallelSameUuidOneCommit:true,silentIgnoreRollback:true,actualHeardReceipts:2,recipientAndJsonGuards:true,readOnlyVerification:true,protectedPersonalState:true,appApiAdded:false,runtimeP2P:false,liveDatabaseWrites:0}));
}finally{await mf.dispose();}
