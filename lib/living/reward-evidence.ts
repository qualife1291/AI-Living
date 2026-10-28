/** Existing simulation reward semantics. Evidence describes server settlement,
 * not physical arrival, a peer encounter, or an authenticated external receipt. */
import { z } from "zod";
import { validDecisionContext } from "./linucb.ts";

export const REWARD_VERSION = "scenario-outcome-v1" as const;
export const FEATURE_VERSION = "needs-6d-v1" as const;
export type RewardState = {
  energy: number; hunger: number; health: number; skill: number;
  employment: "employed" | "seeking" | "studying"; citations?: number;
};
export function rewardState(state: RewardState): RewardState {
  return {energy:state.energy,hunger:state.hunger,health:state.health,skill:state.skill,
    employment:state.employment,...(state.citations!==undefined?{citations:state.citations}:{})};
}

/** Preserve the original operation order and clipping, including saturation. */
export function scenarioReward(before: RewardState, after: RewardState) {
  const components = {
    skill: (after.skill-before.skill)*.16,
    energy: (after.energy-before.energy)*(.008+(100-before.energy)/100*.018),
    hunger: (before.hunger-after.hunger)*(.005+before.hunger/100*.02),
    health: (after.health-before.health)*(.015+(100-before.health)/100*.04),
  };
  const unclipped=components.skill+components.energy+components.hunger+components.health;
  return {components,unclipped,total:Math.max(-1,Math.min(1,unclipped))};
}

const finite=z.number().finite(),unit=finite.min(0).max(100);
const identifier=z.string().min(1).max(500);
const fingerprint=z.string().regex(/^plan-v1:[0-9a-f]{16}$/);
const stateSchema=z.object({energy:unit,hunger:unit,health:unit,skill:unit,
  employment:z.enum(["employed","seeking","studying"]),citations:z.number().int().nonnegative().safe().optional()}).strict();
export const rewardEvidenceSchema=z.object({
  version:z.literal(1),rewardVersion:z.literal(REWARD_VERSION),
  authority:z.literal("simulation-plan-time-v1"),
  scenarioSignature:z.number().int().min(0).max(0xffffffff),
  identity:z.object({experienceId:identifier,actorId:identifier,scenarioId:identifier}).strict(),
  plan:z.object({binding:z.enum(["fingerprint-v1","legacy-start-time"]),
    declaredKey:fingerprint.nullable(),matchedKey:fingerprint,
    startedSimMs:finite.nonnegative(),durationMs:finite.positive(),settledSimMs:finite.nonnegative()}).strict(),
  samples:z.object({before:z.number().int().nonnegative().safe(),after:z.number().int().nonnegative().safe()}).strict(),
  featureVersion:z.literal(FEATURE_VERSION).nullable(),
  decisionContext:z.array(finite).refine(validDecisionContext).nullable(),
  before:stateSchema,after:stateSchema,
  components:z.object({skill:finite,energy:finite,hunger:finite,health:finite}).strict(),
  unclipped:finite,total:finite.min(-1).max(1),
}).strict();
export type RewardEvidence=z.infer<typeof rewardEvidenceSchema>;

/** Caller owns matching-plan and elapsed-time checks. Persist together with the
 * original Experience ID and policy/world CAS; never accept this from a model. */
export function createRewardEvidence(input: Omit<RewardEvidence,
  "version"|"rewardVersion"|"authority"|"components"|"unclipped"|"total"|"featureVersion">): RewardEvidence {
  return rewardEvidenceSchema.parse({...input,version:1,rewardVersion:REWARD_VERSION,
    authority:"simulation-plan-time-v1",featureVersion:input.decisionContext?FEATURE_VERSION:null,
    ...scenarioReward(input.before,input.after)});
}
