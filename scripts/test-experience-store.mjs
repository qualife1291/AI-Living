import assert from 'node:assert/strict';
import {realpathSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {archiveExperienceStatements} from '../lib/living/experience-store.ts';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json'))),{Miniflare}=require('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15',inspectorPort:0});
try {
 const db=await mf.getD1Database('DB');
 await db.prepare('CREATE TABLE worlds(id TEXT PRIMARY KEY,revision INTEGER,data TEXT)').run();
 await db.exec(readFileSync('drizzle/0003_agent_experiences.sql','utf8').replace(/^--.*$/mg,'').replace(/\n/g,' '));
 await db.prepare("INSERT INTO worlds VALUES ('home',1,?)").bind(JSON.stringify({living:{learningCommit:'first'}})).run();
 const retained=Array.from({length:200},(_,i)=>({id:`sample-${i}`,actorId:`resident-${i%10}`,at:'2026-11-16T00:00:00Z',scenarioId:'study',reward:.2}));
 const sequence=async()=> (await db.prepare("SELECT seq FROM sqlite_sequence WHERE name='agent_experiences'").first())?.seq??0;
 const rows=async()=> (await db.prepare('SELECT * FROM agent_experiences ORDER BY seq').all()).results;
 const first=await db.batch(archiveExperienceStatements(db,retained,1,'first'));
 assert.equal(first[0].meta.changes,200);assert.equal(await sequence(),200);
 const before=await rows();
 // Reproduce the previous INSERT OR IGNORE behavior on the same local D1.
 const old=await db.prepare("INSERT OR IGNORE INTO agent_experiences(id,actor_id,created_at,data) SELECT json_extract(value,'$.id'),json_extract(value,'$.actorId'),json_extract(value,'$.at'),value FROM json_each(?)")
  .bind(JSON.stringify(retained)).run();
 assert.equal(old.meta.changes,0);assert.equal(await sequence(),400,'Ignored duplicates consume sequence IDs');
 const repeated=await db.batch(archiveExperienceStatements(db,retained,1,'first'));
 assert.equal(repeated[0].meta.changes,0);assert.equal(await sequence(),400,'Filtered duplicates do not touch sequence');
 assert.deepEqual(await rows(),before,'Every archived payload and sequence remains unchanged');
 assert.equal(archiveExperienceStatements(db,[],1,'first').length,0);
 const fresh={...retained[0],id:'new-sample'},entries=[...retained,fresh,fresh];
 const inserted=await db.batch(archiveExperienceStatements(db,entries,1,'first'));
 assert.equal(inserted[0].meta.changes,1);assert.equal(await sequence(),401);
 assert.deepEqual(JSON.parse((await rows()).at(-1).data),fresh);
 const preserved=await rows(),seq=await sequence();
 const next={...fresh,id:'must-not-write'};
 for(const [revision,nonce] of [[0,'first'],[1,'wrong']]){
  const r=await db.batch(archiveExperienceStatements(db,[next],revision,nonce));
  assert.equal(r[0].meta.changes,0);assert.equal(await sequence(),seq);
 }
 await assert.rejects(db.batch([
  db.prepare("UPDATE worlds SET revision=2,data=? WHERE revision=1").bind(JSON.stringify({living:{learningCommit:'second'}})),
  ...archiveExperienceStatements(db,[next],2,'second'),
  db.prepare('INSERT INTO missing_table VALUES (1)')
 ]));
 assert.equal((await db.prepare('SELECT revision FROM worlds').first()).revision,1);
 assert.deepEqual(await rows(),preserved);assert.equal(await sequence(),seq,'Failed batch rolls back sequence too');
 // Retained entries absent from an older archive still backfill once.
 const missing={...fresh,id:'legacy-retained'};
 const backfill=await db.batch(archiveExperienceStatements(db,[...retained,missing],1,'first'));
 assert.equal(backfill[0].meta.changes,1);
 console.log(JSON.stringify({suite:'experience-store',retained:200,duplicateSequenceAdvanceBefore:200,duplicateSequenceAdvanceAfter:0,duplicateRowsWrittenBefore:old.meta.rows_written,duplicateRowsWrittenAfter:repeated[0].meta.rows_written,newRows:inserted[0].meta.changes,backfill:true,nonce:true,staleRevision:true,atomicRollback:true,productionAccess:false}));
} finally {await mf.dispose();}
