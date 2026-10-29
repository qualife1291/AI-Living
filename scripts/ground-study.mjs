/** Frozen H3b physical task generator; no arbitrary seed search or user records. */
import {parseArgs} from 'node:util';
import {performance} from 'node:perf_hooks';
import protocol from '../docs/validation/learning-h3b-protocol-v1.json' with {type:'json'};
import {groundOffer,replayGroundOffer,GroundRendezvousTrainer,validateGroundModel,chooseGroundAppointment,groundLearningProtocolSha} from '../lib/living/ground-learning.ts';
import {compareGroundStudy,studyRow} from '../lib/living/ground-learning-study.ts';
import {prepareStudyOutput,writeStudyOutput,readStudyModel} from './ground-study-files.mjs';
try{
 const {values}=parseArgs({options:{stage:{type:'string',default:'smoke'},model:{type:'string'},'model-sha256':{type:'string'},out:{type:'string'}},strict:true,allowPositionals:false});
 const stage=values.stage;if(!['smoke','train','validation','holdout'].includes(stage)||!values.out)throw Error('study-arguments');
 const training=stage==='smoke'||stage==='train';if(training&&(values.model||values['model-sha256'])||!training&&(!values.model||!values['model-sha256']))throw Error('study-model-arguments');
 const output=prepareStudyOutput(values.out),split=stage==='smoke'?{seeds:[17900],episodesPerSeed:2}:protocol.generator.splits[stage],trainer=training?new GroundRendezvousTrainer(stage,split.seeds):null;
 const file=training?null:readStudyModel(values.model,values['model-sha256']),model=file?await validateGroundModel(file.model):null;if(model&&model.stage!=='train')throw Error('study-training-stage');
 const outcomes=[],rows=[];let physicsSteps=0;
 const begin=performance.now();
 for(const seed of split.seeds){for(let episode=0;episode<split.episodesPerSeed;episode++){
  const result=await replayGroundOffer(groundOffer(seed,episode)),outcome=result.outcome;if(!outcome)throw Error('study-incomplete');outcomes.push(outcome);physicsSteps+=result.inspection.physicsSteps;
  if(trainer)await trainer.observe(outcome);else rows.push(studyRow(outcome,chooseGroundAppointment(model,outcome.context),result.inspection.actualActorRouteAtChoice));
 }console.log(JSON.stringify({progress:'seed-completed',stage,seed,episodes:split.episodesPerSeed}));}
 const payload={kind:'H3b-ground-study-v1',stage,protocolSha256:await groundLearningProtocolSha(),source:'synthetic actual GND2/GND3 replay; no durable D1 or production observations',modelSha256:file?values['model-sha256']:null,model:trainer?await trainer.artifact():null,outcomes,rows,comparison:training?null:compareGroundStudy(rows),physicsSteps,productionAccess:false,runtimeImportAllowed:false};
 const sha256=writeStudyOutput(output,payload,training?1_000_000:8_000_000);
 console.log(JSON.stringify({stage,sha256,tasks:outcomes.length,physicsSteps,fulfilled:outcomes.filter(o=>o.fulfilled).length,comparison:payload.comparison,seconds:+((performance.now()-begin)/1000).toFixed(2),productionAccess:false,runtimePromotion:false}));
}catch{console.error('H3b study failed: check registered stage, local file integrity and output admission. No runtime import or automatic retry.');process.exitCode=1;}
