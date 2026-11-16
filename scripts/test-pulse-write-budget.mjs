/** Native D1 row metadata for one hour of10s polling; no simulation data writes. */
import assert from 'node:assert/strict';
import {realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {runCoalescedPulse} from '../lib/living/pulse-gate.ts';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json'))),{Miniflare}=require('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15',inspectorPort:0});
try {
 const raw=await mf.getD1Database('DB');
 await raw.prepare('CREATE TABLE worlds(id TEXT PRIMARY KEY,revision INTEGER,data TEXT)').run();
 await raw.prepare('CREATE TABLE context_cache(id TEXT PRIMARY KEY,data TEXT,expires_at INTEGER)').run();
 const world=JSON.stringify({paused:false,born:'preserved',people:[{id:'an',memories:['retained']}],living:{learning:{an:{samples:52}}}});
 await raw.prepare("INSERT INTO worlds VALUES ('home',17,?)").bind(world).run();
 let rowsWritten=0,pipelines=0,writeStatements=0;
 const prepare=(sql,args=[])=>({bind:(...next)=>prepare(sql,next),first:()=>raw.prepare(sql).bind(...args).first(),run:async()=>{
  const result=await raw.prepare(sql).bind(...args).run();rowsWritten+=result.meta.rows_written;writeStatements++;return result;
 }});
 const db={prepare};
 for(let i=0;i<360;i++)await runCoalescedPulse(db,async()=>{pipelines++;return {status:200,data:{duplicate:true}}},1_800_000_000_000+i*10000,'probe-'+i);
 assert.equal(pipelines,60);assert.equal(writeStatements,120);assert(rowsWritten<=181,'Lease writes must remain bounded independent of ten-second clients');
 assert.deepEqual(await raw.prepare("SELECT revision,data FROM worlds WHERE id='home'").first(),{revision:17,data:world});
 console.log(JSON.stringify({suite:'pulse-write-budget',windowSeconds:3600,requests:360,pipelines,writeStatements,rowsWritten,scope:'coordination-only; excludes earned samples/world commits/index layout in production',worldAndSamplesPreserved:true,productionAccess:false}));
} finally {await mf.dispose();}
