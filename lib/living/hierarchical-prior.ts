/** Experimental numeric shared priors; no DB, memories, runtime writer or I/O. */
import {z} from "zod";
import catalogData from "../../data/living/catalog.json" with {type:"json"};
import {hashSeed} from "../clock.ts";
import {catalogSchema} from "./schema.ts";
import {chooseScenario,scenarios,OUTCOME_SCENARIO_SIGNATURE,type Experience,type AgentLearning} from "./learning.ts";
import {fitLinear,linearScore,validDecisionContext,decisionContext,type LinearArm} from "./linucb.ts";
import {auditExperience} from "./experience-audit.ts";
import {createRewardEvidence,matchedPlanEvidence,REWARD_VERSION,FEATURE_VERSION} from "./reward-evidence.ts";
import type {RolloutOutcome} from "./sim-harness.ts";
import type {RealContext} from "./schema.ts";

export const HIERARCHY_VERSION="hierarchical-linucb-v1" as const;
export const HIERARCHY_K=5;
export const HIERARCHY_CATALOG=catalogSchema.parse(catalogData);
export const CATALOG_SIGNATURE=hashSeed(JSON.stringify(HIERARCHY_CATALOG));
const kinds=[...new Set(HIERARCHY_CATALOG.roles.map(r=>r.kind))];
const knownScenario=(id:string)=>scenarios.some(s=>s.id===id);
const uint=z.number().int().min(0).max(0xffffffff),count=z.number().int().nonnegative().safe();
const armSchema=z.object({version:z.literal(1),samples:count.min(5),
  inverse:z.array(z.number().finite()).length(21),b:z.array(z.number().finite()).length(6)}).strict();
const rowSchema=z.object({roleKind:z.string().nullable(),scenarioId:z.string().refine(knownScenario),
  support:count.min(5),donorActors:count.min(2),donorSeeds:count.min(2),model:armSchema}).strict();
const packedIndex=(r:number,c:number)=>{if(r>c)[r,c]=[c,r];return r*6-r*(r+1)/2+c;};
function validPriorMatrix(arm:LinearArm) {
  // Cholesky of the packed symmetric inverse. A checksum alone cannot validate
  // a finite but indefinite covariance or unbounded sufficient statistics.
  const lower=Array.from({length:6},()=>Array(6).fill(0) as number[]);
  for(let i=0;i<6;i++)for(let j=0;j<=i;j++) {
    let v=arm.inverse[packedIndex(i,j)];
    if(i===j&&(v<=0||v>1+1e-8))return false;
    for(let k=0;k<j;k++)v-=lower[i][k]*lower[j][k];
    if(i===j){if(!(v>0))return false;lower[i][j]=Math.sqrt(v);}
    else lower[i][j]=v/lower[j][j];
  }
  return arm.b.every(v=>Math.abs(v)<=arm.samples+1e-8);
}
export const hierarchyPriorSchema=z.object({
  version:z.literal(HIERARCHY_VERSION),source:z.literal("synthetic-H4-training"),
  rewardVersion:z.literal(REWARD_VERSION),featureVersion:z.literal(FEATURE_VERSION),
  scenarioSignature:z.literal(OUTCOME_SCENARIO_SIGNATURE),catalogSignature:z.literal(CATALOG_SIGNATURE),
  grouping:z.literal("catalog-role-kind-v1"),profile:z.enum(["ordinary-v1","cold-stress-v1"]),
  trainingSeeds:z.array(uint).min(2).max(100),agents:count.min(2).max(240),days:count.min(3).max(365),
  shiftDay:count.positive().nullable(),
  acceptedOutcomes:count,rows:z.array(rowSchema).max(1000),
}).strict().superRefine((p,ctx)=>{
  const bad=(message:string)=>ctx.addIssue({code:"custom",message});
  if(new Set(p.trainingSeeds).size!==p.trainingSeeds.length)bad("Duplicate training seed");
  if(p.acceptedOutcomes>p.agents*p.days*24*p.trainingSeeds.length)bad("Outcome count exceeds synthetic budget");
  if(p.shiftDay!==null&&p.shiftDay>=p.days)bad("Invalid training shift day");
  const keys=new Set<string>(),global=new Map<string,number>(),roles=new Map<string,number>();
  for(const row of p.rows) {
    const key=JSON.stringify([row.roleKind,row.scenarioId]);
    if(keys.has(key))bad("Duplicate hierarchy row");keys.add(key);
    if(row.roleKind!==null&&!kinds.includes(row.roleKind as typeof kinds[number]))bad("Unknown role kind");
    if(row.support!==row.model.samples||row.support<row.donorActors||row.donorActors<row.donorSeeds||
      row.donorActors>p.agents*p.trainingSeeds.length||row.donorSeeds>p.trainingSeeds.length||
      row.support>p.acceptedOutcomes||!validPriorMatrix(row.model))bad("Invalid prior support/matrix");
    if(row.roleKind===null)global.set(row.scenarioId,row.support);
    else roles.set(row.scenarioId,(roles.get(row.scenarioId)??0)+row.support);
  }
  if([...global.values()].reduce((a,b)=>a+b,0)>p.acceptedOutcomes)bad("Global support exceeds unique outcomes");
  for(const [id,n] of roles)if(n>(global.get(id)??0))bad("Role support exceeds global support");
});
export type HierarchyPrior=z.infer<typeof hierarchyPriorSchema>;
export type HierarchyVariant="personal-v1"|"global-prior-v1"|"role-prior-v1";
export function hierarchyRole(actorId:string,day:number,shiftDay:number|null) {
  const index=(hashSeed(actorId)+(shiftDay!==null&&day>=shiftDay?1:0))%HIERARCHY_CATALOG.roles.length;
  return HIERARCHY_CATALOG.roles[index];
}
const key=(kind:string|null,id:string)=>JSON.stringify([kind,id]);

/** Isolated synthetic generator receiver. Consistency checks are not external
 * authentication; no CLI accepts private/archive JSONL as training input. */
export class HierarchyTrainer {
  private seen=new Set<string>();
  private checkpoints=new Map<string,number>();
  private rows=new Map<string,{roleKind:string|null;scenarioId:string;model:LinearArm;actors:Set<string>;seeds:Set<number>}>();
  private accepted=0;
  private manifest:Omit<HierarchyPrior,"rows"|"acceptedOutcomes">;
  constructor(profile:HierarchyPrior["profile"],seeds:number[],agents:number,days:number,shiftDay:number|null=Math.floor(days/2)) {
    this.manifest=hierarchyPriorSchema.parse({version:HIERARCHY_VERSION,source:"synthetic-H4-training",
      rewardVersion:REWARD_VERSION,featureVersion:FEATURE_VERSION,scenarioSignature:OUTCOME_SCENARIO_SIGNATURE,
      catalogSignature:CATALOG_SIGNATURE,grouping:"catalog-role-kind-v1",profile,trainingSeeds:[...seeds],agents,days,shiftDay,
      acceptedOutcomes:0,rows:[]});
  }
  observe(seed:number,outcome:RolloutOutcome):Experience {
    const prefix=`H1:${seed}:resident:`,suffix=outcome.actorId.slice(prefix.length),index=Number(suffix);
    if(!this.manifest.trainingSeeds.includes(seed)||!outcome.actorId.startsWith(prefix)||
      !/^\d+$/.test(suffix)||!Number.isInteger(index)||String(index)!==suffix||index>=this.manifest.agents)
      throw Error("Synthetic donor ownership mismatch");
    const evidence=createRewardEvidence({scenarioSignature:OUTCOME_SCENARIO_SIGNATURE,
      identity:{experienceId:outcome.id,actorId:outcome.actorId,scenarioId:outcome.scenarioId},
      plan:{binding:"fingerprint-v1",declaredKey:outcome.declaredPlanKey,
        ...matchedPlanEvidence(outcome.plan),startedSimMs:outcome.startedSimMs,durationMs:outcome.durationMs,settledSimMs:outcome.settledSimMs},
      samples:{before:outcome.sampleBefore,after:outcome.sampleAfter},decisionContext:[...outcome.context],
      before:outcome.before,after:outcome.after});
    const record:Experience={id:outcome.id,actorId:outcome.actorId,scenarioId:outcome.scenarioId,at:outcome.at,
      reward:outcome.reward,source:"simulation",model:"disjoint-linucb-v1",context:[...outcome.context],rewardEvidence:evidence};
    if(auditExperience(record).status!=="verified-contextual"||this.seen.has(record.id)||
      outcome.sampleBefore!==(this.checkpoints.get(record.actorId)??0))throw Error("Invalid/duplicate synthetic outcome");
    const day=Math.floor(outcome.startedSimMs/86_400_000);
    if(day<0||day>=this.manifest.days)throw Error("Outcome outside training horizon");
    const kind=hierarchyRole(record.actorId,day,this.manifest.shiftDay).kind;
    this.seen.add(record.id);this.checkpoints.set(record.actorId,outcome.sampleAfter);this.accepted++;
    for(const roleKind of [null,kind]) {
      const k=key(roleKind,record.scenarioId),old=this.rows.get(k);
      const row={roleKind,scenarioId:record.scenarioId,model:fitLinear(old?.model,record.context!,record.reward),
        actors:old?.actors??new Set<string>(),seeds:old?.seeds??new Set<number>()};
      row.actors.add(record.actorId);row.seeds.add(seed);this.rows.set(k,row);
    }
    return record;
  }
  artifact():HierarchyPrior {
    const rows=[...this.rows.values()].filter(r=>r.model.samples>=5&&r.actors.size>=2&&r.seeds.size>=2)
      .map(r=>({roleKind:r.roleKind,scenarioId:r.scenarioId,support:r.model.samples,donorActors:r.actors.size,
        donorSeeds:r.seeds.size,model:structuredClone(r.model)})).sort((a,b)=>key(a.roleKind,a.scenarioId).localeCompare(key(b.roleKind,b.scenarioId)));
    return hierarchyPriorSchema.parse({...this.manifest,acceptedOutcomes:this.accepted,rows});
  }
}

export function compileHierarchy(value:HierarchyPrior) {
  const p=hierarchyPriorSchema.parse(value),rows=new Map(p.rows.map(row=>{
    Object.freeze(row.model.b);Object.freeze(row.model.inverse);Object.freeze(row.model);Object.freeze(row);
    return [key(row.roleKind,row.scenarioId),row] as const;
  }));
  const predict=(scenarioId:string,context:readonly number[],roleKind:string,variant:HierarchyVariant)=>{
    if(!["personal-v1","global-prior-v1","role-prior-v1"].includes(variant))throw Error("Unknown hierarchy variant");
    if(!validDecisionContext(context))throw Error("Invalid hierarchy decision context");
    if(variant==="personal-v1")return null;
    const global=rows.get(key(null,scenarioId));if(!global)return null;
    const globalMean=linearScore(global.model,context,0).mean;
    const role=variant==="role-prior-v1"?rows.get(key(roleKind,scenarioId)):undefined;
    const mix=role?Math.min(.8,role.support/(role.support+20)):0;
    return {mean:role?globalMean+(linearScore(role.model,context,0).mean-globalMean)*mix:globalMean,
      scope:role?"role-kind":"global",effectiveConfidence:HIERARCHY_K};
  };
  return {predict,profile:p.profile,trainingSeeds:Object.freeze([...p.trainingSeeds])};
}
export type CompiledHierarchy=ReturnType<typeof compileHierarchy>;
export function hierarchyPrediction(agent:AgentLearning,scenarioId:string,context:readonly number[],roleKind:string,
  variant:HierarchyVariant,prior?:CompiledHierarchy) {
  const shared=prior?.predict(scenarioId,context,roleKind,variant);if(!shared)return null;
  const personal=agent.linear?.[scenarioId]?.samples??agent.actions[scenarioId]?.trials??0;
  return {...shared,weight:HIERARCHY_K/(personal+HIERARCHY_K)};
}
export function selectHierarchyScenario(agent:AgentLearning,id:string,context:RealContext,role:typeof HIERARCHY_CATALOG.roles[number],
  variant:HierarchyVariant,prior?:CompiledHierarchy) {
  const x=decisionContext(agent,context.weather);
  return chooseScenario(agent,id,context,role.place,"linucb",s=>hierarchyPrediction(agent,s.id,x,role.kind,variant,prior));
}
