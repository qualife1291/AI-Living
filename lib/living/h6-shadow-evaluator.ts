/** H6.1 experimental shadow scorer. No DB access, writes, network, training or policy activation.
 * Artifacts require an independently pinned SHA-256 AND Ed25519 release signature.
 * 96 synthetic catalog entries never become live-eligible actions.
 */
import shadowCatalog from "../../data/training/h6-scenario-catalog.json" with { type: "json" };
import { hashSeed } from "../clock.ts";
import { availableScenarios, chooseScenario, scenarios, type AgentLearning } from "./learning.ts";
import { decisionContext, linearScore, validArm, type LinearArm } from "./linucb.ts";
import { CATALOG_SIGNATURE, HIERARCHY_CATALOG, HIERARCHY_K } from "./hierarchical-prior.ts";
import { REWARD_VERSION, FEATURE_VERSION } from "./reward-evidence.ts";
import type { RealContext } from "./schema.ts";

export type H6ShadowRow = { roleKind: string | null; scenarioId: string; support: number; donorActors: number; donorSeeds: number; model: LinearArm };
export type H6ShadowPrior = { version: string; source: string; profile: string; scenarioSignature: number;
  catalogSignature: number; rewardVersion: string; featureVersion: string; acceptedOutcomes: number;
  rows: H6ShadowRow[] };
export type H6ShadowEnvelope = { artifact: { prior: H6ShadowPrior; provenance: Record<string, unknown>; sha256: string } | null; signature: string | null };
export type VerifiedH6Shadow = { sha256: string; prior: H6ShadowPrior; rows: Map<string, H6ShadowRow> };
const fingerprint = /^[0-9a-f]{64}$/;
const shaHex = async (bytes: Uint8Array<ArrayBuffer>) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
  .map(value => value.toString(16).padStart(2, "0")).join("");
const encoder = new TextEncoder();
const keyFor = (kind: string | null, id: string) => JSON.stringify([kind, id]);
const known = new Set(shadowCatalog.map(s => s.id));
const validKinds = new Set(HIERARCHY_CATALOG.roles.map(r => r.kind));

function positiveDefinite(arm: LinearArm): boolean {
  if (!validArm(arm) || arm.samples < 5 || arm.b.some(v => Math.abs(v) > arm.samples + 1e-8)) return false;
  const idx = (r: number, c: number): number => r > c ? idx(c, r) : r * 6 - r * (r + 1) / 2 + c;
  const lower = Array.from({ length: 6 }, () => Array<number>(6).fill(0));
  for (let i = 0; i < 6; i++) for (let j = 0; j <= i; j++) {
    let value = arm.inverse[idx(i, j)];
    if (i === j && (value <= 0 || value > 1 + 1e-8)) return false;
    for (let k = 0; k < j; k++) value -= lower[i][k] * lower[j][k];
    if (i === j) { if (!(value > 0)) return false; lower[i][j] = Math.sqrt(value); }
    else lower[i][j] = value / lower[j][j];
  }
  return true;
}
const decode = (value: string) => {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw Error("Invalid H6 signature encoding");
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
};

/** Reject unsigned, unpinned, stale, non-H6 and invalid-covariance models.
 * A checksum alone is NOT a signature; caller must supply a trusted public key
 * from a separately reviewed QA-only Worker binding.
 */
export async function verifyH6ShadowArtifact(
  envelope: H6ShadowEnvelope, pinnedSha256: string, publicKeyBase64: string,
): Promise<VerifiedH6Shadow> {
  if (!fingerprint.test(pinnedSha256) || !envelope?.artifact || !envelope.signature || !publicKeyBase64)
    throw Error("H6 shadow release not configured");
  if (scenarios.length !== 41 || shadowCatalog.length !== 96 ||
    JSON.stringify(shadowCatalog.slice(0, 41)) !== JSON.stringify(scenarios))
    throw Error("H6 live catalog compatibility mismatch");
  const { prior, provenance, sha256 } = envelope.artifact;
  if (sha256 !== pinnedSha256) throw Error("H6 model pin mismatch");
  const body = encoder.encode(JSON.stringify({ prior, provenance }));
  if (await shaHex(body) !== sha256) throw Error("H6 model checksum mismatch");
  const publicKey = await crypto.subtle.importKey("raw", decode(publicKeyBase64), { name: "Ed25519" }, false, ["verify"]);
  const signatureValid = await crypto.subtle.verify("Ed25519", publicKey, decode(envelope.signature), encoder.encode(sha256));
  if (!signatureValid) throw Error("H6 model signature mismatch");
  if (prior.version !== "hierarchical-linucb-v1" || prior.source !== "synthetic-H4-training" ||
    prior.profile !== "ordinary-v1" || prior.scenarioSignature !== hashSeed(JSON.stringify(shadowCatalog)) ||
    prior.catalogSignature !== CATALOG_SIGNATURE || prior.rewardVersion !== REWARD_VERSION ||
    prior.featureVersion !== FEATURE_VERSION || !Number.isSafeInteger(prior.acceptedOutcomes) ||
    prior.acceptedOutcomes <= 0 || !Array.isArray(prior.rows) || prior.rows.length < 1 || prior.rows.length > 1000 ||
    provenance?.productionAccess !== false)
    throw Error("H6 model provenance or scenario signature mismatch");
  const rows = new Map<string, H6ShadowRow>();
  for (const row of prior.rows) {
    const key = keyFor(row.roleKind, row.scenarioId);
    if (!known.has(row.scenarioId) || (row.roleKind !== null && !validKinds.has(row.roleKind as typeof HIERARCHY_CATALOG.roles[number]["kind"])) ||
      rows.has(key) || !Number.isSafeInteger(row.support) || row.support < 5 ||
      !Number.isSafeInteger(row.donorActors) || row.donorActors < 2 ||
      !Number.isSafeInteger(row.donorSeeds) || row.donorSeeds < 2 ||
      row.donorSeeds > row.donorActors || row.donorActors > row.support ||
      row.support !== row.model?.samples || row.support > prior.acceptedOutcomes ||
      !positiveDefinite(row.model))
      throw Error("H6 model row rejected");
    rows.set(key, row);
  }
  return { sha256, prior, rows };
}
export type H6PairedResult = { eligible: boolean; modelUsed: boolean; agreement: boolean; baselineMatchesObserved: boolean;
  candidateLive: boolean; candidateScenarioId: string | null; uncertaintyBucket: "low" | "medium" | "high" | "unavailable" };
/** Scores the SAME context through existing 41-action eligibility; never writes a plan.
 * Skip inconsistent observed decisions instead of inventing a matched baseline.
 * Posterior uncertainty is NOT calibrated confidence or counterfactual reward.
 */
export function evaluateH6ShadowPair(input: {
  agent: AgentLearning; actorId: string; context: RealContext; rolePlace?: string; roleKind: string;
  observedScenarioId: string; model: VerifiedH6Shadow;
}): H6PairedResult {
  const { agent, actorId, context, rolePlace, roleKind, observedScenarioId, model } = input;
  const eligible = availableScenarios(agent, context);
  if (!eligible.some(s => s.id === observedScenarioId))
    return { eligible: false, modelUsed: false, agreement: false, baselineMatchesObserved: false,
      candidateLive: false, candidateScenarioId: null, uncertaintyBucket: "unavailable" };
  const baseline = chooseScenario(agent, actorId, context, rolePlace);
  if (baseline.id !== observedScenarioId)
    return { eligible: true, modelUsed: false, agreement: false, baselineMatchesObserved: false,
      candidateLive: false, candidateScenarioId: null, uncertaintyBucket: "unavailable" };
  const x = decisionContext(agent, context.weather);
  let used = false;
  const prior = (scenario: typeof scenarios[number]) => {
    const global = model.rows.get(keyFor(null, scenario.id));
    if (!global) return null;
    const role = model.rows.get(keyFor(roleKind, scenario.id));
    const globalMean = linearScore(global.model, x, 0).mean;
    const mix = role ? Math.min(.8, role.support / (role.support + 20)) : 0;
    const mean = role ? globalMean + (linearScore(role.model, x, 0).mean - globalMean) * mix : globalMean;
    const personal = agent.linear?.[scenario.id]?.samples ?? agent.actions[scenario.id]?.trials ?? 0;
    used = true;
    return { mean, weight: HIERARCHY_K / (personal + HIERARCHY_K) };
  };
  const shadow = chooseScenario(agent, actorId, context, rolePlace, "linucb", prior);
  const row = model.rows.get(keyFor(roleKind, shadow.id)) ?? model.rows.get(keyFor(null, shadow.id));
  const uncertainty = row ? linearScore(row.model, x).uncertainty : null;
  const uncertaintyBucket = uncertainty === null ? "unavailable" : uncertainty < .1 ? "low" : uncertainty < .25 ? "medium" : "high";
  return { eligible: true, modelUsed: used, agreement: observedScenarioId === shadow.id,
    baselineMatchesObserved: true, candidateLive: eligible.some(s => s.id === shadow.id), candidateScenarioId: shadow.id, uncertaintyBucket };
}
