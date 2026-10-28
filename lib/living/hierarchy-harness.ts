/** Offline H4 wrapper; preserve H1/H2 reports and all production planner calls. */
import {runLearningRollout,compareLearningRollouts,summarize,type RolloutOptions,type RolloutOutcome} from "./sim-harness.ts";
import {decisionContext,linearScore} from "./linucb.ts";
import {compileHierarchy,hierarchyRole,hierarchyPrediction,selectHierarchyScenario,
  type HierarchyVariant,type HierarchyPrior} from "./hierarchical-prior.ts";

export type HierarchyOptions=Omit<RolloutOptions,"policy"|"profile">&{variant:HierarchyVariant;profile:"ordinary-v1"|"cold-stress-v1"};
export function runHierarchyRollout(options:HierarchyOptions,artifact?:HierarchyPrior,
  onOutcome?:(seed:number,outcome:RolloutOutcome)=>void) {
  if(!["personal-v1","global-prior-v1","role-prior-v1"].includes(options.variant))throw Error("Unknown hierarchy variant");
  if(options.variant!=="personal-v1"&&!artifact)throw Error("Hierarchy candidate requires a prior");
  if(options.variant==="personal-v1"&&artifact)throw Error("Personal baseline does not consume a prior");
  const prior=artifact?compileHierarchy(artifact):undefined;
  if(prior&&(prior.profile!==options.profile||prior.trainingSeeds.some(s=>options.seeds.includes(s))))
    throw Error("Hierarchy prior profile mismatch or training/evaluation seed overlap");
  const measurements=new Map<number,{n:number;personalError:number;blendedError:number;firstDayReturn:number;
    priorUses:number;roleUses:number;weight:number;coldWeight:number;coldN:number}>();
  const pending=new Map<string,{id:string;personal:number;blended:number;weight:number;scope:string|undefined;day:number}>();
  const raw=runLearningRollout({policy:"linucb",profile:options.profile,agents:options.agents,days:options.days,
    seeds:[...options.seeds],shiftDay:options.shiftDay},(agent,id,context)=>{
    const day=Math.round((Date.parse(context.date)-Date.UTC(2026,9,1))/86_400_000);
    const role=hierarchyRole(id,day,options.shiftDay);
    const choice=selectHierarchyScenario(agent,id,context,role,options.variant,prior);
    const x=decisionContext(agent,context.weather),arm=agent.linear?.[choice.id];
    const personal=arm?linearScore(arm,x).mean:agent.actions[choice.id]?.meanReward??0;
    const shared=hierarchyPrediction(agent,choice.id,x,role.kind,options.variant,prior);
    pending.set(id,{id:choice.id,personal,blended:shared?personal+(shared.mean-personal)*shared.weight:personal,
      weight:shared?.weight??0,scope:shared?.scope,day});
    return choice;
  },{onOutcome:outcome=>{
    const decision=pending.get(outcome.actorId);if(!decision||decision.id!==outcome.scenarioId)throw Error("Missing hierarchy decision");
    pending.delete(outcome.actorId);
    const seed=Number(outcome.actorId.split(":")[1]);
    const m=measurements.get(seed)??{n:0,personalError:0,blendedError:0,firstDayReturn:0,priorUses:0,roleUses:0,weight:0,coldWeight:0,coldN:0};
    m.n++;m.personalError+=(outcome.reward-decision.personal)**2;m.blendedError+=(outcome.reward-decision.blended)**2;
    if(decision.day===0)m.firstDayReturn+=outcome.reward;
    if(decision.weight>0)m.priorUses++;if(decision.scope==="role-kind")m.roleUses++;
    m.weight+=decision.weight;if(outcome.sampleBefore<24){m.coldWeight+=decision.weight;m.coldN++;}
    measurements.set(seed,m);onOutcome?.(seed,outcome);
  }});
  const runs=options.seeds.map(seed=>{
    const m=measurements.get(seed)!;
    return {seed,personalMSE:m.personalError/m.n,blendedMSE:m.blendedError/m.n,
      firstDayReturnPerAgent:m.firstDayReturn/options.agents,priorUseFraction:m.priorUses/m.n,
      roleUseFraction:m.roleUses/m.n,meanPriorWeight:m.weight/m.n,first24PlansMeanPriorWeight:m.coldWeight/m.coldN};
  });
  const metrics=["personalMSE","blendedMSE","firstDayReturnPerAgent","priorUseFraction","roleUseFraction","meanPriorWeight","first24PlansMeanPriorWeight"] as const;
  return {kind:"hierarchical-role-rollout-v1",config:{...options,seeds:[...options.seeds]},
    grouping:"Default catalog role.kind; seeded actor role index rotates by one from shiftDay, with the same actual role place in every variant.",
    priorTrainingSeeds:prior?[...prior.trainingSeeds]:[],priorSource:artifact?.source??null,
    productionAccess:false,raw,runs,summary:Object.fromEntries(metrics.map(k=>[k,summarize(runs.map(r=>r[k]))])),
    sameDecisionMSEDelta:summarize(runs.map(r=>r.blendedMSE-r.personalMSE)),
    limits:"Synthetic role assignments and existing role-independent rewards. No physical/social/P2P authority or runtime policy activation. H1/H2 underlying profile limits remain."};
}
export function compareHierarchyRollouts(baseline:ReturnType<typeof runHierarchyRollout>,candidate:ReturnType<typeof runHierarchyRollout>) {
  for(const report of [baseline,candidate]) {
    const config=report.config,raw=report.raw.config;
    if(report.runs.length!==config.seeds.length||report.runs.some((r,i)=>r.seed!==config.seeds[i])||
      JSON.stringify(raw.seeds)!==JSON.stringify(config.seeds)||raw.policy!=="linucb"||raw.profile!==config.profile||
      raw.agents!==config.agents||raw.days!==config.days||raw.shiftDay!==config.shiftDay)
      throw Error("Missing or misaligned hierarchy results");
  }
  const comparable=(r:typeof baseline)=>JSON.stringify({...r.config,variant:undefined});
  if(baseline.kind!==candidate.kind||comparable(baseline)!==comparable(candidate)||baseline.grouping!==candidate.grouping)
    throw Error("Hierarchy reports must share roles/profile/seeds/horizon");
  const comparison=compareLearningRollouts(baseline.raw,candidate.raw);
  return {...comparison,baseline:baseline.config.variant,candidate:candidate.config.variant,
    firstDayReturnDelta:summarize(candidate.runs.map((r,i)=>r.firstDayReturnPerAgent-baseline.runs[i].firstDayReturnPerAgent))};
}
