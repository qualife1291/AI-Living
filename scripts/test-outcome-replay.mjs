import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {ReplayCorpus,fitReplay,compileReplay,replayExperience,replayArtifactSchema,selectReplayScenario,replayPrediction} from '../lib/living/outcome-replay.ts';
import {runReplayRollout,compareReplayRollouts} from '../lib/living/replay-harness.ts';
import {initializeAgent,chooseScenario} from '../lib/living/learning.ts';
import {linearScore,decisionContext} from '../lib/living/linucb.ts';
import {fixtureContext} from './learning-fixtures.mjs';
import {digest,corpusDigest} from './replay-files.mjs';
const profile='cold-stress-v1',seeds=[11,37],scope={kind:'synthetic-cohort',trainingSeeds:seeds,agents:3,days:5,shiftDay:2};
const records=[];runReplayRollout({variant:'personal-v1',profile,seeds,agents:3,days:5,shiftDay:2},undefined,(_seed,o)=>records.push(replayExperience(o)));
const build=(rows,s=scope)=>{const b=new ReplayCorpus(s);for(const r of rows)b.add(r);return b.finish();};
const source=c=>({kind:c.scope.kind==='actor'?'local-owner-jsonl':'synthetic-generator',sha256:'a'.repeat(64),acceptedDigest:corpusDigest(c)});
const corpus=build(records),chrono=fitReplay(corpus,'chronological',source(corpus),profile),curriculum=fitReplay(corpus,'curriculum',source(corpus),profile);
assert.equal(corpus.report.accepted,720);assert(corpus.report.stages.every(n=>n>0));
const reversed=build([...records].reverse());assert.equal(corpusDigest(corpus),corpusDigest(reversed));
assert.deepEqual(fitReplay(reversed,'chronological',source(reversed),profile),chrono,'Input order cannot rewrite the canonical corpus/model');
assert.throws(()=>corpus.examples[0].context.push(.5));
const a=compileReplay(chrono),b=compileReplay(curriculum),id='H1:101:resident:0',agent=initializeAgent(id),ctx=fixtureContext(),x=decisionContext(agent,ctx.weather);
for(const row of chrono.rows) {
 assert(Math.abs(a.mean(id,row.scenarioId,x)-b.mean(id,row.scenarioId,x))<1e-8,'One-pass ridge is order invariant, not a curriculum learning claim');
 assert(Math.abs(a.mean(id,row.scenarioId,x)-linearScore(row.model,x,0).mean)<1e-10);
}
const chosen=selectReplayScenario(agent,id,ctx,'Thư viện',b),stateBytes=JSON.stringify(agent);
selectReplayScenario(agent,id,ctx,'Thư viện',b);assert.equal(JSON.stringify(agent),stateBytes);assert.equal(agent.samples,0);assert.deepEqual(agent.domainSkills,{});assert.equal(agent.linear,undefined);
const late={...agent,samples:24};assert.equal(selectReplayScenario(late,id,ctx,'Thư viện',b).id,chooseScenario(late,id,ctx,'Thư viện').id);
assert.equal(replayPrediction(b,late,id,chosen.id,x),null);
const needy={...agent,energy:10};assert.equal(selectReplayScenario(needy,id,ctx,'Thư viện',{assertActor(){},mean(){throw Error('Emergency cannot consult prior');}}).id,'rest-home');
const owner=records[0].actorId,own=records.filter(r=>r.actorId===owner),ownerScope={kind:'actor',actorId:owner};
const ownerCorpus=build(records,ownerScope),local=fitReplay(ownerCorpus,'curriculum',source(ownerCorpus),null),privateModel=compileReplay(local);
assert.equal(ownerCorpus.report.foreign,records.length-own.length);assert.equal(local.report.actors,1);
assert.throws(()=>privateModel.mean('other',own[0].scenarioId,own[0].context),/actor/);
assert.throws(()=>selectReplayScenario({...agent,samples:24},'other',ctx,'Thư viện',privateModel),/actor/);
const foreign={actorId:'someone-else',rewardEvidence:{privateMemory:'should never be parsed'}};
assert.equal(build([own[0],foreign],ownerScope).report.foreign,1);
const duplicate=build([own[0],structuredClone(own[0])],ownerScope),modelOnce=fitReplay(duplicate,'chronological',source(duplicate),null);
assert.equal(duplicate.report.duplicates,1);assert.equal(modelOnce.rows[0].model.samples,1,'Repeated replay never increases confidence');
const renamed=structuredClone(own[0]);renamed.id+='-alias';renamed.rewardEvidence.identity.experienceId=renamed.id;
let bad=build([own[0],renamed],ownerScope);assert.equal(bad.report.conflicts,1);assert.throws(()=>fitReplay(bad,'chronological',source(bad),null),/conflicting/);
const collision=structuredClone(own[1]);collision.id=own[0].id;collision.rewardEvidence.identity.experienceId=collision.id;
bad=build([own[0],collision],ownerScope);assert.equal(bad.report.conflicts,1);
const legacy=structuredClone(own[0]);delete legacy.rewardEvidence;
for(const rows of [[own[0],legacy],[legacy,own[0]]])assert.equal(build(rows,ownerScope).report.conflicts,1,'No implicit legacy evidence upgrade');
const unverified=build([legacy],ownerScope);assert.equal(unverified.report.legacy,1);assert.throws(()=>fitReplay(unverified,'curriculum',source(unverified),null),/No compatible/);
const weak=structuredClone(own[0]);weak.rewardEvidence.plan.binding='legacy-start-time';weak.rewardEvidence.plan.declaredKey=null;
assert.equal(build([weak],ownerScope).report.weak,1);
for(const change of [r=>r.rewardEvidence.rewardVersion='future',r=>r.rewardEvidence.featureVersion='future',r=>r.context[1]=NaN,r=>r.reward+=.1]) {
 const row=structuredClone(own[0]);change(row);bad=build([row],ownerScope);assert(bad.report.invalid);assert.throws(()=>fitReplay(bad,'curriculum',source(bad),null));
}
const gap=structuredClone(own[0]);gap.rewardEvidence.samples={before:1000,after:1001};const g=build([gap],ownerScope);
assert.equal(fitReplay(g,'curriculum',source(g),null).rows[0].model.samples,1,'Historical gaps are not invented earned/replayed trials');
const old=structuredClone(own[0]);old.rewardEvidence.plan.settledSimMs=1e9;
assert(build([old,own[1]],ownerScope).report.conflicts>0,'Time and earned-sample ledger cannot fork silently');
for(const change of [p=>p.rows[0].model.samples++,p=>p.rows[0].model.inverse[1]=100,p=>p.rows[0].model.b[0]=1e9,p=>p.rows.push(p.rows[0]),p=>p.epochs=2,p=>p.scope.kind='unknown',p=>p.report.accepted++,p=>p.warmPlans=25]) {
 const row=structuredClone(curriculum);change(row);assert.throws(()=>replayArtifactSchema.parse(row));
}
const options={variant:'personal-v1',profile,seeds:[101,107],agents:3,days:5,shiftDay:2};
const baseline=runReplayRollout(options),candidate=runReplayRollout({...options,variant:'replay-coldstart-v1'},curriculum);
assert.deepEqual(candidate,runReplayRollout({...options,variant:'replay-coldstart-v1'},curriculum));
assert(candidate.runs.every(r=>r.priorPredictionsAfterCutoff===0));assert(candidate.raw.runs.every(r=>r.trainedSamples===r.completedPlans));
assert.equal(compareReplayRollouts(baseline,candidate).gates.enoughSeeds,false);
assert.throws(()=>runReplayRollout({...options,seeds:[11],variant:'replay-coldstart-v1'},curriculum),/overlap/);
assert.throws(()=>runReplayRollout({...options,profile:'ordinary-v1',variant:'replay-coldstart-v1'},curriculum),/profile/);
assert.throws(()=>runReplayRollout({...options,variant:'replay-coldstart-v1'},local),/source/);
const temp=mkdtempSync(join(tmpdir(),'h6-test-')),privateDir=resolve('.sites-runtime/training');mkdirSync(privateDir,{recursive:true});
const privateTemp=mkdtempSync(join(privateDir,'h6-test-'));
try {
 const input=join(temp,'own.jsonl'),output=join(privateTemp,'model.json'),raw=own.map(r=>JSON.stringify(r)).join('\n')+'\n';writeFileSync(input,raw);
 const run=(script,args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
 const args=[`--in=${input}`,`--actor=${owner}`,`--expected-sha256=${digest(raw)}`,`--out=${output}`];
 let result=run('scripts/replay-archive.mjs',args);assert.equal(result.status,0,result.stderr);assert(!result.stdout.includes(owner));assert.equal(readFileSync(input,'utf8'),raw);
 const bytes=readFileSync(output);result=run('scripts/replay-archive.mjs',args);assert.notEqual(result.status,0);assert.deepEqual(readFileSync(output),bytes);
 result=run('scripts/replay-archive.mjs',[...args.slice(0,3),`--out=${join(temp,'tracked.json')}`]);assert.notEqual(result.status,0);assert(result.stderr.includes('Private replay'));
 result=run('scripts/replay-archive.mjs',[args[0],args[1],'--expected-sha256='+'0'.repeat(64),`--out=${join(privateTemp,'wrong.json')}`]);assert.notEqual(result.status,0);assert(result.stderr.includes('checksum'));
 writeFileSync(input,'{"private-token-fixture":broken}\n');result=run('scripts/replay-archive.mjs',[args[0],args[1],`--expected-sha256=${digest(readFileSync(input))}`,`--out=${join(privateTemp,'bad.json')}`]);assert.notEqual(result.status,0);assert(!result.stderr.includes('private-token-fixture'));
 const out=join(temp,'synthetic.json'),trainArgs=['--seeds=2','--validation-seeds=2','--agents=2','--days=4',`--out=${out}`];
 result=run('scripts/train-replay.mjs',trainArgs);assert.equal(result.status,0,result.stderr);const modelBytes=readFileSync(out);
 result=run('scripts/train-replay.mjs',trainArgs);assert.equal(result.status,0,result.stderr);assert.deepEqual(readFileSync(out),modelBytes);
 const file=JSON.parse(modelBytes);assert(file.orderInvariantWithinTolerance);file.sha256='0'.repeat(64);const tampered=join(temp,'tampered.json');writeFileSync(tampered,JSON.stringify(file));
 result=run('scripts/sim-replay.mjs',['--variant=replay-coldstart-v1',`--prior=${tampered}`]);assert.notEqual(result.status,0);assert(result.stderr.includes('checksum'));
 result=run('scripts/sim-replay.mjs',['--variant=replay-coldstart-v1','--seed-start=7000',`--prior=${out}`]);assert.notEqual(result.status,0);assert(result.stderr.includes('overlap'));
} finally {rmSync(temp,{recursive:true,force:true});rmSync(privateTemp,{recursive:true,force:true});}
console.log(JSON.stringify({suite:'outcome-replay',actorFilterBeforeAudit:true,strictCompatibleEvidence:true,exactDedupAndSampleIdentity:true,
 conflictsFatal:true,legacyNoBackfill:true,sourceUnchanged:true,privateArtifactOnly:true,noPrivateErrorEcho:true,
 sameUniqueRecordsOnce:true,ridgeOrderInvariant:true,cutoffExactPersonalFallback:true,noEarnedSampleSkillMatrixTransfer:true,
 deterministic:true,seedProfileIsolation:true,productionAccess:false}));
