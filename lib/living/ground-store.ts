import { z } from 'zod';
import type { World } from '../world';
import { GROUND_LIMITS, GROUND_SCOPE, GroundTimelineError, groundHash, groundStateSchema, groundSummary, startGroundTimeline, advanceGroundTimeline, validateGroundState, type GroundState } from './ground-timeline.ts';

const hash = z.string().regex(/^[a-f0-9]{64}$/), checkpoint = z.union([z.literal('new'), hash]);
export const groundRequestSchema = z.object({
  sessionId: z.string().uuid(), action: z.enum(['status', 'preview', 'start', 'advance']).default('status'),
  expectedCheckpoint: checkpoint.default('new'), operationId: z.string().uuid().optional(),
}).strict().superRefine((r, ctx) => {
  const write = r.action === 'start' || r.action === 'advance';
  if (write !== !!r.operationId || r.action === 'start' && r.expectedCheckpoint !== 'new' || r.action === 'advance' && r.expectedCheckpoint === 'new') ctx.addIssue({ code: 'custom', message: 'Explicit write operation and checkpoint required' });
});
export type GroundRequest = z.infer<typeof groundRequestSchema>;
const count = z.number().int().nonnegative().safe(), position = z.tuple([z.number().finite(), z.number().finite()]);
const summarySchema = z.object({
  scope: z.literal(GROUND_SCOPE), cursorSimMs: count, sequence: count, arrivals: count,
  actors: z.array(z.object({ id: z.enum(['an', 'binh', 'chi']), position, status: groundStateSchema.shape.actors.element.shape.status, stepIndex: z.number().int().min(-1).max(7), planSha256: hash }).strict()).length(3),
  eligibleForReward: z.literal(false), eligibleForP2P: z.literal(false),
}).strict();
const arrivalSchema = z.object({
  authority: z.literal(GROUND_SCOPE), actorId: z.enum(['an', 'binh', 'chi']), planSha256: hash, sourceRevision: count,
  stepIndex: z.number().int().min(0).max(7), location: z.string().min(1).max(100), position,
  simMs: count, planObservedSimMs: count, geometrySha256: hash, eligibleForReward: z.literal(false), eligibleForP2P: z.literal(false),
}).strict();
const basisSchema = z.object({
  version: z.literal(1), sessionId: z.string().uuid(), operationId: z.string().uuid(), action: z.enum(['start', 'advance']),
  requestSha256: hash, previousCheckpoint: checkpoint, sourceWorldSha256: hash, sourceRevision: count, worldBorn: z.string().datetime({ offset: true }),
  nonce: z.string().uuid(), sequence: count.positive(), createdAt: z.string().datetime({ offset: true }), steps: count.max(600), backlogMs: count,
  arrivals: z.array(arrivalSchema).max(24), result: summarySchema,
}).strict();
const receiptSchema = z.object({ basis: basisSchema, checkpoint: hash }).strict();
type Receipt = z.infer<typeof receiptSchema>;
type StateRow = { data: string | null; checksum: string; updated_at: string };
type BatchRow = { data: string | null; checksum: string; sequence: number; operation_id: string; created_at: string };
const fail = (code: string): never => { throw new GroundTimelineError(code); };
const bounded = (raw: string | null) => { if (!raw || new TextEncoder().encode(raw).byteLength > GROUND_LIMITS.stateBytes) fail('ground-state-budget'); return raw!; };
async function readSession(db: D1Database, sessionId: string) {
  return db.prepare(`SELECT CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data,checksum,updated_at FROM ground_sessions WHERE id=?`).bind(GROUND_LIMITS.stateBytes, sessionId).first<StateRow>();
}
async function readBatch(db: D1Database, sessionId: string, operationId?: string, sequence?: number) {
  return db.prepare(`SELECT CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data,checksum,sequence,operation_id,created_at FROM ground_batches WHERE session_id=? AND ${operationId ? 'operation_id' : 'sequence'}=?`).bind(GROUND_LIMITS.stateBytes, sessionId, operationId ?? sequence!).first<BatchRow>();
}
async function validateBatch(row: BatchRow, sessionId: string): Promise<Receipt> {
  const receipt = receiptSchema.parse(JSON.parse(bounded(row.data))), b = receipt.basis;
  if (b.sessionId !== sessionId || b.operationId !== row.operation_id || b.sequence !== row.sequence || b.createdAt !== row.created_at || await groundHash(b) !== row.checksum || b.result.sequence !== b.sequence || b.arrivals.some(a => a.geometrySha256.length !== 64 || a.simMs > b.result.cursorSimMs || a.planObservedSimMs > a.simMs || a.sourceRevision > b.sourceRevision)) fail('ground-receipt-integrity');
  if (new Set(b.arrivals.map(a => `${a.actorId}:${a.planSha256}:${a.stepIndex}`)).size !== b.arrivals.length) fail('ground-receipt-integrity');
  return receipt;
}
async function validateSession(db: D1Database, sessionId: string, row: StateRow) {
  const state = await validateGroundState(JSON.parse(bounded(row.data)));
  if (state.sessionId !== sessionId || await groundHash(state) !== row.checksum || state.sequence < 1) fail('ground-checkpoint-integrity');
  const batch = await readBatch(db, sessionId, undefined, state.sequence);
  if (!batch) fail('ground-receipt-missing');
  const receipt = await validateBatch(batch!, sessionId);
  if (receipt.checkpoint !== row.checksum || batch!.checksum !== state.lastBatchDigest || receipt.basis.nonce !== state.nonce || receipt.basis.createdAt !== row.updated_at || JSON.stringify(receipt.basis.result) !== JSON.stringify(groundSummary(state))) fail('ground-receipt-integrity');
  return state;
}
async function sourceWorld(db: D1Database) {
  const row = await db.prepare(`SELECT revision,CASE WHEN length(CAST(data AS BLOB))<=? THEN data ELSE NULL END data FROM worlds WHERE id='home'`).bind(GROUND_LIMITS.worldBytes).first<{ revision: number; data: string | null }>();
  if (!row || !row.data || !Number.isSafeInteger(row.revision) || row.revision < 0) fail('ground-world-unavailable');
  return { revision: row!.revision, raw: row!.data!, world: JSON.parse(row!.data!) as World };
}

/** Injected server time for isolated tests only; HTTP callers cannot supply time, poses or paths. */
export async function runGroundAuthority(db: D1Database, input: GroundRequest, nowMs = Date.now()) {
  const request = groundRequestSchema.parse(input), row = await readSession(db, request.sessionId);
  const previous = row ? await validateSession(db, request.sessionId, row) : null;
  const head = row?.checksum ?? 'new';
  if (request.action === 'status') return { ok: true as const, mode: 'status' as const, exists: !!row, checkpoint: head, ...(previous ? { worldBorn: previous.worldBorn, ...groundSummary(previous) } : { scope: GROUND_SCOPE, eligibleForReward: false, eligibleForP2P: false }) };
  const requestSha256 = await groundHash(request);
  if (request.operationId) {
    const old = await readBatch(db, request.sessionId, request.operationId);
    if (old) {
      const receipt = await validateBatch(old, request.sessionId);
      if (receipt.basis.requestSha256 !== requestSha256) fail('ground-operation-reused');
      return { ok: true as const, mode: receipt.basis.action === 'start' ? 'started' as const : 'advanced' as const, duplicate: true, checkpoint: receipt.checkpoint, currentCheckpoint: head, worldBorn: receipt.basis.worldBorn, steps: receipt.basis.steps, backlogMs: receipt.basis.backlogMs, ...receipt.basis.result, batchArrivals: receipt.basis.arrivals };
    }
  }
  if (head !== request.expectedCheckpoint) fail('ground-checkpoint-conflict');
  if (request.action === 'start' && previous || request.action === 'advance' && !previous) fail('ground-session-state');
  const source = await sourceWorld(db);
  const transition = previous
    ? await advanceGroundTimeline(previous, source.world, source.revision, nowMs)
    : { state: await startGroundTimeline(source.world, source.revision, request.sessionId, nowMs), arrivals: [], steps: 0, backlogMs: 0, paused: source.world.paused };
  if (request.action === 'preview') return { ok: true as const, mode: 'preview' as const, checkpoint: head, exists: !!previous, worldBorn: transition.state.worldBorn, ...groundSummary(transition.state), steps: transition.steps, backlogMs: transition.backlogMs, paused: transition.paused, batchArrivals: transition.arrivals };
  if (transition.paused) fail('ground-world-paused');
  if (previous && await groundHash(transition.state) === head) return { ok: true as const, mode: 'advanced' as const, duplicate: false, noop: true, checkpoint: head, worldBorn: previous.worldBorn, steps: 0, backlogMs: transition.backlogMs, ...groundSummary(previous), batchArrivals: [] };
  const state: GroundState = transition.state;
  state.sequence = (previous?.sequence ?? 0) + 1; state.nonce = crypto.randomUUID();
  const basis = basisSchema.parse({ version: 1, sessionId: request.sessionId, operationId: request.operationId, action: request.action, requestSha256, previousCheckpoint: head,
    sourceWorldSha256: await groundHash(source.world), sourceRevision: source.revision, worldBorn: state.worldBorn, nonce: state.nonce, sequence: state.sequence,
    createdAt: new Date(nowMs).toISOString(), steps: transition.steps, backlogMs: transition.backlogMs, arrivals: transition.arrivals, result: groundSummary(state) });
  state.lastBatchDigest = await groundHash(basis);
  const nextHead = await groundHash(state), nextRaw = JSON.stringify(state), receiptRaw = JSON.stringify({ basis, checkpoint: nextHead });
  bounded(nextRaw); bounded(receiptRaw);
  const worldGuard = `EXISTS(SELECT 1 FROM worlds WHERE id='home' AND revision=? AND data=?)`;
  const stateGuard = `EXISTS(SELECT 1 FROM ground_sessions WHERE id=? AND data=? AND checksum=? AND updated_at=?)`;
  const nextArgs = [request.sessionId, nextRaw, nextHead, basis.createdAt];
  const mutation = previous
    ? db.prepare(`UPDATE ground_sessions SET data=?,checksum=?,updated_at=? WHERE id=? AND data=? AND checksum=? AND updated_at=? AND ${worldGuard}`).bind(nextRaw, nextHead, basis.createdAt, request.sessionId, row!.data, head, row!.updated_at, source.revision, source.raw)
    : db.prepare(`INSERT INTO ground_sessions(id,data,checksum,updated_at) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM ground_sessions WHERE id=?) AND ${worldGuard}`).bind(...nextArgs, request.sessionId, source.revision, source.raw);
  const id = `${request.sessionId}:${request.operationId}`;
  try {
    await db.batch([
      mutation,
      db.prepare(`INSERT INTO ground_batches(id,session_id,operation_id,sequence,data,checksum,created_at) SELECT ?,?,?,?,CASE WHEN ${stateGuard} AND ${worldGuard} THEN ? ELSE NULL END,?,?`).bind(id, request.sessionId, request.operationId!, state.sequence, ...nextArgs, source.revision, source.raw, receiptRaw, state.lastBatchDigest, basis.createdAt),
      // A pure SELECT assertion also catches a trigger silently ignoring the receipt INSERT.
      db.prepare(`SELECT json(CASE WHEN ${stateGuard} AND ${worldGuard} AND EXISTS(SELECT 1 FROM ground_batches WHERE id=? AND session_id=? AND sequence=? AND data=? AND checksum=?) THEN 'true' ELSE 'invalid-ground-postcondition' END) verified`).bind(...nextArgs, source.revision, source.raw, id, request.sessionId, state.sequence, receiptRaw, state.lastBatchDigest),
    ]);
  } catch (error) {
    const old = await readBatch(db, request.sessionId, request.operationId);
    if (old) {
      const committed = await validateBatch(old, request.sessionId);
      if (committed.basis.requestSha256 === requestSha256) return { ok: true as const, mode: request.action === 'start' ? 'started' as const : 'advanced' as const, duplicate: true, checkpoint: committed.checkpoint, worldBorn: committed.basis.worldBorn, steps: committed.basis.steps, backlogMs: committed.basis.backlogMs, ...committed.basis.result, batchArrivals: committed.basis.arrivals };
      fail('ground-operation-reused');
    }
    const after = await readSession(db, request.sessionId);
    if ((after?.checksum ?? 'new') !== head) fail('ground-checkpoint-conflict');
    const current = await sourceWorld(db);
    if (current.revision !== source.revision || current.raw !== source.raw) fail('ground-source-conflict');
    throw error;
  }
  return { ok: true as const, mode: request.action === 'start' ? 'started' as const : 'advanced' as const, duplicate: false, checkpoint: nextHead, worldBorn: state.worldBorn, steps: basis.steps, backlogMs: basis.backlogMs, ...basis.result, batchArrivals: basis.arrivals };
}
