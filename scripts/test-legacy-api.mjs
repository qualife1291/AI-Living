/** Run legacy HTTP acceptance contracts on fresh compiled in-memory D1 per script. */
import assert from 'node:assert/strict';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import {realpathSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {planLivingTurn} from '../lib/living/engine.ts';
const require=createRequire(realpathSync(resolve('node_modules/wrangler/package.json')));
const {Miniflare,Log,LogLevel}=require('miniflare');
const fixed=Date.parse('2026-10-25T02:00:00Z');
const files=readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&!p.split('/').includes('.wrangler'));
const modules=[{type:'ESModule',path:resolve('dist/server/__acceptance_fixture.mjs'),contents:`import worker from './index.js';const NativeDate=Date;let now=${fixed};globalThis.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:[now]))}static now(){return now}};export default {fetch(req,env,ctx){const u=new URL(req.url);if(u.pathname==='/__acceptance/time'){now=Number(u.searchParams.get('now'));return Response.json({ok:true});}return worker.fetch(req,env,ctx)}};`},...files.map(p=>({type:'ESModule',path:resolve('dist/server',p)}))];
const options={cf:false,log:new Log(LogLevel.WARN),modules,modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{XOM_LOCAL_ADMIN:'true'},inspectorPort:0};
const denied=new Miniflare({...options,bindings:{XOM_LOCAL_ADMIN:'false'}}),results=[];
try{
 const deniedOrigin=(await denied.ready).origin;
 const allowed=['world','living','learning','liveness','appearance','proposal'];
 const selected=process.argv.slice(2);assert.ok(selected.every(x=>allowed.includes(x)));
 for(const name of selected.length?selected:allowed){
  const mf=new Miniflare(options);
  try{
   const db=await mf.getD1Database('DB');
   for(const m of readMigrationFiles({migrationsFolder:'drizzle'}))for(const sql of m.sql)await db.prepare(sql).run();
   const origin=(await mf.ready).origin;
   if(name==='liveness')await mf.dispatchFetch('http://localhost/api/world');
   if(name==='learning'){
    const view=await (await mf.dispatchFetch('http://localhost/api/living')).json();
    const planned=planLivingTurn(view.world,view.context,fixed);
    await db.prepare("UPDATE worlds SET data=? WHERE id='home'").bind(JSON.stringify(planned.world)).run();
    await mf.dispatchFetch(`http://localhost/__acceptance/time?now=${fixed+900000}`);
   }
   const code=await new Promise((done,reject)=>{const child=spawn(process.execPath,[`scripts/test-${name}${name==='world'?'':'-api'}.mjs`],{env:{...process.env,TEST_ORIGIN:origin,DENIED_ORIGIN:deniedOrigin},stdio:'inherit'});child.on('error',reject);child.on('exit',done);});
   results.push({name,exitCode:code});
  }finally{await mf.dispose();}
 }
 console.log(JSON.stringify({kind:'legacy-compiled-http-acceptance',isolated:true,productionAccess:false,results}));
 assert.ok(results.every(x=>x.exitCode===0),'All legacy HTTP acceptance contracts must pass');
}finally{await denied.dispose();}
