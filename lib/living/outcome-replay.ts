/** Offline replay only. Counts here are fitted source records, never earned
 * runtime trials. This module has no DB, network, history writer or importer. */
import {z} from "zod";
import {auditExperience} from "./experience-audit.ts";
import {rewardEvidenceSchema,REWARD_VERSION,FEATURE_VERSION,createRewardEvidence,matchedPlanEvidence} from "./reward-evidence.ts";
import {OUTCOME_SCENARIO_SIGNATURE,scenarios,chooseScenario,type AgentLearning,type Experience} from "./learning.ts";
import {fitLinear,decisionContext,type LinearArm} from "./linucb.ts";
import type {RolloutOutcome} from "./sim-harness.ts";
import type {RealContext} from "./schema.ts";

export const REPLAY_VERSION="audited-outcome-replay-v1" as const;
export const REPLAY_LIMIT=100_000,WARM_PLANS=24,REPLAY_K=5;
export type ReplayScope={kind:"actor";actorId:string}|{kind:"synthetic-cohort";trainingSeeds:number[];agents:number;days:number;shiftDay:number|null};
export type ReplayExample={id:string;actorId:string;scenarioId:string;context:readonly number[];reward:number;
  sample:number;startedSimMs:number;settledSimMs:number;canonical:string};
const cmp=(a:string,b:string)=>a<b?-1:a>b?1:0;
export function replayLevel(x:readonly number[]) {return x[1]<.2||x[2]>.72?0:x[5]<.2?1:2;}
const chronological=(a:ReplayExample,b:ReplayExample)=>a.settledSimMs-b.settledSimMs||cmp(a.actorId,b.actorId)||cmp(a.id,b.id);
export class ReplayCorpus {
  private ids=new Map<string,ReplayExample>();
  private samples=new Map<string,string>();
  private strengths=new Map<string,"strong"|"unverified">();
  private counts={input:0,foreign:0,legacy:0,weak:0,duplicates:0,invalid:0,conflicts:0};
  private scope:ReplayScope;
  constructor(scope:ReplayScope) {this.scope=structuredClone(scope);}
  add(value:unknown) {
    if(++this.counts.input>REPLAY_LIMIT)throw Error("Replay source exceeds record budget");
    if(!value||typeof value!=="object"||!("actorId" in value)||typeof value.actorId!=="string") {this.counts.invalid++;return;}
    if(this.scope.kind==="actor"&&value.actorId!==this.scope.actorId){this.counts.foreign++;return;}
    if(this.scope.kind==="synthetic-cohort") {
      const match=/^H1:(\d+):resident:(\d+)$/.exec(value.actorId);
      if(!match||String(Number(match[1]))!==match[1]||!this.scope.trainingSeeds.includes(Number(match[1]))||Number(match[2])>=this.scope.agents||String(Number(match[2]))!==match[2]) {
        this.counts.invalid++;return;
      }
    }
    const audited=auditExperience(value);
    const id="id" in value&&typeof value.id==="string"?value.id:null;
    if(audited.status==="legacy-unverified"||audited.status==="verified-tabular"){
      if(id&&this.strengths.get(id)==="strong"){this.counts.conflicts++;return;}
      if(id)this.strengths.set(id,"unverified");this.counts.legacy++;return;
    }
    if(audited.status!=="verified-contextual"){this.counts.invalid++;return;}
    if(audited.binding!=="fingerprint-v1"){
      if(id&&this.strengths.get(id)==="strong"){this.counts.conflicts++;return;}
      if(id)this.strengths.set(id,"unverified");this.counts.weak++;return;
    }
    if(id&&this.strengths.get(id)==="unverified"){this.counts.conflicts++;return;}
    if(id)this.strengths.set(id,"strong");
    const record=value as Experience,e=rewardEvidenceSchema.parse(record.rewardEvidence);
    const canonical=JSON.stringify({id:record.id,actorId:record.actorId,scenarioId:record.scenarioId,
      at:record.at,reward:record.reward,context:record.context,evidence:e});
    const old=this.ids.get(record.id);
    if(old){this.counts[old.canonical===canonical?"duplicates":"conflicts"]++;return;}
    const sampleKey=JSON.stringify([record.actorId,e.samples.after]);
    if(this.samples.has(sampleKey)){this.counts.conflicts++;return;}
    const row:ReplayExample={id:record.id,actorId:record.actorId,scenarioId:record.scenarioId,context:Object.freeze([...record.context!]),
      reward:record.reward,sample:e.samples.after,startedSimMs:e.plan.startedSimMs,settledSimMs:e.plan.settledSimMs,canonical};
    this.ids.set(record.id,Object.freeze(row));this.samples.set(sampleKey,record.id);
  }
  finish() {
    const examples=[...this.ids.values()].sort(chronological),actors=new Set(examples.map(e=>e.actorId));
    const last=new Map<string,ReplayExample>();let temporalConflicts=0;
    for(const e of [...examples].sort((a,b)=>cmp(a.actorId,b.actorId)||a.sample-b.sample)) {
      const previous=last.get(e.actorId);
      if(previous&&(e.settledSimMs<previous.settledSimMs||e.startedSimMs<previous.startedSimMs))temporalConflicts++;
      last.set(e.actorId,e);
    }
    const stages=[0,0,0];for(const e of examples)stages[replayLevel(e.context)]++;
    return {examples:Object.freeze(examples),report:{...this.counts,conflicts:this.counts.conflicts+temporalConflicts,
      accepted:examples.length,actors:actors.size,stages},scope:structuredClone(this.scope)};
  }
}
export type PreparedReplay=ReturnType<ReplayCorpus["finish"]>;
const count=z.number().int().nonnegative().safe(),sha=z.string().regex(/^[a-f0-9]{64}$/);
const scopeSchema=z.discriminatedUnion("kind",[
  z.object({kind:z.literal("actor"),actorId:z.string().min(1).max(500)}).strict(),
  z.object({kind:z.literal("synthetic-cohort"),trainingSeeds:z.array(count.max(0xffffffff)).min(2).max(100),
    agents:count.positive().max(240),days:count.min(3).max(365),shiftDay:count.positive().nullable()}).strict(),
]);
const index=(r:number,c:number)=>{if(r>c)[r,c]=[c,r];return r*6-r*(r+1)/2+c;};
function positiveMatrix(a:LinearArm) {
  const l=Array.from({length:6},()=>Array(6).fill(0) as number[]);
  for(let r=0;r<6;r++)for(let c=0;c<=r;c++) {
    let v=a.inverse[index(r,c)];if(r===c&&(v<=0||v>1+1e-8))return false;
    for(let k=0;k<c;k++)v-=l[r][k]*l[c][k];
    if(r===c){if(!(v>0))return false;l[r][c]=Math.sqrt(v);}else l[r][c]=v/l[c][c];
  }
  return a.b.every(v=>Math.abs(v)<=a.samples+1e-8);
}
export const replayArtifactSchema=z.object({version:z.literal(REPLAY_VERSION),rewardVersion:z.literal(REWARD_VERSION),
  featureVersion:z.literal(FEATURE_VERSION),scenarioSignature:z.literal(OUTCOME_SCENARIO_SIGNATURE),
  profile:z.enum(["ordinary-v1","cold-stress-v1"]).nullable(),scope:scopeSchema,
  source:z.object({kind:z.enum(["local-owner-jsonl","synthetic-generator"]),sha256:sha,acceptedDigest:sha}).strict(),
  order:z.enum(["chronological","curriculum"]),epochs:z.literal(1),warmPlans:z.literal(24),priorK:z.literal(5),
  report:z.object({input:count.max(REPLAY_LIMIT),foreign:count,legacy:count,weak:count,duplicates:count,invalid:z.literal(0),conflicts:z.literal(0),
    accepted:count.positive().max(REPLAY_LIMIT),actors:count.positive(),stages:z.array(count).length(3)}).strict(),
  rows:z.array(z.object({scenarioId:z.string().refine(id=>scenarios.some(s=>s.id===id)),replayedRecords:count.positive(),
    model:z.object({version:z.literal(1),samples:count.positive(),inverse:z.array(z.number().finite()).length(21),b:z.array(z.number().finite()).length(6)}).strict()}).strict()).min(1).max(100),
}).strict().superRefine((p,ctx)=>{
  const bad=(message:string)=>ctx.addIssue({code:"custom",message});
  if(new Set(p.rows.map(r=>r.scenarioId)).size!==p.rows.length)bad("Duplicate replay arm");
  if(p.report.input!==p.report.accepted+p.report.foreign+p.report.legacy+p.report.weak+p.report.duplicates)bad("Replay input counts mismatch");
  if(p.rows.reduce((n,r)=>n+r.replayedRecords,0)!==p.report.accepted||p.report.stages.reduce((a,b)=>a+b,0)!==p.report.accepted||p.report.actors>p.report.accepted)bad("Replay counts mismatch");
  for(const r of p.rows)if(r.model.samples!==r.replayedRecords||!positiveMatrix(r.model))bad("Invalid replay model");
  if(p.scope.kind==="actor") {
    if(p.source.kind!=="local-owner-jsonl"||p.profile!==null||p.report.actors!==1)bad("Invalid local actor provenance");
  } else if(p.source.kind!=="synthetic-generator"||p.profile===null||
    new Set(p.scope.trainingSeeds).size!==p.scope.trainingSeeds.length||p.scope.shiftDay!==null&&p.scope.shiftDay>=p.scope.days||
    p.report.actors>p.scope.agents*p.scope.trainingSeeds.length||p.report.accepted>p.scope.agents*p.scope.days*24*p.scope.trainingSeeds.length)bad("Invalid synthetic provenance");
});
export type ReplayArtifact=z.infer<typeof replayArtifactSchema>;
export function fitReplay(corpus:PreparedReplay,order:ReplayArtifact["order"],source:ReplayArtifact["source"],profile:ReplayArtifact["profile"]):ReplayArtifact {
  if(corpus.report.invalid||corpus.report.conflicts)throw Error("Replay source has invalid/conflicting records; source preserved");
  if(!corpus.examples.length)throw Error("No compatible replay records; source preserved");
  const ordered=order==="curriculum"?[...corpus.examples].sort((a,b)=>replayLevel(a.context)-replayLevel(b.context)||chronological(a,b)):corpus.examples;
  const rows=new Map<string,LinearArm>();
  for(const e of ordered)rows.set(e.scenarioId,fitLinear(rows.get(e.scenarioId),e.context,e.reward));
  return replayArtifactSchema.parse({version:REPLAY_VERSION,rewardVersion:REWARD_VERSION,featureVersion:FEATURE_VERSION,
    scenarioSignature:OUTCOME_SCENARIO_SIGNATURE,scope:corpus.scope,source,profile,order,epochs:1,warmPlans:WARM_PLANS,priorK:REPLAY_K,
    report:corpus.report,rows:[...rows].sort(([a],[b])=>cmp(a,b)).map(([scenarioId,model])=>({scenarioId,replayedRecords:model.samples,model}))});
}
export function compileReplay(value:ReplayArtifact) {
  const p=replayArtifactSchema.parse(value),models=new Map(p.rows.map(row=>{
    const theta=Object.freeze(Array.from({length:6},(_,r)=>row.model.b.reduce((n,b,c)=>n+row.model.inverse[index(r,c)]*b,0)));
    return [row.scenarioId,theta] as const;
  }));
  const scope=structuredClone(p.scope);if(scope.kind==="synthetic-cohort")Object.freeze(scope.trainingSeeds);Object.freeze(scope);
  const assertActor=(actorId:string)=>{
    if(scope.kind==="actor"?actorId!==scope.actorId:!/^H1:\d+:resident:\d+$/.test(actorId))throw Error("Replay model belongs to a different actor/source scope");
  };
  const mean=(actorId:string,scenarioId:string,x:readonly number[])=>{
    assertActor(actorId);
    if(x.length!==6||x[0]!==1||x.some(n=>!Number.isFinite(n)||n<0||n>1))throw Error("Invalid replay context");
    const theta=models.get(scenarioId);return theta?Math.max(-1,Math.min(1,theta.reduce((n,v,i)=>n+v*x[i],0))):null;
  };
  return {mean,assertActor,scope,profile:p.profile};
}
export type CompiledReplay=ReturnType<typeof compileReplay>;
export function replayPrediction(model:CompiledReplay,agent:AgentLearning,id:string,scenarioId:string,x:readonly number[]) {
  model.assertActor(id);
  if(agent.samples>=WARM_PLANS)return null;
  const mean=model.mean(id,scenarioId,x);if(mean===null)return null;
  return {mean,weight:REPLAY_K/((agent.linear?.[scenarioId]?.samples??agent.actions[scenarioId]?.trials??0)+REPLAY_K)};
}
export function selectReplayScenario(agent:AgentLearning,id:string,context:RealContext,rolePlace:string,model?:CompiledReplay) {
  model?.assertActor(id);
  if(!model||agent.samples>=WARM_PLANS)return chooseScenario(agent,id,context,rolePlace);
  const x=decisionContext(agent,context.weather);
  return chooseScenario(agent,id,context,rolePlace,"linucb",s=>replayPrediction(model,agent,id,s.id,x));
}
/** Synthetic source only. The caller's rollout has already settled this plan. */
export function replayExperience(outcome:RolloutOutcome):Experience {
  return {id:outcome.id,actorId:outcome.actorId,scenarioId:outcome.scenarioId,at:outcome.at,reward:outcome.reward,
    source:"simulation",model:"disjoint-linucb-v1",context:[...outcome.context],
    rewardEvidence:createRewardEvidence({scenarioSignature:OUTCOME_SCENARIO_SIGNATURE,
      identity:{experienceId:outcome.id,actorId:outcome.actorId,scenarioId:outcome.scenarioId},
      plan:{binding:"fingerprint-v1",declaredKey:outcome.declaredPlanKey,...matchedPlanEvidence(outcome.plan),
        startedSimMs:outcome.startedSimMs,durationMs:outcome.durationMs,settledSimMs:outcome.settledSimMs},
      samples:{before:outcome.sampleBefore,after:outcome.sampleAfter},before:outcome.before,after:outcome.after,decisionContext:[...outcome.context]})};
}
