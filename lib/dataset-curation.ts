/** Offline dialogue data only. Not imported by the Worker, planner or policy store. */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PLACES } from './event-schema.ts';
import { proposalSchema } from './living/schema.ts';
import { reviewNarrative } from './living/director.ts';

export const CURATION_LIMITS = Object.freeze({ inputBytes: 8388608, records: 2000, recordBytes: 65536, requestBytes: 32768, completionBytes: 8192, outputBytes: 33554432 });
export const CURATION_VERSION = 1;
export const RENDERER_VERSION = 'dialogue-request-v1';
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,99}$/);
const actor = z.string().regex(/^[a-z][a-z0-9-]{0,99}$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().min(1).max(2000);
const count = z.number().int().nonnegative().max(CURATION_LIMITS.records);
const modelSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('editorial'), revision: id }).strict(),
  z.object({ kind: z.literal('local-model'), id, revision: id, artifactSha256: hash }).strict(),
]);
const memorySchema = z.object({
  provenance: z.enum(['editorial', 'archive-record']), version: z.literal('memory-record-v1'),
  id: z.string().min(1).max(500), ownerId: actor, sourceId: z.string().min(1).max(500),
  kind: z.enum(['event-report', 'simulation-plan-outcome', 'legacy-record']),
  text: z.string().min(1).max(1000), createdAt: z.string().datetime({ offset: true }),
  witnessedWith: z.array(actor).min(1).max(8),
}).strict();
export const curationContextSchema = z.object({
  version: z.literal(1), actorId: actor, sceneId: id,
  participants: z.array(actor).length(2), location: z.enum(PLACES),
  facts: z.array(z.object({ id, text, sourceId: id, provenance: z.enum(['editorial', 'simulation-snapshot']), knownBy: z.array(actor).min(1).max(2) }).strict()).max(16),
  memories: z.array(memorySchema).max(6),
}).strict();
const sourceSchema = z.object({
  kind: z.enum(['synthetic-editorial', 'simulation-capture']), version: z.literal(1), id,
  snapshotSha256: hash,
  simulation: z.object({ worldBorn: z.string().datetime({ offset: true }), revision: z.number().int().nonnegative().safe(), eventId: id, capturedAt: z.string().datetime({ offset: true }) }).strict().nullable(),
}).strict();
export const curationRequestSchema = z.object({
  version: z.literal(RENDERER_VERSION), promptVersion: id, system: z.string().min(1).max(8000), task: text,
  context: curationContextSchema, source: sourceSchema, model: modelSchema,
  sampling: z.object({ temperature: z.number().min(0).max(2), topP: z.number().positive().max(1), maxTokens: z.number().int().min(1).max(8192), seed: z.number().int().nonnegative().max(0xffffffff).nullable() }).strict(),
}).strict();
const reference = z.object({ id, sha256: hash }).strict();
const reviewSchema = z.discriminatedUnion('decision', [
  z.object({ version: z.literal(1), decision: z.literal('abstain'), reviewer: z.object({ kind: z.enum(['human', 'agent']), id }).strict(), reason: text }).strict(),
  z.object({
    version: z.literal(1), decision: z.literal('approve'), reviewer: z.object({ kind: z.enum(['human', 'agent']), id }).strict(),
    requestSha256: hash, chosen: reference, rejected: reference.nullable(),
    checks: z.object({ relevance: z.literal('pass'), knowledge: z.literal('pass'), causality: z.literal('pass'), vietnamese: z.literal('pass') }).strict(),
    reason: text,
  }).strict(),
]);
export const curationRecordSchema = z.object({
  version: z.literal(1), id, actorId: actor, request: curationRequestSchema,
  candidates: z.array(z.object({ id, requestSha256: hash, completionSha256: hash, completion: z.unknown() }).strict()).min(1).max(4),
  review: reviewSchema.nullable(),
}).strict();
export type CurationRequest = z.infer<typeof curationRequestSchema>;
export type CurationRecord = z.infer<typeof curationRecordSchema>;
export type Split = 'train' | 'validation' | 'holdout';
export type ValidatorResult = { schema: boolean; narrative: boolean; participants: boolean; noRole: boolean; pass: boolean };
type ReviewApproved = Extract<NonNullable<CurationRecord['review']>, { decision: 'approve' }>;
type Candidate = CurationRecord['candidates'][number];
type Admitted = { record: CurationRecord; chosen: Candidate; rejected: Candidate | null; chosenValidation: ValidatorResult; rejectedValidation: ValidatorResult | null; requestSha256: string; promptSha256: string; contextSha256: string };
export class CurationError extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}
const bad = (code: string): never => { throw new CurationError(code); };

/** Stable JSON, without normalization of prompt or completion text. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (typeof value === 'object' && value && Object.getPrototypeOf(value) === Object.prototype)
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson((value as Record<string, unknown>)[key])).join(',') + '}';
  return bad('non-json-value');
}
export const curationHash = (value: unknown): string => createHash('sha256').update(canonicalJson(value)).digest('hex');
export const bytesHash = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');
const byteLength = (value: unknown) => Buffer.byteLength(canonicalJson(value));

/** Captures must use these exact messages, not reconstruct an old missing prompt. */
export function renderCurationMessages(request: CurationRequest) {
  return [{ role: 'system' as const, content: request.system }, { role: 'user' as const, content: canonicalJson({ task: request.task, context: request.context }) }];
}

export function validateCurationRequest(value: unknown): CurationRequest {
  const r = curationRequestSchema.parse(value), c = r.context;
  if (byteLength(r) > CURATION_LIMITS.requestBytes) bad('request-budget');
  if (new Set(c.participants).size !== 2 || !c.participants.includes(c.actorId)) bad('participant-scope');
  if (c.facts.some(f => !f.knownBy.includes(c.actorId) || new Set(f.knownBy).size !== f.knownBy.length || f.knownBy.some(a => !c.participants.includes(a)))) bad('fact-scope');
  if (c.memories.some(m => m.ownerId !== c.actorId || !m.witnessedWith.includes(c.actorId) || new Set(m.witnessedWith).size !== m.witnessedWith.length)) bad('memory-scope');
  if (new Set(c.facts.map(f => f.id)).size !== c.facts.length || new Set(c.memories.map(m => m.id)).size !== c.memories.length) bad('context-duplicate');
  if (curationHash(c) !== r.source.snapshotSha256) bad('context-sha');
  const synthetic = r.source.kind === 'synthetic-editorial';
  if (synthetic ? r.source.simulation !== null : r.source.simulation === null || r.model.kind !== 'local-model') bad('source-kind');
  if (c.facts.some(f => f.provenance !== (synthetic ? 'editorial' : 'simulation-snapshot')) || c.memories.some(m => m.provenance !== (synthetic ? 'editorial' : 'archive-record'))) bad('source-provenance');
  return r;
}

/** These are actual existing structural guards. Semantic approval remains separate. */
export function validateCurationCompletion(value: unknown, participants: string[]): ValidatorResult {
  const parsed = proposalSchema.safeParse(value);
  const schema = parsed.success;
  const noRole = schema && parsed.data.newRole === undefined;
  const cast = schema && new Set(parsed.data.dialogue.map(d => d.speaker)).size === 2 && parsed.data.dialogue.every(d => participants.includes(d.speaker));
  const narrative = schema && reviewNarrative(value, participants).ok;
  return { schema, narrative, participants: cast, noRole, pass: schema && narrative && cast && noRole };
}

const reportSchema = z.object({ scanned: count, foreign: count, invalid: count, unreviewed: count, hashRejected: count, validatorRejected: count, duplicates: count, accepted: count, dpo: count }).strict();
type Report = z.infer<typeof reportSchema>;
function admit(record: CurationRecord): Admitted | 'hashRejected' | 'unreviewed' | 'validatorRejected' {
  const request = validateCurationRequest(record.request);
  if (record.actorId !== request.context.actorId) bad('actor-scope');
  const requestSha256 = curationHash(request);
  if (new Set(record.candidates.map(c => c.id)).size !== record.candidates.length) bad('candidate-duplicate');
  if (record.candidates.some(c => byteLength(c.completion) > CURATION_LIMITS.completionBytes)) bad('completion-budget');
  if (record.candidates.some(c => c.requestSha256 !== requestSha256 || c.completionSha256 !== curationHash(c.completion))) return 'hashRejected';
  const review = record.review;
  if (!review || review.decision !== 'approve') return 'unreviewed';
  if (review.requestSha256 !== requestSha256) return 'hashRejected';
  const get = (ref: ReviewApproved['chosen']) => record.candidates.find(c => c.id === ref.id && c.completionSha256 === ref.sha256);
  const chosen = get(review.chosen), rejected = review.rejected ? get(review.rejected) : null;
  if (!chosen || review.rejected && !rejected) return 'hashRejected';
  if (rejected && (chosen.id === rejected.id || chosen.completionSha256 === rejected.completionSha256)) bad('identical-preference');
  const chosenValidation = validateCurationCompletion(chosen.completion, request.context.participants);
  if (!chosenValidation.pass) return 'validatorRejected';
  return { record, chosen, rejected: rejected ?? null, chosenValidation, rejectedValidation: rejected ? validateCurationCompletion(rejected.completion, request.context.participants) : null, requestSha256, promptSha256: curationHash(renderCurationMessages(request)), contextSha256: curationHash(request.context) };
}

/** Union all matching scenes, source IDs, exact prompts or contexts before splitting. */
function groupedSplits(rows: Admitted[]) {
  const parents = rows.map((_, i) => i), keys = new Map<string, number>();
  const find = (i: number): number => parents[i] === i ? i : (parents[i] = find(parents[i]));
  const rowKeys = rows.map((r, i) => {
    const s = r.record.request.source;
    const all = [`scene:${r.record.request.context.sceneId}`, `source:${s.kind}:${s.id}`, `prompt:${r.promptSha256}`, `context:${r.contextSha256}`];
    // All captures of one simulation event stay together even under a new source ID.
    if (s.simulation) all.push(`event:${s.simulation.worldBorn}:${s.simulation.eventId}`);
    for (const key of all) { const other = keys.get(key); if (other !== undefined) parents[find(i)] = find(other); else keys.set(key, i); }
    return all;
  });
  const components = new Map<number, Set<string>>();
  rowKeys.forEach((all, i) => { const root = find(i), set = components.get(root) ?? new Set<string>(); all.forEach(k => set.add(k)); components.set(root, set); });
  return rows.map((_, i) => {
    const groupSha256 = curationHash({ actorId: rows[i].record.actorId, keys: [...components.get(find(i))!].sort() });
    const bucket = parseInt(groupSha256.slice(0, 8), 16) % 100;
    return { groupSha256, split: (bucket < 80 ? 'train' : bucket < 90 ? 'validation' : 'holdout') as Split };
  });
}

function makeExports(rows: Admitted[]) {
  const groups = groupedSplits(rows);
  const fewShot = rows.map((r, i) => ({
    id: r.record.id, actorId: r.record.actorId, ...groups[i], requestSha256: r.requestSha256, promptSha256: r.promptSha256, contextSha256: r.contextSha256,
    rendererVersion: r.record.request.version, promptVersion: r.record.request.promptVersion,
    source: r.record.request.source, model: r.record.request.model, sampling: r.record.request.sampling, messages: renderCurationMessages(r.record.request),
    completion: canonicalJson(r.chosen.completion), completionSha256: r.chosen.completionSha256,
    validation: r.chosenValidation,
  }));
  const dpo = rows.flatMap((r, i) => {
    if (!r.rejected) return [];
    const { completion, completionSha256, ...shared } = fewShot[i];
    return [{ ...shared, chosen: completion, chosenSha256: completionSha256, rejected: canonicalJson(r.rejected.completion), rejectedSha256: r.rejected.completionSha256,
      rejectedValidation: r.rejectedValidation!, labelSource: r.record.review! }];
  });
  return { fewShot, dpo };
}
const compatibility = Object.freeze({ version: CURATION_VERSION, renderer: RENDERER_VERSION, validatorVersion: 'proposal-narrative-v1', splitVersion: 'source-scene-prompt-context-components-sha80-10-10-v1' });
type Exports = ReturnType<typeof makeExports>;
export type CuratedDataset = {
  version: 1; kind: 'actor-scoped-dialogue-dataset'; actorId: string; compatibility: typeof compatibility;
  inputSha256: string; validatorSha256: string; report: Report; records: CurationRecord[]; exports: Exports; sha256: string;
};
type Pin = { inputSha256: string; validatorSha256: string };

export function curateDataset(values: unknown[], actorId: string, pins: Pin): CuratedDataset {
  actor.parse(actorId); hash.parse(pins.inputSha256); hash.parse(pins.validatorSha256);
  if (values.length > CURATION_LIMITS.records) bad('record-count-budget');
  const report: Report = { scanned: values.length, foreign: 0, invalid: 0, unreviewed: 0, hashRejected: 0, validatorRejected: 0, duplicates: 0, accepted: 0, dpo: 0 };
  const identities = new Map<string, string>(), candidates = new Map<string, string>(), outputs = new Map<string, string>(), decisions = new Map<string, string>(), rows: Admitted[] = [];
  for (const value of values) {
    // Deliberately before parsing/hash/audit: peer private input cannot affect this actor.
    if (value && typeof value === 'object' && 'actorId' in value && typeof value.actorId === 'string' && value.actorId !== actorId) { report.foreign++; continue; }
    if (byteLength(value) > CURATION_LIMITS.recordBytes) bad('record-byte-budget');
    const parsed = curationRecordSchema.safeParse(value);
    if (!parsed.success) { report.invalid++; continue; }
    const r = parsed.data, identity = curationHash(r), old = identities.get(r.id);
    if (old && old !== identity) bad('conflicting-record-id');
    if (old) { report.duplicates++; continue; }
    identities.set(r.id, identity);
    let admitted;
    try { admitted = admit(r); } catch { report.invalid++; continue; }
    if (typeof admitted === 'string') { report[admitted]++; continue; }
    for (const c of r.candidates) {
      const signature = curationHash({ request: c.requestSha256, completion: c.completionSha256 });
      if (candidates.has(c.id) && candidates.get(c.id) !== signature) bad('conflicting-candidate-id');
      candidates.set(c.id, signature);
    }
    // Different capture/source IDs cannot hide opposite labels for the same visible
    // prompt, model and sampling. Keep provenance in request pins, not in this key.
    const generationKey = curationHash({ messages: renderCurationMessages(r.request), model: r.request.model, sampling: r.request.sampling, sourceKind: r.request.source.kind, sourceVersion: r.request.source.version });
    for (const [c, decision] of [[admitted.chosen, 'chosen'], [admitted.rejected, 'rejected']] as const) {
      if (!c) continue;
      const key = generationKey + ':' + c.completionSha256;
      if (decisions.has(key) && decisions.get(key) !== decision) bad('contradictory-review');
      decisions.set(key, decision);
    }
    const outputKey = admitted.requestSha256 + ':' + admitted.chosen.completionSha256;
    const label = curationHash({ chosen: admitted.chosen.completionSha256, rejected: admitted.rejected?.completionSha256 ?? null });
    if (outputs.has(outputKey)) {
      if (outputs.get(outputKey) !== label) bad('conflicting-preference');
      report.duplicates++; continue;
    }
    outputs.set(outputKey, label); rows.push(admitted);
  }
  rows.sort((a, b) => a.record.id < b.record.id ? -1 : a.record.id > b.record.id ? 1 : 0);
  report.accepted = rows.length; report.dpo = rows.filter(r => r.rejected).length;
  const payload = { version: 1 as const, kind: 'actor-scoped-dialogue-dataset' as const, actorId, compatibility, ...pins, report, records: rows.map(r => r.record), exports: makeExports(rows) };
  return { ...payload, sha256: curationHash(payload) };
}

/** Recompute admission and every exported label/split; a valid self-hash alone is insufficient. */
export function verifyCuratedDataset(value: unknown, expectedValidatorSha256: string): CuratedDataset {
  if (byteLength(value) > CURATION_LIMITS.outputBytes) bad('output-budget');
  const shell = z.object({ version: z.literal(1), kind: z.literal('actor-scoped-dialogue-dataset'), actorId: actor, compatibility: z.unknown(), inputSha256: hash, validatorSha256: hash, report: reportSchema, records: z.array(z.unknown()).max(CURATION_LIMITS.records), exports: z.unknown(), sha256: hash }).strict().parse(value);
  const { sha256, ...payload } = shell;
  if (curationHash(payload) !== sha256 || shell.validatorSha256 !== expectedValidatorSha256) bad('artifact-sha-or-validator');
  const rebuilt = curateDataset(shell.records, shell.actorId, { inputSha256: shell.inputSha256, validatorSha256: shell.validatorSha256 });
  if (rebuilt.report.accepted !== shell.records.length || shell.report.accepted !== shell.records.length || shell.report.dpo !== rebuilt.report.dpo ||
      shell.report.scanned !== shell.report.foreign + shell.report.invalid + shell.report.unreviewed + shell.report.hashRejected + shell.report.validatorRejected + shell.report.duplicates + shell.report.accepted ||
      canonicalJson(rebuilt.compatibility) !== canonicalJson(shell.compatibility) || canonicalJson(rebuilt.records) !== canonicalJson(shell.records) || canonicalJson(rebuilt.exports) !== canonicalJson(shell.exports)) bad('artifact-admission');
  return structuredClone(value) as CuratedDataset;
}

/** Offline convenience only; no live prompt integration or import. Never returns held-out exemplars. */
export function selectDatasetFewShots(value: unknown, request: CurationRequest, validatorSha256: string, limit = 2) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 4) bad('selection-limit');
  const dataset = verifyCuratedDataset(value, validatorSha256), target = validateCurationRequest(request);
  if (dataset.actorId !== target.context.actorId) bad('selection-actor');
  const records = new Map(dataset.records.map(r => [r.id, r.request]));
  const promptSha256 = curationHash(renderCurationMessages(target)), contextSha256 = curationHash(target.context);
  const excludedGroups = new Set(dataset.exports.fewShot.filter(e => {
    const r = records.get(e.id)!;
    return r.context.sceneId === target.context.sceneId || r.source.kind === target.source.kind && r.source.id === target.source.id ||
      e.promptSha256 === promptSha256 || e.contextSha256 === contextSha256 ||
      r.source.simulation && target.source.simulation && r.source.simulation.worldBorn === target.source.simulation.worldBorn && r.source.simulation.eventId === target.source.simulation.eventId;
  }).map(e => e.groupSha256));
  return dataset.exports.fewShot.filter(e => {
    const r = records.get(e.id)!;
    return e.split === 'train' && !excludedGroups.has(e.groupSha256) &&
      r.promptVersion === target.promptVersion && r.version === target.version && r.system === target.system && r.task === target.task &&
      canonicalJson(r.model) === canonicalJson(target.model) && r.source.kind === target.source.kind &&
      r.context.location === target.context.location && canonicalJson([...r.context.participants].sort()) === canonicalJson([...target.context.participants].sort());
  }).slice(0, limit).map(e => structuredClone(e));
}
