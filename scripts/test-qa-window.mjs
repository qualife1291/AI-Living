import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {auditQaWindow} from '../lib/ops/qa-window.ts';
const t=Date.parse('2026-11-04T01:00:00Z'),version=crypto.randomUUID();
const iso=offset=>new Date(t+offset).toISOString();
const before={schema:'xom-progress-v1',environment:'qa',observedAt:iso(0),version,
 worldBorn:iso(-86400000),paused:false,revision:10,turns:10,experiences:20,policies:51,
 completedTicks:10,lastTickFinishedAt:iso(-300000)};
const after={...before,observedAt:iso(900000),revision:11,turns:11,completedTicks:11,lastTickFinishedAt:iso(300000)};
const requestId=crypto.randomUUID();
const record=(event,patch={})=>({schema:'xom-system-log-v1',event,at:iso(300000),
 requestId,version,trigger:'cron',...patch});
const logs=['learning','social','tick'].map((stage,i)=>record('pulse_stage',{stage,status:200,durationMs:10+i,at:iso(300000+i)}));
logs.push(record('cron_result',{status:200,duplicate:false,coalesced:false,at:iso(300003)}));
const audit=(rows=logs,a=after,b=before)=>auditQaWindow(b,a,rows);
const good=audit();assert.equal(good.status,'correlated_progress');assert.equal(good.cron.completed,1);
assert.equal(good.cron.stages.tick.p95Ms,12);assert.equal(good.progress.learningRowsIncreased,false);
assert.equal(good.nativeSchedulerAttributionProven,false);assert.equal(good.modelQualityGainProven,false);
assert.equal(audit([]).status,'insufficient_evidence');
assert.equal(audit(logs,{...after,version:null},{...before,version:null}).status,'attention_required');
assert.equal(audit(logs,{...after,version:crypto.randomUUID()}).progress.status,'deployment_changed');
assert.equal(audit(logs.map(r=>({...r,version:crypto.randomUUID()}))).cron.completed,0);
assert.equal(audit(logs.map(r=>({...r,version:undefined}))).cron.completed,0);
assert.equal(audit(logs,{...after,...Object.fromEntries(['revision','turns','completedTicks','lastTickFinishedAt'].map(k=>[k,before[k]]))}).status,'attention_required');
assert.equal(audit(logs,{...after,paused:true},{...before,paused:true}).status,'paused');
for(const patch of [{coalesced:true},{duplicate:true},{status:409},{coalesced:undefined,duplicate:undefined}]){
 const result=audit([record('cron_result',{status:200,...patch})]);assert.equal(result.cron.completed,0);
}
for(const rows of [logs.slice(1),[...logs,logs[3]],[logs[1],logs[0],...logs.slice(2)],
 [logs[0],{...logs[1],at:iso(299999)},...logs.slice(2)],
 [...logs.slice(0,3),{...logs[3],at:iso(299999)}]]){
 const r=audit(rows);assert.equal(r.cron.completed,0);assert.equal(r.cron.incomplete,1);
}
const broken=audit([...logs,record('cron_failed',{status:500})]);assert.equal(broken.cron.failed,1);assert.equal(broken.cron.completed,0);
const privateLog=record('http_uncaught',{trigger:'http',status:500,actorId:'PRIVATE',error:'PRIVATE',cookie:'PRIVATE'});
const http=audit([...logs,privateLog,{...privateLog,event:'http_complete'},
 record('qa_auth_denied',{trigger:'http',status:403}),record('chat_throttled',{trigger:'http',status:429})]);
assert.equal(http.http.errors,1);assert.equal(http.http.authDenied,1);assert.equal(http.http.throttled,1);
assert(!JSON.stringify(http).includes('PRIVATE'));assert(!JSON.stringify(http).includes(requestId));
const models=audit([...logs,record('h6_shadow_eval',{status:200,h6Evaluations:7,h6ModelUsed:5,h6Errors:1}),
 record('h6_canary_result',{status:500,h6CanaryEvaluations:2,h6CanaryChanged:1,h6CanaryErrors:1,h6ModelUsed:1})]);
assert.equal(models.h6.shadowModelUsed,5);assert.equal(models.h6.canaryChanged,1);assert.equal(models.status,'attention_required');
assert.equal(audit([...logs.map(r=>({...r,at:iso(-1)}))]).logs.inWindow,0);
for(const patch of [{durationMs:Infinity},{h6ModelUsed:-1},{at:'wrong'},{requestId:'PRIVATE'}])assert.throws(()=>audit([record('cron_result',patch)]));
assert.throws(()=>audit(Array.from({length:10001},()=>logs[0])));
const dir=mkdtempSync('/tmp/xom-qa-window-');
try{
 const paths=['before.json','after.json','logs.ndjson'].map(n=>dir+'/'+n);
 writeFileSync(paths[0],JSON.stringify(before));writeFileSync(paths[1],JSON.stringify(after));
 const run=(args=paths)=>spawnSync(process.execPath,['scripts/audit-qa-window.mjs',...args],{encoding:'utf8',timeout:10000});
 writeFileSync(paths[2],logs.map(r=>JSON.stringify(r)).join('\r\n')+'\n');
 const ok=run();assert.equal(ok.status,0,ok.stderr);assert.equal(JSON.parse(ok.stdout).status,'correlated_progress');
 writeFileSync(paths[2],'');assert.equal(JSON.parse(run().stdout).status,'insufficient_evidence');
 for(const content of ['PRIVATE',new Uint8Array([0xff]),' '.repeat(4*1024*1024+1)]){
  writeFileSync(paths[2],content);const bad=run();assert.equal(bad.status,1);assert(!bad.stderr.includes('PRIVATE')&&!bad.stderr.includes(dir));
 }
 symlinkSync(paths[0],dir+'/link');assert.equal(run([dir+'/link',...paths.slice(1)]).status,1);
 assert.equal(run([dir,...paths.slice(1)]).status,1);
}finally{rmSync(dir,{recursive:true});}
console.log(JSON.stringify({suite:'qa-window',pass:true,versionAndStageCorrelation:true,
 coalescedNotSuccess:true,privacy:true,boundedOfflineCli:true,nativeAttribution:false,mutations:0}));
