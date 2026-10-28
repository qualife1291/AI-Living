/** Manual three-stage offline optimizer. Never patches code, runs Git, installs
 * a model, calls a service, schedules work or writes production data. */
import {parseArgs} from 'node:util';
import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {searchProtocolSchema,searchGrid,seedValues,runBoundedRollout,compareBoundedRollouts,
 shortlistCandidates,selectValidationCandidate,SEARCH_VERSION} from '../lib/living/bounded-search.ts';
import {replayArtifactSchema} from '../lib/living/outcome-replay.ts';
import {digest,verifiedReplayFile,writeReplayFile} from './replay-files.mjs';

export function loadSearchInputs(protocolPath,modelsDir) {
 if(statSync(protocolPath).size>64*1024)throw Error('Search protocol exceeds budget');
 const bytes=readFileSync(protocolPath),protocol=searchProtocolSchema.parse(JSON.parse(bytes));
 const models={},modelHashes={};
 for(const profile of protocol.profiles) {
  const file=verifiedReplayFile(join(modelsDir,profile,'replay.json')),model=replayArtifactSchema.parse(file.models?.curriculum);
  if(model.scope.kind!=='synthetic-cohort'||model.profile!==profile||file.orderInvariantWithinTolerance!==true||!Number.isFinite(file.orderTolerance)||file.orderTolerance<0||file.orderTolerance>1e-8)
   throw Error('Optimizer only consumes validated synthetic model fixtures');
  assert.deepEqual(model.scope.trainingSeeds,seedValues(protocol.fit.seedIndices),'Fit seeds do not match protocol');
  assert.deepEqual(file.validationSeeds,seedValues(protocol.fit.pointValidationIndices),'Point-validation seeds do not match protocol');
  assert.equal(file.validation.length,protocol.fit.pointValidationIndices.length);
  for(const [i,r] of file.validation.entries()) {
   assert.equal(r.seed,file.validationSeeds[i]);assert.equal(r.n,protocol.fit.agents*protocol.fit.days*24);
   assert(Number.isFinite(r.maxPredictionDifference)&&r.maxPredictionDifference>=0&&r.maxPredictionDifference<=file.orderTolerance);
   assert(Number.isFinite(r.chronologicalMSE)&&r.chronologicalMSE>=0&&Number.isFinite(r.curriculumMSE)&&r.curriculumMSE>=0);
  }
  assert.equal(model.scope.agents,protocol.fit.agents);assert.equal(model.scope.days,protocol.fit.days);assert.equal(model.scope.shiftDay,protocol.fit.shiftDay);
  assert.equal(model.report.accepted,protocol.fit.agents*protocol.fit.days*24*protocol.fit.seedIndices.length);
  models[profile]=model;modelHashes[profile]=file.sha256;
 }
 return {protocol,models,identity:{version:SEARCH_VERSION,protocolSha256:digest(bytes),modelHashes}};
}
const configOf=(c)=>({id:c.id,params:{...c.params}});
export async function optimizePolicyStage({stage,protocolPath,modelsDir,out},notify=()=>{}) {
 if(!['search','validation','holdout'].includes(stage))throw Error('Stage must be search, validation or holdout');
 const {protocol:p,models,identity}=loadSearchInputs(protocolPath,modelsDir),grid=searchGrid(p);
 const configs=new Map(grid.map(c=>[c.id,c]));
 const casePath=(step,profile,id)=>join(out,step,profile,`${id}.json`);
 const checkConfig=(c)=>{const expected=configs.get(c.id);if(!expected)throw Error('Candidate is outside registered grid');assert.deepEqual(c,expected);return expected;};
 const seedsFor=step=>seedValues(p[step].seedIndices);
 const runCase=(step,profile,config)=>{
  const settings=p[step],id=config?.id??'personal-v1',params=config?.params??null;
  const report=runBoundedRollout({profile,params,agents:settings.agents,days:settings.days,seeds:seedsFor(step),shiftDay:settings.shiftDay},config?models[profile]:undefined);
  const body={stage:step,profile,id,identity,modelChecksum:config?identity.modelHashes[profile]:null,report};
  const sha256=writeReplayFile(casePath(step,profile,id),body);notify({stage:step,profile,id,complete:true});
  return {body,ref:{profile,id,sha256}};
 };
 const readCase=(step,ref)=>{
  if(!p.profiles.includes(ref.profile)||ref.id!=='personal-v1'&&!configs.has(ref.id))throw Error('Invalid optimizer case reference');
  const file=verifiedReplayFile(casePath(step,ref.profile,ref.id));assert.equal(file.sha256,ref.sha256);
  assert.deepEqual(file.identity,identity);assert.equal(file.stage,step);assert.equal(file.profile,ref.profile);assert.equal(file.id,ref.id);
  assert.deepEqual(file.report.config,{profile:ref.profile,params:ref.id==='personal-v1'?null:configs.get(ref.id).params,
    agents:p[step].agents,days:p[step].days,seeds:seedsFor(step),shiftDay:p[step].shiftDay});
  assert.equal(file.modelChecksum,ref.id==='personal-v1'?null:identity.modelHashes[ref.profile]);return file;
 };
 const scoreCases=(configsToScore,cases)=>configsToScore.map(c=>({id:c.id,params:c.params,profiles:p.profiles.map(profile=>{
  const base=cases.find(x=>x.profile===profile&&x.id==='personal-v1'),candidate=cases.find(x=>x.profile===profile&&x.id===c.id);
  if(!base||!candidate)throw Error('Missing optimizer baseline/candidate');
  return {profile,comparison:compareBoundedRollouts(base.report,candidate.report)};
 })}));
 const verifyParent=(step)=>{
  const file=verifiedReplayFile(join(out,`${step}.json`));assert.equal(file.stage,step);assert.equal(file.version,SEARCH_VERSION);assert.deepEqual(file.identity,identity);
  const parents=step==='search'?grid:file.candidates.map(checkConfig);
  if(step==='validation'&&parents.length>p.budget.shortlist)throw Error('Validation budget exceeded');
  const expectedKeys=p.profiles.flatMap(profile=>['personal-v1',...parents.map(c=>c.id)].map(id=>`${profile}:${id}`));
  assert.deepEqual(file.cases.map(r=>`${r.profile}:${r.id}`).sort(),expectedKeys.sort(),'Unexpected case budget or duplicate');
  const cases=file.cases.map(ref=>readCase(step,ref)),scores=scoreCases(parents,cases);assert.deepEqual(file.scores,scores);
  if(step==='search')assert.deepEqual(file.shortlist,shortlistCandidates(scores,p.budget.shortlist).map(configOf));
  else {
   const search=verifyParent('search');assert.equal(file.parentSha256,search.sha256);
   assert.deepEqual(file.candidates,search.shortlist);
   const selected=selectValidationCandidate(scores,search.shortlist.map(c=>c.id));assert.deepEqual(file.selected,selected?configOf(selected):null);
  }
  return file;
 };
 let payload;
 if(stage==='search') {
  const cases=[];
  for(const profile of p.profiles){cases.push(runCase(stage,profile,null));for(const c of grid)cases.push(runCase(stage,profile,c));}
  const scores=scoreCases(grid,cases.map(c=>c.body)),plans=cases.reduce((n,c)=>n+c.body.report.raw.runs.reduce((n,r)=>n+r.completedPlans,0),0);
  if(plans>p.budget.maxSearchPlans)throw Error('Search plan budget exceeded');
  payload={version:SEARCH_VERSION,stage,identity,candidates:grid,scores,shortlist:shortlistCandidates(scores,p.budget.shortlist).map(configOf),cases:cases.map(c=>c.ref),plans,
   holdoutOpened:false,productionAccess:false,activatesRuntimePolicy:false};
 } else if(stage==='validation') {
  const search=verifyParent('search'),candidates=search.shortlist.map(checkConfig),cases=[];
  // Even an empty shortlist gets a baseline only; no hidden replacement search.
  for(const profile of p.profiles){cases.push(runCase(stage,profile,null));for(const c of candidates)cases.push(runCase(stage,profile,c));}
  const scores=scoreCases(candidates,cases.map(c=>c.body)),selected=selectValidationCandidate(scores,candidates.map(c=>c.id));
  const plans=cases.reduce((n,c)=>n+c.body.report.raw.runs.reduce((n,r)=>n+r.completedPlans,0),0);if(plans>p.budget.maxValidationPlans)throw Error('Validation plan budget exceeded');
  payload={version:SEARCH_VERSION,stage,identity,parentSha256:search.sha256,candidates,scores,selected:selected?configOf(selected):null,cases:cases.map(c=>c.ref),plans,
   holdoutOpened:false,productionAccess:false,activatesRuntimePolicy:false};
 } else {
  const validation=verifyParent('validation');
  if(!validation.selected)payload={version:SEARCH_VERSION,stage,identity,parentSha256:validation.sha256,selected:null,opened:false,cases:[],plans:0,
   reason:'No candidate passes all validation performance gates on both profiles; holdout outcomes remain unobserved.',productionAccess:false,activatesRuntimePolicy:false};
  else {
   const selected=checkConfig(validation.selected),cases=[];
   for(const profile of p.profiles){cases.push(runCase(stage,profile,null));cases.push(runCase(stage,profile,selected));}
   const scores=scoreCases([selected],cases.map(c=>c.body)),plans=cases.reduce((n,c)=>n+c.body.report.raw.runs.reduce((n,r)=>n+r.completedPlans,0),0);
   if(plans>p.budget.maxHoldoutPlans)throw Error('Holdout budget exceeded');
   payload={version:SEARCH_VERSION,stage,identity,parentSha256:validation.sha256,selected,opened:true,scores,cases:cases.map(c=>c.ref),plans,
    passesOfflineGates:scores[0].profiles.every(p=>p.comparison.passesProposedOfflineGates),productionAccess:false,activatesRuntimePolicy:false};
  }
 }
 const sha256=writeReplayFile(join(out,`${stage}.json`),payload);
 return {...payload,sha256};
}
// Guard import: unit tests can exercise admission without starting any search.
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]) {
 const {values}=parseArgs({options:{stage:{type:'string'},protocol:{type:'string',default:'docs/validation/learning-h10-protocol-v1.json'},models:{type:'string'},out:{type:'string'}},strict:true,allowPositionals:false});
 if(!values.models||!values.out)throw Error('models and out required');
 const begin=performance.now(),result=await optimizePolicyStage({stage:values.stage,protocolPath:values.protocol,modelsDir:values.models,out:values.out},v=>console.log(JSON.stringify(v)));
 console.log(JSON.stringify({stage:result.stage,sha256:result.sha256,shortlist:result.shortlist??null,selected:result.selected??null,opened:result.opened??false,plans:result.plans,seconds:+((performance.now()-begin)/1000).toFixed(3)}));
}
