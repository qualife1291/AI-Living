/** Frozen synthetic corpus -> chronological/curriculum fits -> validation only. */
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {hashSeed} from '../lib/clock.ts';
import {ReplayCorpus,fitReplay,compileReplay,replayExperience} from '../lib/living/outcome-replay.ts';
import {runReplayRollout} from '../lib/living/replay-harness.ts';
import {corpusDigest,writeReplayFile} from './replay-files.mjs';
const {values}=parseArgs({options:{profile:{type:'string',default:'cold-stress-v1'},seeds:{type:'string',default:'8'},'seed-start':{type:'string',default:'6000'},'validation-seeds':{type:'string',default:'8'},'validation-start':{type:'string',default:'7000'},agents:{type:'string',default:'12'},days:{type:'string',default:'15'},out:{type:'string'}},strict:true,allowPositionals:false});
if(!values.out)throw Error('out required');
const count=Number(values.seeds),start=Number(values['seed-start']),vcount=Number(values['validation-seeds']),vstart=Number(values['validation-start']),agents=Number(values.agents),days=Number(values.days);
for(const [n,lo,hi] of [[count,2,100],[start,0,1e6],[vcount,1,100],[vstart,0,1e6]])if(!Number.isSafeInteger(n)||n<lo||n>hi)throw Error('Invalid replay seed budget');
const seeds=Array.from({length:count},(_,i)=>hashSeed(`H1-seed:${start+i}`)),validationSeeds=Array.from({length:vcount},(_,i)=>hashSeed(`H1-seed:${vstart+i}`));
if(validationSeeds.some(s=>seeds.includes(s)))throw Error('Replay training/validation seed overlap');
const scope={kind:'synthetic-cohort',trainingSeeds:seeds,agents,days,shiftDay:Math.floor(days/2)},builder=new ReplayCorpus(scope),hash=createHash('sha256'),begin=performance.now();
runReplayRollout({variant:'personal-v1',profile:values.profile,agents,days,seeds,shiftDay:scope.shiftDay},undefined,(_seed,outcome)=>{
 const record=replayExperience(outcome);builder.add(record);hash.update(JSON.stringify(record)+'\n');
});
const corpus=builder.finish(),source={kind:'synthetic-generator',sha256:hash.digest('hex'),acceptedDigest:corpusDigest(corpus)};
const models=Object.fromEntries(['chronological','curriculum'].map(order=>[order,fitReplay(corpus,order,source,values.profile)]));
const chronological=compileReplay(models.chronological),curriculum=compileReplay(models.curriculum),metrics=new Map();
runReplayRollout({variant:'personal-v1',profile:values.profile,agents,days,seeds:validationSeeds,shiftDay:scope.shiftDay},undefined,(seed,o)=>{
 const a=chronological.mean(o.actorId,o.scenarioId,o.context),b=curriculum.mean(o.actorId,o.scenarioId,o.context);
 const m=metrics.get(seed)??{seed,n:0,covered:0,chronologicalMSE:0,curriculumMSE:0,maxPredictionDifference:0};m.n++;if(a!==null&&b!==null)m.covered++;
 m.chronologicalMSE+=(o.reward-(a??0))**2;m.curriculumMSE+=(o.reward-(b??0))**2;
 m.maxPredictionDifference=Math.max(m.maxPredictionDifference,Math.abs((a??0)-(b??0)));metrics.set(seed,m);
});
const validation=[...metrics.values()].map(m=>({...m,chronologicalMSE:m.chronologicalMSE/m.n,curriculumMSE:m.curriculumMSE/m.n}));
const payload={models,validationSeeds,validation,orderTolerance:1e-8,orderInvariantWithinTolerance:validation.every(m=>m.maxPredictionDifference<=1e-8),
 semantics:'Same unique corpus, one pass each; ridge order changes are numerical, not added information or earned samples.',productionAccess:false};
const sha256=writeReplayFile(values.out,payload);
console.log(JSON.stringify({sha256,accepted:corpus.report.accepted,stages:corpus.report.stages,validationOutcomes:validation.reduce((n,m)=>n+m.n,0),orderInvariant:payload.orderInvariantWithinTolerance,seconds:+((performance.now()-begin)/1000).toFixed(3)}));
