import assert from 'node:assert/strict';
import {createGitHubVerifier} from '../lib/ontology/github.ts';
import {githubFixture} from './ontology-github-fixture.mjs';
const fixture=githubFixture(),verify=createGitHubVerifier(fixture.fetch),repo={kind:'repository',id:'repository:project',fullName:'qualife1291/AI-Living',checks:[{workflow:'.github/workflows/asset-maintenance.yml',job:'verify',definitionSha:'c'.repeat(40)}]},now=Date.now();let cases=0;
const result=await verify(repo,10,now);assert.equal(result.headSha,'a'.repeat(40));assert.equal(result.checks[0].status,'success');cases++;
for(const mode of ['latest_failed','pending','wrong_sha','job_spoof','job_sha','skipped_job']){fixture.setMode(mode);assert.notEqual((await verify(repo,10,now)).checks[0].status,'success',mode);cases++;}
for(const mode of ['head_changed','fork','workflow_spoof','workflow_changed','run_spoof','run_repo_spoof','truncated_jobs','offline','oversize']){fixture.setMode(mode);await assert.rejects(verify(repo,10,now));cases++;}
assert(fixture.calls.every(c=>c.startsWith('https://api.github.com/repos/qualife1291/AI-Living')));cases++;
console.log(JSON.stringify({suite:'ontology-github',cases,passed:true,latestRunRequired:true,headRechecked:true,workflowJobRepositoryIdentity:true,readOnlyFixture:true,realNetwork:false}));
