import type { World } from "../world";
import { validArm, type LinearArm } from "./linucb.ts";

type Policy = Record<string, LinearArm>;
type PolicyRow = { actor_id: string; data: string; updated_revision: number };
export class PolicyRevisionConflict extends Error {}

function parsePolicy(value: unknown): Policy {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !Object.values(value).every(arm => arm && typeof arm === "object" && validArm(arm as LinearArm)))
    throw new Error("Invalid stored learning policy; original data was preserved");
  return value as Policy;
}
function samePolicy(a: Policy, b: Policy) {
  const keys = Object.keys(a).sort();
  return keys.length === Object.keys(b).length && keys.every(k =>
    b[k] && a[k].version === b[k].version && a[k].samples === b[k].samples &&
    a[k].b.every((v, i) => v === b[k].b[i]) && a[k].inverse.every((v, i) => v === b[k].inverse[i]));
}
export async function policyTableExists(db: D1Database) {
  return !!await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_policies'").first();
}
/** On-demand hydration for planners/learning export. Ordinary world reads stay small. */
export async function hydratePolicies(db: D1Database, world: World, revision: number) {
  const agents = world.living?.learning ?? {}, ids = Object.keys(agents);
  if (!ids.length) return;
  if (!await policyTableExists(db)) {
    if (Object.values(agents).some(a => a.policyRevision !== undefined))
      throw new Error("Learning policy table is unavailable; refusing to reset learned data");
    return; // Before migration: retain the legacy inline representation.
  }
  const result = await db.prepare("SELECT actor_id,data,updated_revision FROM learning_policies WHERE actor_id IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify(ids)).all<PolicyRow>();
  const rows = new Map(result.results.map(row => [row.actor_id, row]));
  for (const [id, agent] of Object.entries(agents)) {
    const row = rows.get(id);
    if (agent.policyRevision !== undefined && (!row || row.updated_revision !== agent.policyRevision))
      throw new PolicyRevisionConflict("Learning policy revision changed; retry the snapshot read");
    if (!row) continue;
    if (row.updated_revision > revision) throw new PolicyRevisionConflict("Learning policy is newer than the snapshot");
    const stored = parsePolicy(JSON.parse(row.data));
    if (agent.linear && !samePolicy(parsePolicy(agent.linear), stored))
      throw new Error("Inline and separate learning policies conflict; both copies were preserved");
    // An unreferenced row may belong to an older snapshot/rollback. Never attach
    // or overwrite it with a fresh model just because an actor ID matches.
    if (agent.policyRevision === undefined && !agent.linear)
      throw new Error("Unreferenced learning policy requires reconciliation; stored data was preserved");
    agent.linear = structuredClone(stored);
  }
}

/** All rows and the stripped snapshot must be committed in the same CAS batch. */
export async function preparePolicyWrite(db: D1Database, world: World, revision: number, nonce: string) {
  const agents = world.living?.learning;
  if (!agents) return { data: JSON.stringify(world), statements: [] as D1PreparedStatement[] };
  if (!await policyTableExists(db)) {
    if (Object.values(agents).some(a => a.policyRevision !== undefined)) throw new Error("Referenced learning policy table is missing");
    return { data: JSON.stringify(world), statements: [] as D1PreparedStatement[] };
  }
  const learning = { ...agents }, entries: { id: string; data: string }[] = [];
  for (const [id, agent] of Object.entries(agents)) {
    if (!agent.linear) {
      if (agent.policyRevision !== undefined) throw new Error("Learning policy was not hydrated before writing");
      continue;
    }
    entries.push({ id, data: JSON.stringify(parsePolicy(agent.linear)) });
    learning[id] = { ...agent, policyRevision: revision };
    delete learning[id].linear;
  }
  const statements: D1PreparedStatement[] = [], at = new Date().toISOString();
  // Bounded JSON parameters rather than hundreds of actor bind slots. Each
  // individual actor must also fit D1's per-value limit; never truncate a model.
  let chunk: typeof entries = [], bytes = 2;
  const flush = () => {
    if (!chunk.length) return;
    statements.push(db.prepare("INSERT INTO learning_policies(actor_id,data,updated_revision,updated_at) SELECT json_extract(value,'$.id'),json_extract(value,'$.data'),?,? FROM json_each(?) WHERE EXISTS(SELECT 1 FROM worlds WHERE id='home' AND revision=? AND json_extract(data,'$.living.learningCommit')=?) ON CONFLICT(actor_id) DO UPDATE SET data=excluded.data,updated_revision=excluded.updated_revision,updated_at=excluded.updated_at WHERE excluded.updated_revision>learning_policies.updated_revision")
      .bind(revision, at, JSON.stringify(chunk), revision, nonce));
    chunk = []; bytes = 2;
  };
  for (const entry of entries) {
    const size = new TextEncoder().encode(JSON.stringify(entry)).byteLength + 1;
    if (size > 500_000) throw new Error("Individual learning policy exceeds storage budget; data was preserved");
    if (bytes + size > 500_000) flush();
    chunk.push(entry); bytes += size;
  }
  flush();
  return { data: JSON.stringify({ ...world, living: { ...world.living!, learning } }), statements };
}
