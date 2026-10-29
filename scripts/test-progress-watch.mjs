import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import {mkdtempSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {PROGRESS_SQL,progressSnapshot,compareProgress,STALL_WINDOW_MS} from '../lib/ops/progress-watch.ts';
const raw=new DatabaseSync(':memory:');
try{
 for(const m of readMigrationFiles({migrationsFolder:'drizzle'}))for(const sql of m.sql)raw.exec(sql);
 assert.equal(raw.prepare(PROGRESS_SQL).get(),undefined,'No world bootstrap');
 const t=Date.parse('2026-10-29T01:00:00Z'),born=new Date(t-86400000).toISOString();
 raw.prepare("INSERT INTO worlds VALUES ('home',8,?)").run(JSON.stringify({born,paused:false,private:'PRIVATE'}));
 raw.prepare("INSERT INTO tick_runs(id,started_at,finished_at,status) VALUES ('one',?,?,'completed')").run(new Date(t-10000).toISOString(),new Date(t-5000).toISOString());
 const changes=raw.prepare('SELECT total_changes() AS n').get().n;
 const a=progressSnapshot(raw.prepare(PROGRESS_SQL).get(),'local',new Date(t).toISOString());
 assert.equal(raw.prepare('SELECT total_changes() AS n').get().n,changes);assert(!JSON.stringify(a).includes('PRIVATE'));
 const after=(patch={},dt=STALL_WINDOW_MS)=>({...a,observedAt:new Date(t+dt).toISOString(),...patch});
 assert.equal(compareProgress(a,after()).status,'stalled');assert.equal(compareProgress(a,after({},STALL_WINDOW_MS-1)).status,'insufficient_window');
 const advancing=compareProgress(a,after({completedTicks:2,turns:1,revision:11,lastTickFinishedAt:new Date(t+300000).toISOString()}));assert.equal(advancing.status,'ticks_progressing');assert.equal(advancing.learningRowsIncreased,false);assert.equal(advancing.cronAttributionProven,false);assert.equal(advancing.modelQualityGainProven,false);
 assert.equal(compareProgress(a,after({revision:10})).status,'activity_without_tick_progress');
 assert.equal(compareProgress({...a,paused:true},after({paused:true})).status,'paused');assert.equal(compareProgress(a,after({paused:true})).status,'pause_changed');
 for(const patch of [{worldBorn:new Date(t).toISOString()},{experiences:-1},{revision:7},{environment:'qa'}]){
  if(patch.experiences===-1)assert.throws(()=>compareProgress(a,after(patch)));else assert.equal(compareProgress(a,after(patch)).status,'state_changed');
 }
 assert.equal(compareProgress(a,after({version:crypto.randomUUID()})).status,'deployment_changed');assert.equal(compareProgress(a,after({lastTickFinishedAt:new Date(t+STALL_WINDOW_MS+1).toISOString()})).status,'clock_mismatch');
 for(const value of [after({revision:1e100}),after({unknown:'PRIVATE'}),after({observedAt:'wrong'}),{...a}])assert.throws(()=>compareProgress(a,value));
 const dir=mkdtempSync('/tmp/xom-progress-test-');
 try{
  const first=dir+'/before.json',last=dir+'/after.json';writeFileSync(first,JSON.stringify(a));writeFileSync(last,JSON.stringify(after()));
  const run=(...args)=>spawnSync(process.execPath,['scripts/watch-qa-progress.mjs',...args],{encoding:'utf8'});
  assert.equal(run(first,last).status,0);assert.equal(JSON.parse(run(first,last).stdout).status,'stalled');
  for(const content of ['PRIVATE',' '.repeat(8193),new Uint8Array([0xff])]){writeFileSync(last,content);const r=run(first,last);assert.equal(r.status,1);assert(!r.stderr.includes('PRIVATE')&&!r.stderr.includes(dir));}
  symlinkSync(first,dir+'/link');assert.equal(run(dir+'/link',first).status,1);
 }finally{rmSync(dir,{recursive:true});}
}finally{raw.close();}
console.log(JSON.stringify({suite:'progress-watch',readOnlySql:true,noBootstrap:true,boundaryMs:STALL_WINDOW_MS,pauseAndDeployFence:true,regressionAndClockFence:true,quietLearningNotFailure:true,privateFieldsExcluded:true,cliBoundsUtf8AndSymlink:true,automaticMutation:false}));
