/** Recompute frozen study decisions. No simulation, tuning, inference or reserved holdout outcomes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {compareLearningRollouts} from '../lib/living/sim-harness.ts';
import {compareHierarchyRollouts} from '../lib/living/hierarchy-harness.ts';
import {compareReplayRollouts} from '../lib/living/replay-harness.ts';
import {compareBoundedRollouts,shortlistCandidates,selectValidationCandidate} from '../lib/living/bounded-search.ts';
const {values}=parseArgs({options:{out:{type:'string'}},strict:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const checked=new Map(),decisions=[];
function read(path,expected){
 const bytes=readFileSync(path),data=JSON.parse(bytes);
 if(data.sha256){const {sha256,...body}=data;assert.equal(hash(JSON.stringify(body)),sha256,`Payload checksum ${path}`);}
 if(expected)assert.equal(data.sha256??hash(bytes),expected,`Pinned checksum ${path}`);
 checked.set(path,{path,fileSha256:hash(bytes),payloadSha256:data.sha256??null});return data;
}
function refs(value){
 if(!value||typeof value!=='object')return;
 if(typeof value.path==='string'&&value.path.startsWith('docs/validation/')&&value.sha256){
  // Historical repeat record hashes the report body; stage refs hash the full payload.
  if(value.identicalReportBytes){const data=read(value.path);assert.equal(hash(JSON.stringify(data.report)),value.sha256,`Repeat report checksum ${value.path}`);}
  else read(value.path,value.sha256);
 }
 for(const v of Object.values(value))refs(v);
}
function decision(phase,profile,comparison){
 assert.equal(comparison.activatesRuntimePolicy,false);
 decisions.push({phase,profile,candidate:comparison.candidate,passes:comparison.passesProposedOfflineGates,gates:comparison.gates});
}
for(const phase of ['h2','h4','h6']){
 const evidence=read(`docs/validation/learning-${phase}-2026-10-28.json`);refs(evidence);
 for(const p of evidence.profiles){
  if(phase==='h2'){
   const reports=new Map(p.policies.map(x=>[x.policy,read(x.path,x.sha256)]));
   for(const c of p.comparisons){const fresh=compareLearningRollouts(reports.get(c.baseline),reports.get(c.candidate));assert.deepEqual(fresh,read(c.path));assert.deepEqual(fresh.gates,c.gates);assert.equal(fresh.passesProposedOfflineGates,c.passes);decision(phase,p.profile,fresh);}
  }else if(phase==='h4'){
   for(const s of p.splits){const base=read(s.policies.find(x=>x.variant==='personal-v1').path).report;
    for(const c of s.policies.filter(x=>x.variant!=='personal-v1')){const file=read(c.path,c.sha256),fresh=compareHierarchyRollouts(base,file.report);assert.deepEqual(fresh,file.comparison);assert.deepEqual(fresh,c.comparison);decision(`${phase}-${s.split}`,p.profile,fresh);}
   }
  }else{
   const [base,candidate]=p.policies.map(x=>read(x.path,x.sha256));const fresh=compareReplayRollouts(base.report,candidate.report);assert.deepEqual(fresh,candidate.comparison);assert.deepEqual(fresh,p.comparison);decision(phase,p.profile,fresh);
  }
 }
}
const evidence=read('docs/validation/learning-h10-2026-10-28.json');refs(evidence);
const search=read(evidence.search.path,evidence.search.sha256),validation=read(evidence.validation.path,evidence.validation.sha256);
assert.equal(validation.parentSha256,search.sha256);
for(const stage of [search,validation]){
 const cases=stage.cases.map(ref=>({ref,data:read(`docs/validation/h10-v1/${stage.stage}/${ref.profile}/${ref.id}.json`,ref.sha256)}));
 for(const score of stage.scores)for(const p of score.profiles){
  const base=cases.find(x=>x.ref.profile===p.profile&&x.ref.id==='personal-v1').data;
  const candidate=cases.find(x=>x.ref.profile===p.profile&&x.ref.id===score.id).data;
  const fresh=compareBoundedRollouts(base.report,candidate.report);assert.deepEqual(fresh,p.comparison);decision(`h10-${stage.stage}`,p.profile,fresh);
 }
}
assert.deepEqual(shortlistCandidates(search.scores,2).map(x=>({id:x.id,params:x.params})),search.shortlist);
assert.deepEqual(validation.candidates,search.shortlist);
assert.equal(selectValidationCandidate(validation.scores,search.shortlist.map(x=>x.id)),null);assert.equal(validation.selected,null);
const holdout=read(evidence.holdout.path,evidence.holdout.sha256);assert.equal(holdout.plans,0);assert.equal(evidence.holdout.opened,false);assert.equal(evidence.holdout.outcomeFiles,0);
assert.ok(!readdirSync('docs/validation/h10-v1').includes('holdout'),'No reserved holdout outcome directory');
const report={kind:'frozen-learning-evidence-acceptance-v1',freshInference:false,freshRollouts:false,checkedArtifacts:[...checked.values()],recomputedComparisons:decisions,holdout:{reserved12000to12019:'unobserved',plans:0},productionAccess:false,conclusion:'Frozen decisions recompute exactly. Negative studies remain negative; no candidate promotion or runtime activation.'};
if(values.out)writeFileSync(values.out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({kind:report.kind,artifacts:checked.size,comparisons:decisions.length,holdout:report.holdout}));
