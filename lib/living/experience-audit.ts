/** Offline consistency audit, not authorization to import/train external data. */
import { z } from "zod";
import { applyScenarioOutcome, scenarios, OUTCOME_SCENARIO_SIGNATURE } from "./learning.ts";
import { validDecisionContext } from "./linucb.ts";
import { rewardEvidenceSchema, scenarioReward, type RewardState } from "./reward-evidence.ts";
import { SKILL_DOMAINS } from "./skills.ts";

const recordSchema=z.object({id:z.string().min(1),actorId:z.string().min(1),scenarioId:z.string().min(1),
  at:z.string().datetime({offset:true}),reward:z.number().finite().min(-1).max(1),source:z.literal("simulation"),
  model:z.enum(["contextual-bandit-v1","disjoint-linucb-v1"]),
  context:z.array(z.number()).optional(),rewardEvidence:z.unknown().optional(),
  skillGain:z.object({domain:z.enum(SKILL_DOMAINS),before:z.number().min(0).max(100),
    after:z.number().min(0).max(100),amount:z.number().positive().max(3)}).strict().optional(),
});
const close=(a:number,b:number)=>Math.abs(a-b)<=1e-12;
const equalState=(a:RewardState,b:RewardState)=>
  (["energy","hunger","health","skill"] as const).every(k=>close(a[k],b[k]))&&
  a.employment===b.employment&&a.citations===b.citations;
export type AuditStatus="verified-contextual"|"verified-tabular"|"legacy-unverified"|"rejected";
export function auditExperience(value:unknown):{status:AuditStatus;reason:string;binding?:string} {
  const parsed=recordSchema.safeParse(value);
  if(!parsed.success)return {status:"rejected",reason:"invalid-record"};
  const record=parsed.data;
  if(record.rewardEvidence===undefined)return {status:"legacy-unverified",reason:"missing-evidence"};
  const evidence=rewardEvidenceSchema.safeParse(record.rewardEvidence);
  if(!evidence.success)return {status:"rejected",reason:"invalid-evidence"};
  const e=evidence.data,reject=(reason:string)=>({status:"rejected" as const,reason});
  if(e.identity.experienceId!==record.id||e.identity.actorId!==record.actorId||e.identity.scenarioId!==record.scenarioId)
    return reject("identity-mismatch");
  if(e.scenarioSignature!==OUTCOME_SCENARIO_SIGNATURE)return reject("scenario-version-mismatch");
  const scenario=scenarios.find(s=>s.id===record.scenarioId);
  if(!scenario)return reject("unknown-scenario");
  if(e.plan.binding==="fingerprint-v1"?(e.plan.declaredKey===null||e.plan.declaredKey!==e.plan.matchedKey):e.plan.declaredKey!==null)
    return reject("plan-binding-mismatch");
  if(e.plan.settledSimMs-e.plan.startedSimMs<e.plan.durationMs)return reject("early-settlement");
  if(e.samples.after!==e.samples.before+1)return reject("sample-sequence-mismatch");
  const contextual=record.context!==undefined;
  if(contextual?(!validDecisionContext(record.context)||e.featureVersion===null||e.decisionContext===null||
    !record.context!.every((n,i)=>n===e.decisionContext![i])||record.model!=="disjoint-linucb-v1"):
    (e.featureVersion!==null||e.decisionContext!==null||record.model!=="contextual-bandit-v1"))
    return reject("decision-context-mismatch");
  const expected=applyScenarioOutcome(e.before,scenario);
  if(!equalState(expected.after,e.after))return reject("outcome-mismatch");
  const reward=scenarioReward(e.before,e.after);
  if(!(["skill","energy","hunger","health"] as const).every(k=>close(reward.components[k],e.components[k]))||
    !close(reward.unclipped,e.unclipped)||!close(reward.total,e.total)||!close(e.total,record.reward))
    return reject("reward-mismatch");
  const gain=record.skillGain;
  if(gain&&(gain.domain!==scenario.skillDomain||!close(gain.after,Math.min(100,gain.before+scenario.skill))||
    !close(gain.amount,gain.after-gain.before)))return reject("domain-gain-mismatch");
  return {status:contextual?"verified-contextual":"verified-tabular",reason:"consistent-simulation-evidence",binding:e.plan.binding};
}

/** Summaries contain no actor IDs, memory, dialogue or raw records. */
export function auditExperiences(records:readonly unknown[]) {
  const counts:Record<AuditStatus,number>={"verified-contextual":0,"verified-tabular":0,"legacy-unverified":0,rejected:0};
  const reasons:Record<string,number>={},bindings:Record<string,number>={};
  const ids=new Set<string>();
  for(const record of records) {
    let result=auditExperience(record);
    if(record&&typeof record==="object"&&"id" in record&&typeof record.id==="string") {
      if(ids.has(record.id))result={status:"rejected",reason:"duplicate-experience-id"};
      ids.add(record.id);
    }
    counts[result.status]++;reasons[result.reason]=(reasons[result.reason]??0)+1;
    if(result.binding)bindings[result.binding]=(bindings[result.binding]??0)+1;
  }
  return {kind:"simulation-reward-audit-v1",records:records.length,counts,reasons,bindings,
    writesProduction:false,trainsPolicy:false,
    scope:"Self-consistency of server simulation records, not external authenticity, physical arrival or witnessed social effects. Legacy evidence is not backfilled."};
}
