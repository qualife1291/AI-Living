/** Experimental, pure policy/observer. Not installed in the production planner. */
import { z } from "zod";
import { hashSeed } from "../clock.ts";
import { PLACES } from "../event-schema.ts";
import { availableScenarios, expectedReward, scenarios, type AgentLearning, type Scenario } from "./learning.ts";
import { validDecisionContext } from "./linucb.ts";
import type { RealContext } from "./schema.ts";

export const RESIDUAL_VERSION = "decision-residual-v1" as const;
export const SCENARIO_SIGNATURE = hashSeed(JSON.stringify(scenarios));
export type ExperimentalPolicy = "model-prior-v1" | "residual-ema-v1" | "residual-warm-v1";
export type ResidualArm = {
  version: 1; n: number; mean: number; variance: number; history: number[];
};
export type ResidualState = { actorId: string; lastSample: number; actions: Record<string, ResidualArm> };
export type DecisionReceipt = {
  version: typeof RESIDUAL_VERSION; actorId: string; id: string; scenarioId: string;
  sampleBefore: number; expected: number; context: number[]; rolePlace: string;
};
export const priorSchema = z.object({
  version: z.literal(1), source: z.literal("synthetic-H2-training"),
  expectedVersion: z.literal("scenario-outcome-v1"), scenarioSignature: z.literal(SCENARIO_SIGNATURE),
  profile: z.enum(["ordinary-v1", "cold-stress-v1"]),
  trainingSeeds: z.array(z.number().int().min(0).max(0xffffffff)).min(1).max(100),
  rows: z.array(z.object({rolePlace:z.enum(PLACES),scenarioId:z.string().refine(id=>scenarios.some(s=>s.id===id)),
    mean:z.number().finite().min(-2).max(2),support:z.number().int().positive()}).strict()).max(5000),
}).strict().superRefine((p,ctx)=>{
  if(new Set(p.trainingSeeds).size!==p.trainingSeeds.length)ctx.addIssue({code:"custom",message:"Duplicate training seed"});
  const keys=p.rows.map(r=>`${r.rolePlace}:${r.scenarioId}`);
  if(new Set(keys).size!==keys.length)ctx.addIssue({code:"custom",message:"Duplicate prior row"});
});
export type ResidualPrior = z.infer<typeof priorSchema>;
export type PriorIndex = ReadonlyMap<string, number>;
export const priorKey = (rolePlace: string, scenarioId: string) => `${rolePlace}:${scenarioId}`;
export function indexPrior(value: ResidualPrior): PriorIndex {
  const p=priorSchema.parse(value);
  return new Map(p.rows.map(r=>[priorKey(r.rolePlace,r.scenarioId),r.mean]));
}
export function newResidualState(actorId: string): ResidualState { return {actorId,lastSample:0,actions:{}}; }

function validArm(a: ResidualArm) {
  return a.version===1&&Number.isSafeInteger(a.n)&&a.n>0&&a.n<Number.MAX_SAFE_INTEGER&&
    Number.isFinite(a.mean)&&Math.abs(a.mean)<=2&&Number.isFinite(a.variance)&&a.variance>=0&&
    a.variance<=4.00000001&&Array.isArray(a.history)&&a.history.length>0&&a.history.length<=20&&
    a.history.every(n=>Number.isFinite(n)&&Math.abs(n)<=2);
}
export function fitResidualArm(old: ResidualArm | undefined, residual: number): ResidualArm {
  if(!Number.isFinite(residual)||Math.abs(residual)>2||old&&!validArm(old))throw Error("Invalid residual; original model preserved");
  const n=(old?.n??0)+1,alpha=Math.max(1/n,.08),previous=old?.mean??0;
  const difference=residual-previous,mean=previous+alpha*difference;
  const variance=(1-alpha)*((old?.variance??0)+alpha*difference*difference);
  return {version:1,n,mean,variance,history:[...(old?.history??[]),mean].slice(-20)};
}
export function residualBonus(arm?: ResidualArm) {
  if(arm&&!validArm(arm))throw Error("Invalid residual model");
  const n=arm?.n??0,progress=arm?Math.abs(arm.mean-arm.history[0])/2:0;
  const uncertainty=Math.sqrt(arm?.variance??1)/2;
  return .3*(progress+uncertainty)*Math.exp(-n/50);
}
export function residualPrediction(state: ResidualState, scenarioId: string, rolePlace: string,
  policy: ExperimentalPolicy, priors?: PriorIndex) {
  if(policy==="model-prior-v1")return 0;
  const arm=Object.hasOwn(state.actions,scenarioId)?state.actions[scenarioId]:undefined;
  if(arm&&!validArm(arm))throw Error("Invalid residual model");
  const n=arm?.n??0,prior=policy==="residual-warm-v1"?priors?.get(priorKey(rolePlace,scenarioId))??0:0;
  return ((arm?.mean??0)*n+prior*5)/(n+5);
}

/** Only the matching, newly completed raw sample can train the residual observer.
 * The monotonic sample checkpoint rejects replay and out-of-order observations;
 * a caller still needs durable CAS/receipts before using this in a shared runtime.
 */
export function observeResidual(state: ResidualState, receipt: DecisionReceipt, agent: AgentLearning, planMatches: boolean) {
  if(!Number.isSafeInteger(state.lastSample)||state.lastSample<0)throw Error("Invalid residual checkpoint");
  const pending=agent.pending;
  if(!planMatches||receipt.actorId!==state.actorId||receipt.version!==RESIDUAL_VERSION||!pending?.completed||
    !scenarios.some(s=>s.id===receipt.scenarioId)||
    pending.id!==receipt.id||pending.scenarioId!==receipt.scenarioId||
    !Number.isSafeInteger(receipt.sampleBefore)||receipt.sampleBefore<0||agent.samples!==receipt.sampleBefore+1||
    !Number.isFinite(receipt.expected)||Math.abs(receipt.expected)>1||
    !Number.isFinite(agent.lastReward)||Math.abs(agent.lastReward!)>1||
    !validDecisionContext(receipt.context)||!validDecisionContext(pending.context)||
    !receipt.context.every((v,i)=>v===pending.context![i])||agent.samples<=state.lastSample)
    return {state,learned:false,residual:null};
  const residual=agent.lastReward!-receipt.expected;
  const old=Object.hasOwn(state.actions,receipt.scenarioId)?state.actions[receipt.scenarioId]:undefined;
  const next={actorId:state.actorId,lastSample:agent.samples,actions:{...state.actions,[receipt.scenarioId]:fitResidualArm(old,residual)}};
  return {state:next,learned:true,residual};
}

/** Prior confidence is separate from earned n/trials and never grants skills. */
export function selectResidualScenario(
  agent: AgentLearning, id: string, context: RealContext, rolePlace: string,
  policy: ExperimentalPolicy, state: ResidualState, priors?: PriorIndex,
  voluntaryCounts: readonly number[] = [],
): Scenario {
  if(state.actorId!==id)throw Error("Residual state belongs to another actor");
  const candidates=availableScenarios(agent,context);
  if(candidates.length===1)return candidates[0]; // Emergency rules outrank caps/priors.
  const total=voluntaryCounts.reduce((n,v)=>n+v,0),cap=Math.max(1,Math.ceil((total+1)*.35));
  const underCap=candidates.filter(s=>(voluntaryCounts[scenarios.indexOf(s)]??0)<cap);
  const eligible=underCap.length?underCap:candidates;
  let selected=eligible[0],best=-Infinity;
  for(const s of eligible) {
    const arm=Object.hasOwn(state.actions,s.id)?state.actions[s.id]:undefined;
    if(arm&&!validArm(arm))throw Error("Invalid residual model");
    const correction=residualPrediction(state,s.id,rolePlace,policy,priors);
    const exploration=policy==="model-prior-v1"?0:residualBonus(arm);
    const recent=agent.recentActions??[],repetitions=recent.filter(id=>id===s.id).length;
    const novelty=-repetitions*.12-(recent.at(-1)===s.id ? .18 : 0);
    const satiety=s.kind==="eat"&&agent.hunger<35?-.3:0;
    const rest=s.id==="rest-home"&&agent.energy>=65?-.35:0;
    const evening=context.hour>=18?(s.kind==="work" ? -.25 : ["social","play"].includes(s.kind) ? .12 : 0):0;
    const taste=(hashSeed(`${id}:${s.tag}`)%101-50)/500;
    const tie=(hashSeed(`${id}-${context.date}-${Math.floor(context.hour*4)}-${s.id}`)%1000)/5000;
    const score=expectedReward(agent,s)+correction+exploration+(s.place===rolePlace ? .3 : 0)+novelty+satiety+rest+evening+taste+tie;
    if(score>best){best=score;selected=s;}
  }
  return selected;
}
