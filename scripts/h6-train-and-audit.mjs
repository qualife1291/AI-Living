/** H6 isolated sandbox wrapper: no modifications to live scenarios/DB.
 * All trained priors carry the H6 (96 scenario) fingerprint. Production's
 * 41-scenario registry is kept byte-for-byte identical and cannot import them.
 */
import {cpSync,mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const live=readFileSync(join(root,'data/city/scenarios.json'));
const shadow=JSON.parse(readFileSync(join(root,'data/training/h6-scenario-catalog.json'),'utf8'));
const existing=JSON.parse(live);
assert.equal(existing.length,41);
assert.equal(shadow.length,96);
assert.deepEqual(shadow.slice(0,41),existing,'Shadow training must retain old 41 scenarios');
const sandbox=mkdtempSync(join(tmpdir(),'ai-living-h6-shadow-'));
let result;
try {
  cpSync(join(root,'lib'),join(sandbox,'lib'),{recursive:true});
  cpSync(join(root,'data'),join(sandbox,'data'),{recursive:true});
  cpSync(join(root,'package.json'),join(sandbox,'package.json'));
  mkdirSync(join(sandbox,'scripts'),{recursive:true});
  cpSync(join(root,'scripts/h6-shadow-worker.mjs'),join(sandbox,'scripts/h6-shadow-worker.mjs'));
  symlinkSync(join(root,'node_modules'),join(sandbox,'node_modules'),'dir');
  writeFileSync(join(sandbox,'data/city/scenarios.json'),JSON.stringify(shadow));
  result=spawnSync(process.execPath,[join(sandbox,'scripts/h6-shadow-worker.mjs'),...process.argv.slice(2)],{
    cwd:root,stdio:'inherit',env:{...process.env,H6_SHADOW_SANDBOX:'true'},timeout:55*60*1000,
  });
  assert.equal(readFileSync(join(root,'data/city/scenarios.json')).toString(),live.toString(),'Live scenarios mutated');
  if(result.error)throw result.error;
  if(result.signal)throw Error('H6 shadow process terminated: '+result.signal);
  process.exitCode=result.status===0?0:result.status||1;
} finally {
  rmSync(sandbox,{recursive:true,force:true,maxRetries:2});
}
