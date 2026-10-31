/** QA-only H6.1 shadow scoring instrumentation. It is inert without an
 * independently signed and pinned 96-candidate model release. No D1 access.
 * Aggregates are request-local and contain no actors, IDs, context or rewards.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import modelRelease from "../../data/training/h6-shadow-runtime.json" with { type: "json" };
import { systemLog } from "../system-log.ts";
import { evaluateH6ShadowPair, verifyH6ShadowArtifact, type H6ShadowEnvelope, type VerifiedH6Shadow } from "./h6-shadow-evaluator.ts";
import type { AgentLearning } from "./learning.ts";
import type { RealContext } from "./schema.ts";

type Bucket = "low" | "medium" | "high" | "unavailable";
type Aggregate = { model: VerifiedH6Shadow; total: number; paired: number; used: number;
  agreements: number; mismatches: number; errors: number; skipped: number;
  uncertainty: Record<Bucket, number>; durations: number[] };
const local = new AsyncLocalStorage<Aggregate>();
function quantile(values: readonly number[], rank: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.ceil(rank * sorted.length) - 1] * 100) / 100;
}
/** A disabled flag or invalid release always keeps the original baseline writer. */
export async function withQaH6Shadow<T>(settings: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  if (settings.XOM_H6_SHADOW_EVAL_ENABLED !== "true") return run();
  if (settings.XOM_H6_MODE !== "shadow-only") {
    systemLog("h6_shadow_blocked", { status: 409 });
    return run();
  }
  let model: VerifiedH6Shadow;
  try {
    model = await verifyH6ShadowArtifact(
      modelRelease as unknown as H6ShadowEnvelope,
      settings.XOM_H6_SHADOW_MODEL_SHA256 ?? "",
      settings.XOM_H6_SHADOW_PUBLIC_KEY ?? "",
    );
  } catch {
    // Never log the secret, signature, raw prior, identity or exception message.
    systemLog("h6_shadow_blocked", { status: 409 });
    return run();
  }
  const aggregate: Aggregate = { model, total: 0, paired: 0, used: 0, agreements: 0,
    mismatches: 0, errors: 0, skipped: 0, uncertainty: { low: 0, medium: 0, high: 0, unavailable: 0 }, durations: [] };
  return local.run(aggregate, async () => {
    try {
      return await run();
    } finally {
      systemLog("h6_shadow_eval", { status: 200, h6ModelSha256: model.sha256,
        h6Evaluations: aggregate.total, h6Paired: aggregate.paired, h6ModelUsed: aggregate.used,
        h6Agreements: aggregate.agreements, h6Mismatches: aggregate.mismatches,
        h6Errors: aggregate.errors, h6Skipped: aggregate.skipped,
        h6UncertaintyLow: aggregate.uncertainty.low, h6UncertaintyMedium: aggregate.uncertainty.medium,
        h6UncertaintyHigh: aggregate.uncertainty.high,
        h6LatencyP50Ms: quantile(aggregate.durations, .5),
        h6LatencyP95Ms: quantile(aggregate.durations, .95),
        h6LatencyP99Ms: quantile(aggregate.durations, .99),
        h6ShadowOnly: true });
    }
  });
}
/** Called with the exact baseline chooser input. Merely compares PROPOSED
 * actions, which may later be overridden by encounter, need or pending plan.
 * This is not treatment, real executed outcome or counterfactual reward.
 */
export function captureH6ShadowProposal(input: {
  agent: AgentLearning; actorId: string; context: RealContext;
  rolePlace: string; roleKind: string; baselineScenarioId: string;
}) {
  const a = local.getStore();
  if (!a) return;
  const started = performance.now();
  a.total++;
  try {
    const r = evaluateH6ShadowPair({
      agent: input.agent, actorId: input.actorId, context: input.context,
      rolePlace: input.rolePlace, roleKind: input.roleKind,
      observedScenarioId: input.baselineScenarioId, model: a.model,
    });
    if (!r.eligible || !r.baselineMatchesObserved || !r.candidateLive) { a.skipped++; return; }
    a.paired++;
    if (!r.modelUsed) { a.skipped++; return; }
    a.used++;
    if (r.agreement) a.agreements++;
    else a.mismatches++;
    a.uncertainty[r.uncertaintyBucket]++;
  } catch {
    // Do not change the baseline plan when shadow inference fails.
    a.errors++;
  } finally {
    a.durations.push(Math.max(0, performance.now() - started));
  }
}
