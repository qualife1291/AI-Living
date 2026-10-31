/** H6.4 QA-only bounded canary; runtime stays baseline unless independently
 * signed H6.3 promotion gate and independently signed model both pass.
 * No D1 writes, actor IDs in logs, extra reward grants or catalog mutations.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import release from "../../data/training/h6-shadow-runtime.json" with { type: "json" };
import decision from "../../data/training/h6-canary-promotion.json" with { type: "json" };
import { systemLog } from "../system-log.ts";
import { evaluateH6ShadowPair, verifyH6ShadowArtifact, type H6ShadowEnvelope, type VerifiedH6Shadow } from "./h6-shadow-evaluator.ts";
import { scenarios, type Scenario, type AgentLearning } from "./learning.ts";
import type { RealContext } from "./schema.ts";

export type H6CanaryGate = {
  schema: "qa-h6-canary-gate-v1"; decision: "allow" | "deny"; modelSha256: string;
  catalogSha256: string; candidateCount: 96; liveCount: 41;
  approvedActorIds: string[]; minPopulation: number; maxPercent: 5;
  shadowEvaluationCount: number; shadowHours: number; shadowP95Ms: number;
  ordinaryHoldoutLower95: number; coldStressSharedPriorEnabled: false;
  independentReview: string; rollbackVersion: string; expiresAt: string;
};
export type H6SignedCanaryGate = { gate: H6CanaryGate | null; signature: string | null };
type Stats = { model: VerifiedH6Shadow; ids: Set<string>; minPopulation: number; total: number; changed: number;
  fallback: number; failed: number; modelUsed: number; ms: number[]; };
const storage = new AsyncLocalStorage<Stats>();
const expectedCatalogSha = "3b3cf7a0e0db902c006766f4e2f23927562d5581247ff08b701575b7d35e0267";
const shaRe = /^[0-9a-f]{64}$/;
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const actorRe = /^neighbor-[1-9][0-9]{0,3}$/;
const decode = (s: string) => Uint8Array.from(atob(s), x => x.charCodeAt(0));
const percentile = (values: number[], q: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.ceil(q * sorted.length) - 1] * 100) / 100;
};
/** Signature and every prerequisite must be checked independently at the
 * gate, before any model treatment. The signing private key never enters QA.
 */
export async function verifyH6CanaryGate(
  signed: H6SignedCanaryGate, modelSha: string, publicKeyBase64: string,
  now = Date.now(),
): Promise<H6CanaryGate> {
  const g = signed?.gate;
  if (!g || !signed.signature || !publicKeyBase64 || !shaRe.test(modelSha)) throw Error("H6.4 gate missing");
  if (g.schema !== "qa-h6-canary-gate-v1" || g.decision !== "allow" ||
    g.modelSha256 !== modelSha || g.catalogSha256 !== expectedCatalogSha ||
    g.candidateCount !== 96 || g.liveCount !== 41 || g.maxPercent !== 5 ||
    !Number.isSafeInteger(g.minPopulation) || g.minPopulation < 40 ||
    !Array.isArray(g.approvedActorIds) || g.approvedActorIds.length === 0 ||
    g.approvedActorIds.length > Math.floor(g.minPopulation * .05) ||
    new Set(g.approvedActorIds).size !== g.approvedActorIds.length ||
    !g.approvedActorIds.every(id => typeof id === "string" && actorRe.test(id)) ||
    !Number.isSafeInteger(g.shadowEvaluationCount) || g.shadowEvaluationCount < 1000 ||
    !Number.isFinite(g.shadowHours) || g.shadowHours < 24 ||
    !Number.isFinite(g.shadowP95Ms) || g.shadowP95Ms < 0 || g.shadowP95Ms > 25 ||
    !Number.isFinite(g.ordinaryHoldoutLower95) || g.ordinaryHoldoutLower95 <= 0 ||
    g.coldStressSharedPriorEnabled !== false ||
    typeof g.independentReview !== "string" || !/^https:\/\/github\.com\/qualife1291\/AI-Living\/(pull|issues)\/[0-9]+$/.test(g.independentReview) ||
    typeof g.rollbackVersion !== "string" || !uuidRe.test(g.rollbackVersion) ||
    typeof g.expiresAt !== "string" || !Number.isFinite(Date.parse(g.expiresAt)) ||
    Date.parse(g.expiresAt) <= now || Date.parse(g.expiresAt) > now + 7 * 86400000)
    throw Error("H6.4 promotion gate denied");
  const k = await crypto.subtle.importKey("raw", decode(publicKeyBase64), { name: "Ed25519" }, false, ["verify"]);
  if (!await crypto.subtle.verify("Ed25519", k, decode(signed.signature), new TextEncoder().encode(JSON.stringify(g))))
    throw Error("H6.4 promotion signature mismatch");
  return g;
}
/** An invalid/absent gate does not stop the existing resident scheduler. */
export async function withQaH6Canary<T>(settings: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  if (settings.XOM_H6_CANARY_ENABLED !== "true") return run();
  if (settings.XOM_H6_MODE !== "canary" || settings.XOM_H6_CANARY_KILL_SWITCH !== "false") {
    systemLog("h6_canary_blocked", { status: 409 }); return run();
  }
  let model: VerifiedH6Shadow, gate: H6CanaryGate;
  try {
    model = await verifyH6ShadowArtifact(release as unknown as H6ShadowEnvelope,
      settings.XOM_H6_SHADOW_MODEL_SHA256 ?? "", settings.XOM_H6_SHADOW_PUBLIC_KEY ?? "");
    gate = await verifyH6CanaryGate(decision as H6SignedCanaryGate, model.sha256,
      settings.XOM_H6_PROMOTION_PUBLIC_KEY ?? "");
  } catch { systemLog("h6_canary_blocked", { status: 409 }); return run(); }
  const stats: Stats = { model, ids: new Set(gate.approvedActorIds), minPopulation: gate.minPopulation, total: 0,
    changed: 0, fallback: 0, failed: 0, modelUsed: 0, ms: [] };
  return storage.run(stats, async () => {
    try { return await run(); }
    finally {
      systemLog("h6_canary_result", { status: 200, h6ModelSha256: model.sha256,
        h6CanaryEvaluations: stats.total, h6CanaryChanged: stats.changed,
        h6CanaryFallback: stats.fallback, h6CanaryErrors: stats.failed,
        h6ModelUsed: stats.modelUsed, h6LatencyP50Ms: percentile(stats.ms, .5),
        h6LatencyP95Ms: percentile(stats.ms, .95), h6LatencyP99Ms: percentile(stats.ms, .99) });
    }
  });
}
/** Must be called only for a genuine eligible resident's next plan.
 * Cohort is a signed stable allowlist, max 5% of CURRENT QA population.
 * Welfare/health, night, unsupported arm, ambiguous baseline -> personal fallback.
 */
export function chooseH6CanaryScenario(input: {
  actorId: string; residents: readonly {id: string}[]; agent: AgentLearning;
  context: RealContext; rolePlace?: string; roleKind: string; baseline: Scenario;
}): Scenario {
  const s = storage.getStore();
  if (!s) return input.baseline;
  if (!s.ids.has(input.actorId)) return input.baseline;
  s.total++;
  const begin = performance.now();
  try {
    const population = input.residents.length;
    if (population < s.minPopulation || s.ids.size > Math.floor(population * .05) ||
      !input.residents.some(r => r.id === input.actorId) ||
      // Conservative treatment: do not explore under stress or unavailable weather.
      input.context.hour < 6 || input.context.hour >= 22 ||
      input.agent.energy < 55 || input.agent.hunger > 45 ||
      input.agent.health < 85 || input.context.weather.status !== "fresh") {
      s.fallback++; return input.baseline;
    }
    const paired = evaluateH6ShadowPair({actorId: input.actorId, agent: input.agent,
      context: input.context, rolePlace: input.rolePlace, roleKind: input.roleKind,
      observedScenarioId: input.baseline.id, model: s.model});
    if (!paired.eligible || !paired.baselineMatchesObserved || !paired.candidateLive ||
      !paired.candidateScenarioId || !paired.modelUsed) { s.fallback++; return input.baseline; }
    s.modelUsed++;
    const selected = scenarios.find(a => a.id === paired.candidateScenarioId);
    if (!selected) { s.fallback++; return input.baseline; }
    if (selected.id !== input.baseline.id) s.changed++;
    return selected;
  } catch { s.failed++; return input.baseline; }
  finally { s.ms.push(Math.max(0, performance.now() - begin)); }
}
