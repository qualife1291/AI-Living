import {spawnSync,execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Commit the reviewed source before release build.');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const result=spawnSync(process.execPath,['scripts/run-framework.mjs','build'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
writeFileSync('dist/.openai/source.json',JSON.stringify({commit_sha:commit,built_at:new Date().toISOString()})+'\n');
