/** Run the real QA config CLI against disposable compiled-build fixtures. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {QA_LIVING_CRON} from '../lib/living/qa-scheduler.ts';
const script=resolve('scripts/configure-cloudflare-qa.mjs'),dir=mkdtempSync(join(tmpdir(),'xom-qa-config-'));
const location=join(dir,'dist/server/wrangler.json');mkdirSync(join(dir,'dist/server'),{recursive:true});mkdirSync(join(dir,'dist/client'));writeFileSync(join(dir,'dist/server/index.js'),'export default {};');
const base={name:'site-creator-vinext-starter',main:'index.js',assets:{directory:'../client'},compatibility_flags:['nodejs_compat'],d1_databases:[{binding:'DB',database_id:'placeholder'}]};
const run=()=>spawnSync(process.execPath,[script],{cwd:dir,encoding:'utf8'});
function rejected(change){const value={...structuredClone(base),...change},before=JSON.stringify(value);writeFileSync(location,before);const r=run();assert.notEqual(r.status,0,r.stdout);assert.equal(readFileSync(location,'utf8'),before,'Rejected config must not be overwritten');}
try{
 for(const name of ['site-creator-vinext-starter','ai-living-staging','ai-living-qa']){
  writeFileSync(location,JSON.stringify({...base,name}));const r=run();assert.equal(r.status,0,r.stderr);const cfg=JSON.parse(readFileSync(location));assert.equal(cfg.name,'ai-living-qa');assert.equal(cfg.d1_databases[0].database_id,'21347bba-caaf-4ba5-9d80-d849958192d1');assert.equal(cfg.vars.XOM_RULE_SCHEDULER,'true');assert.equal(cfg.vars.XOM_SYSTEM_LOGS,'true');assert.deepEqual(cfg.version_metadata,{binding:'CF_VERSION_METADATA'});assert(cfg.vars.XOM_QA_ACCESS_AUD&&cfg.vars.XOM_QA_ACCESS_TEAM_DOMAIN&&cfg.vars.XOM_QA_HOSTNAME);assert.equal(cfg.preview_urls,false);assert.deepEqual(cfg.triggers.crons,[QA_LIVING_CRON]);
  const before=readFileSync(location,'utf8'),repeat=run();assert.equal(repeat.status,0,repeat.stderr);assert.equal(readFileSync(location,'utf8'),before,'Reconfiguration must keep exactly one unchanged cron');
 }
 for(const change of [{name:'unrelated-production'},{main:'missing.js'},{assets:{directory:'../absent'}},{compatibility_flags:[]},{d1_databases:[]},{d1_databases:[{binding:'OTHER'}]},{routes:['*']},{route:'*'},{triggers:{crons:['* * * * *']}},{triggers:{crons:[QA_LIVING_CRON]}},{name:'ai-living-qa',triggers:{crons:[QA_LIVING_CRON,QA_LIVING_CRON]}},{vars:{XOM_OWNER_PRIVATE_ORIGIN:'https://example.invalid'}},{vars:{XOM_LOCAL_ADMIN:'true'}},{vars:{XOM_ADMIN_USER_ID:'fixture'}}])rejected(change);
 console.log(JSON.stringify({suite:'cloudflare-qa-config',acceptedNames:3,rejectedCases:14,idempotent:true,isolatedQaD1:true,accessConfig:true,singleExistingCron:true,network:false}));
}finally{rmSync(dir,{recursive:true,force:true});}
