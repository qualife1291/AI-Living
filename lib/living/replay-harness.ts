/** H6 evaluation only; no production actor/policy updates beyond fixture rollout. */
import {runLearningRollout,compareLearningRollouts,summarize,type RolloutOptions,type RolloutOutcome} from "./sim-harness.ts";
import {hierarchyRole} from "./hierarchical-prior.ts";
import {decisionContext,linearScore} from "./linucb.ts";
import {compileReplay,selectReplayScenario,replayPrediction,type ReplayArtifact} from "./outcome-replay.ts";
export type ReplayOptions=Omit<RolloutOptions,"policy"|"profile">&{variant:"personal-v1"|"replay-coldstart-v1";profile:"ordinary-v1"|"cold-stress-v1"};
export function runReplayRollout(options:ReplayOptions,artifact?:ReplayArtifact,onOutcome?:(seed:number,outcome:RolloutOutcome)=>void) {
  if(!["personal-v1","replay-coldstart-v1"].includes(options.variant))throw Error("Unknown replay variant");
  if(options.variant==="personal-v1"?artifact!==undefined:artifact===undefined)throw Error("Candidate requires replay model; baseline does not consume it");
  const prior=artifact?compileReplay(artifact):undefined;
  if(prior&&(prior.scope.kind!=="synthetic-cohort"||prior.profile!==options.profile||prior.scope.trainingSeeds.some(s=>options.seeds.includes(s))))
    throw Error("Replay evaluation source/profile mismatch or training/evaluation seed overlap");
  const decisions=new Map<string,{personal:number;blended:number;weight:number;day:number}>();
  const measures=new Map<number,{n:number;a:number;b:number;first:number;uses:number;lateUses:number}>();
  const raw=runLearningRollout({policy:"linucb",profile:options.profile,agents:options.agents,days:options.days,seeds:[...options.seeds],shiftDay:options.shiftDay},
    (agent,id,context)=>{
      const day=Math.round((Date.parse(context.date)-Date.UTC(2026,9,1))/86_400_000),role=hierarchyRole(id,day,options.shiftDay);
      const s=selectReplayScenario(agent,id,context,role.place,prior),x=decisionContext(agent,context.weather),arm=agent.linear?.[s.id];
      const personal=arm?linearScore(arm,x).mean:agent.actions[s.id]?.meanReward??0;
      const prediction=prior?replayPrediction(prior,agent,id,s.id,x):null;
      decisions.set(id,{personal,blended:prediction?personal+(prediction.mean-personal)*prediction.weight:personal,weight:prediction?.weight??0,day});return s;
    },{onOutcome:outcome=>{
      const d=decisions.get(outcome.actorId)!;decisions.delete(outcome.actorId);const seed=Number(outcome.actorId.split(":")[1]);
      const m=measures.get(seed)??{n:0,a:0,b:0,first:0,uses:0,lateUses:0};m.n++;m.a+=(outcome.reward-d.personal)**2;m.b+=(outcome.reward-d.blended)**2;
      if(d.day===0)m.first+=outcome.reward;if(d.weight>0){m.uses++;if(outcome.sampleBefore>=24)m.lateUses++;}
      measures.set(seed,m);onOutcome?.(seed,outcome);
    }});
  const runs=options.seeds.map(seed=>{const m=measures.get(seed)!;return {seed,personalMSE:m.a/m.n,blendedMSE:m.b/m.n,
    firstDayReturnPerAgent:m.first/options.agents,priorPredictions:m.uses,priorPredictionsAfterCutoff:m.lateUses};});
  return {kind:"audited-replay-rollout-v1",config:{...options,seeds:[...options.seeds]},raw,runs,
    summary:{firstDayReturn:summarize(runs.map(r=>r.firstDayReturnPerAgent)),personalMSE:summarize(runs.map(r=>r.personalMSE)),blendedMSE:summarize(runs.map(r=>r.blendedMSE))},
    sameDecisionMSEDelta:summarize(runs.map(r=>r.blendedMSE-r.personalMSE)),productionAccess:false,activatesRuntimePolicy:false};
}
export function compareReplayRollouts(a:ReturnType<typeof runReplayRollout>,b:ReturnType<typeof runReplayRollout>) {
  if(JSON.stringify({...a.config,variant:undefined})!==JSON.stringify({...b.config,variant:undefined}))throw Error("Replay comparison profile/seed mismatch");
  for(const r of [a,b])if(r.runs.length!==r.config.seeds.length||r.runs.some((v,i)=>v.seed!==r.config.seeds[i])||
    JSON.stringify(r.raw.config)!==JSON.stringify({policy:"linucb",profile:r.config.profile,agents:r.config.agents,days:r.config.days,seeds:r.config.seeds,shiftDay:r.config.shiftDay}))throw Error("Misaligned replay results");
  return {...compareLearningRollouts(a.raw,b.raw),baseline:a.config.variant,candidate:b.config.variant,
    firstDayReturnDelta:summarize(b.runs.map((r,i)=>r.firstDayReturnPerAgent-a.runs[i].firstDayReturnPerAgent))};
}
