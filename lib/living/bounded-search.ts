/** H10 finite offline search. JSON parameters never become code, earned samples,
 * actor matrices, runtime configuration, a DB write or a deployment. */
import {z} from "zod";
import {hashSeed} from "../clock.ts";
import {chooseScenario,availableScenarios,type AgentLearning,type Scenario} from "./learning.ts";
import {decisionContext,linearScore} from "./linucb.ts";
import {compileReplay,type ReplayArtifact,type CompiledReplay} from "./outcome-replay.ts";
import {hierarchyRole} from "./hierarchical-prior.ts";
import {runLearningRollout,compareLearningRollouts,summarize,type RolloutOptions} from "./sim-harness.ts";
import type {RealContext} from "./schema.ts";

export const SEARCH_VERSION="bounded-warm-search-v1" as const;
export const warmConfigSchema=z.object({warmPlans:z.number().int().min(1).max(72),priorK:z.number().finite().min(.1).max(5)}).strict();
export type WarmConfig=z.infer<typeof warmConfigSchema>;
const indices=(n:number)=>z.array(z.number().int().min(0).max(1_000_000)).length(n);
const cohort=(n:number,agents:number,days:number,shift:number)=>z.object({seedIndices:indices(n),agents:z.literal(agents),days:z.literal(days),shiftDay:z.literal(shift)}).strict();
export const searchProtocolSchema=z.object({
  phase:z.literal("H10"),version:z.literal(SEARCH_VERSION),registered_before_results:z.literal(true),reference_source:z.string().regex(/^[a-f0-9]{40}$/),
  profiles:z.tuple([z.literal("ordinary-v1"),z.literal("cold-stress-v1")]),
  fit:z.object({seedIndices:indices(8),pointValidationIndices:indices(8),agents:z.literal(12),days:z.literal(15),shiftDay:z.literal(7)}).strict(),
  search:cohort(4,12,30,15),validation:cohort(8,24,60,30),holdout:cohort(20,24,60,30),
  grid:z.object({warmPlans:z.array(warmConfigSchema.shape.warmPlans).length(3),priorK:z.array(warmConfigSchema.shape.priorK).length(3)}).strict(),
  budget:z.object({candidates:z.literal(9),shortlist:z.literal(2),holdoutCandidates:z.literal(1),maxFitOutcomes:z.literal(69120),maxPredictionValidationOutcomes:z.literal(69120),
    maxSearchPlans:z.literal(691200),maxValidationPlans:z.literal(1658880),maxHoldoutPlans:z.literal(2764800)}).strict(),
  shortlist_rule:z.string(),validation_rule:z.string(),holdout_rule:z.string(),policy:z.string(),seed_mapping:z.string(),
  gates:z.object({return:z.literal("paired CI95 lower>=0"),needs:z.literal("paired CI95 lower>=0"),opportunity_cost:z.literal("paired CI95 upper<=0"),entropy:z.literal("paired CI95 lower(candidate-.8baseline)>=0")}).strict(),
  promotion:z.string(),limits:z.array(z.string()).max(10),
  effect_gate:z.string(),amendment_before_search:z.object({reason:z.string(),status:z.string(),previous_implementation:z.literal("311e9f7")}).strict(),
}).strict().superRefine((p,ctx)=>{
  const all=[...p.fit.seedIndices,...p.fit.pointValidationIndices,...p.search.seedIndices,...p.validation.seedIndices,...p.holdout.seedIndices];
  const hashes=all.map(i=>hashSeed(`H1-seed:${i}`));
  if(new Set(hashes).size!==all.length)ctx.addIssue({code:"custom",message:"Search cohorts overlap"});
  if(new Set(p.grid.warmPlans).size!==3||new Set(p.grid.priorK).size!==3)ctx.addIssue({code:"custom",message:"Duplicate parameter grid"});
});
export type SearchProtocol=z.infer<typeof searchProtocolSchema>;
export const seedValues=(values:readonly number[])=>values.map(i=>hashSeed(`H1-seed:${i}`));
export const warmConfigId=(c:WarmConfig)=>`w${c.warmPlans}-k${String(c.priorK).replace(".","p")}`;
export function searchGrid(protocol:SearchProtocol) {
  const p=searchProtocolSchema.parse(protocol);
  return p.grid.warmPlans.flatMap(warmPlans=>p.grid.priorK.map(priorK=>({id:warmConfigId({warmPlans,priorK}),params:{warmPlans,priorK}})));
}
export function warmPrediction(model:CompiledReplay,config:WarmConfig,agent:AgentLearning,id:string,s:Scenario,x:readonly number[]) {
  model.assertActor(id);
  if(agent.samples>=config.warmPlans)return null;
  const mean=model.mean(id,s.id,x);if(mean===null)return null;
  const n=agent.linear?.[s.id]?.samples??agent.actions[s.id]?.trials??0;
  return {mean,weight:config.priorK/(n+config.priorK)};
}
export function selectBoundedScenario(agent:AgentLearning,id:string,context:RealContext,place:string,config:WarmConfig|null,model?:CompiledReplay) {
  if(config)warmConfigSchema.parse(config);
  model?.assertActor(id);
  if(!config||!model||agent.samples>=config.warmPlans)return chooseScenario(agent,id,context,place);
  const x=decisionContext(agent,context.weather);
  return chooseScenario(agent,id,context,place,"linucb",s=>warmPrediction(model,config,agent,id,s,x));
}
export type BoundedOptions=Omit<RolloutOptions,"policy"|"profile">&{profile:"ordinary-v1"|"cold-stress-v1";params:WarmConfig|null};
export function runBoundedRollout(options:BoundedOptions,artifact?:ReplayArtifact) {
  const params=options.params?warmConfigSchema.parse(options.params):null;
  if(params?artifact===undefined:artifact!==undefined)throw Error("Bounded candidate requires prior; baseline cannot consume it");
  const prior=artifact?compileReplay(artifact):undefined;
  if(prior&&(prior.scope.kind!=="synthetic-cohort"||prior.profile!==options.profile||prior.scope.trainingSeeds.some(s=>options.seeds.includes(s))))
    throw Error("Bounded search prior source/profile mismatch or seed overlap");
  const decisions=new Map<string,{personal:number;blended:number;weight:number;day:number;changed:boolean}>();
  const stats=new Map<number,{n:number;a:number;b:number;first:number;uses:number;late:number;changes:number}>();
  const raw=runLearningRollout({policy:"linucb",profile:options.profile,agents:options.agents,days:options.days,seeds:[...options.seeds],shiftDay:options.shiftDay},
    (agent,id,context)=>{
      const day=Math.round((Date.parse(context.date)-Date.UTC(2026,9,1))/86_400_000),role=hierarchyRole(id,day,options.shiftDay);
      const s=selectBoundedScenario(agent,id,context,role.place,params,prior),x=decisionContext(agent,context.weather),arm=agent.linear?.[s.id];
      const personal=arm?linearScore(arm,x).mean:agent.actions[s.id]?.meanReward??0,shared=prior&&params?warmPrediction(prior,params,agent,id,s,x):null;
      const changed=!!shared&&availableScenarios(agent,context).length>1&&s.id!==chooseScenario(agent,id,context,role.place).id;
      decisions.set(id,{personal,blended:shared?personal+(shared.mean-personal)*shared.weight:personal,weight:shared?.weight??0,day,changed});return s;
    },{onOutcome:o=>{
      const d=decisions.get(o.actorId)!;decisions.delete(o.actorId);const seed=Number(o.actorId.split(":")[1]);
      const m=stats.get(seed)??{n:0,a:0,b:0,first:0,uses:0,late:0,changes:0};m.n++;m.a+=(o.reward-d.personal)**2;m.b+=(o.reward-d.blended)**2;if(d.changed)m.changes++;
      if(d.day===0)m.first+=o.reward;if(d.weight>0){m.uses++;if(params&&o.sampleBefore>=params.warmPlans)m.late++;}stats.set(seed,m);
    }});
  const runs=options.seeds.map(seed=>{const m=stats.get(seed)!;return {seed,personalMSE:m.a/m.n,blendedMSE:m.b/m.n,
    firstDayReturn:m.first/options.agents,priorPredictions:m.uses,priorPredictionsAfterCutoff:m.late,voluntaryChoiceChanges:m.changes};});
  return {kind:"bounded-parameter-rollout-v1",config:{...options,params,seeds:[...options.seeds]},raw,runs,
    sameDecisionMSEDelta:summarize(runs.map(r=>r.blendedMSE-r.personalMSE)),productionAccess:false,activatesRuntimePolicy:false};
}
export function compareBoundedRollouts(a:ReturnType<typeof runBoundedRollout>,b:ReturnType<typeof runBoundedRollout>) {
  for(const r of [a,b])if(r.runs.length!==r.config.seeds.length||r.runs.some((v,i)=>v.seed!==r.config.seeds[i])||
    r.raw.config.policy!=="linucb"||r.raw.config.profile!==r.config.profile||r.raw.config.agents!==r.config.agents||r.raw.config.days!==r.config.days||r.raw.config.shiftDay!==r.config.shiftDay||JSON.stringify(r.raw.config.seeds)!==JSON.stringify(r.config.seeds))throw Error("Misaligned bounded results");
  const comparison=compareLearningRollouts(a.raw,b.raw),baseReturn=a.raw.summary.returnPerAgentDay!.mean;
  return {...comparison,baseline:"personal-v1",candidate:b.config.params?warmConfigId(b.config.params):"personal-v1",
    relativeReturnDelta:comparison.differences.returnPerAgentDay.mean/Math.max(1e-9,Math.abs(baseReturn)),
    meanEntropyRatio:b.raw.summary.actionEntropy!.mean/Math.max(1e-9,a.raw.summary.actionEntropy!.mean),
    voluntaryChoiceChanges:b.runs.reduce((n,r)=>n+r.voluntaryChoiceChanges,0),
    firstDayReturnDelta:summarize(b.runs.map((r,i)=>r.firstDayReturn-a.runs[i].firstDayReturn))};
}
export type CandidateScore={id:string;params:WarmConfig;profiles:{profile:string;comparison:ReturnType<typeof compareBoundedRollouts>}[]};
function validScore(candidate:CandidateScore) {
  const params=warmConfigSchema.parse(candidate.params);
  if(candidate.id!==warmConfigId(params)||candidate.profiles.length!==2||
    new Set(candidate.profiles.map(p=>p.profile)).size!==2||
    !candidate.profiles.every(p=>["ordinary-v1","cold-stress-v1"].includes(p.profile)&&Number.isFinite(p.comparison.relativeReturnDelta)&&Number.isFinite(p.comparison.meanEntropyRatio)&&Number.isSafeInteger(p.comparison.voluntaryChoiceChanges)&&p.comparison.voluntaryChoiceChanges>=0))throw Error("Invalid bounded candidate score");
  return candidate;
}
function ranked(candidates:CandidateScore[]) {
  const score=(c:CandidateScore)=>[Math.min(...c.profiles.map(p=>p.comparison.relativeReturnDelta)),c.profiles.reduce((n,p)=>n+p.comparison.relativeReturnDelta,0)/2];
  return candidates.map(validScore).sort((a,b)=>score(b)[0]-score(a)[0]||score(b)[1]-score(a)[1]||(a.id<b.id?-1:a.id>b.id?1:0));
}
export function shortlistCandidates(candidates:CandidateScore[],limit=2) {
  if(!Number.isInteger(limit)||limit<1||limit>2||candidates.length>9||new Set(candidates.map(c=>c.id)).size!==candidates.length)throw Error("Search budget or candidate uniqueness violated");
  const windows=new Set<number>(),chosen:CandidateScore[]=[];
  for(const c of ranked(candidates))if(c.profiles.every(p=>p.comparison.meanEntropyRatio>=.8&&p.comparison.voluntaryChoiceChanges>0)&&!windows.has(c.params.warmPlans)) {
    windows.add(c.params.warmPlans);chosen.push(c);if(chosen.length===limit)break;
  }
  return chosen;
}
export function performancePass(c:CandidateScore) {
  validScore(c);
  return c.profiles.every(({comparison:p})=>p.voluntaryChoiceChanges>0&&p.gates.fullProfile&&p.gates.returnNonDecrease&&p.gates.needsNonDecrease&&p.gates.regretNonIncrease&&p.gates.entropyFloor);
}
export function selectValidationCandidate(candidates:CandidateScore[],shortlist:readonly string[]) {
  if(shortlist.length>2||new Set(shortlist).size!==shortlist.length||candidates.length!==shortlist.length||
    new Set(candidates.map(c=>c.id)).size!==candidates.length||candidates.some(c=>!shortlist.includes(c.id)))throw Error("Validation cannot add candidates beyond frozen shortlist");
  return ranked(candidates.filter(performancePass))[0]??null;
}
