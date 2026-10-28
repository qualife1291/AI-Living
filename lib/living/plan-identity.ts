import {hashSeed} from "../clock.ts";
import type {PersonPlan} from "../world";
/** Change detection for a server-created plan, not an authentication/arrival proof. */
export function planKey(plan:PersonPlan|undefined) {
  if(!plan)return undefined;
  const content=JSON.stringify([plan.createdAt,plan.simStartedAt,plan.from,plan.originPath,plan.transport,
    plan.steps.map(s=>[s.location,s.kind,s.activity,s.duration])]);
  return `plan-v1:${hashSeed(content).toString(16).padStart(8,"0")}${hashSeed(`plan:${content}`).toString(16).padStart(8,"0")}`;
}
export function pendingPlanMatches(pending:{startedSimMs:number;planKey?:string}|undefined,plan:PersonPlan|undefined) {
  return !!pending && !!plan && plan.simStartedAt===pending.startedSimMs && (!pending.planKey||pending.planKey===planKey(plan));
}
