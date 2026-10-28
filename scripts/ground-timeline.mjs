/** Explicit loopback client; never accepts poses/time, auto-starts or retries a write. */
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { GROUND_SCOPE } from '../lib/living/ground-timeline.ts';
import { groundRequestSchema } from '../lib/living/ground-store.ts';
const hash = z.string().regex(/^[a-f0-9]{64}$/), head = z.union([z.literal('new'), hash]);
const count = z.number().int().nonnegative().safe();
const point = z.tuple([z.number().finite().min(-5000).max(5000), z.number().finite().min(-5000).max(5000)]);
const actor = z.enum(['an', 'binh', 'chi']);
const replySchema = z.object({
  ok: z.literal(true), mode: z.enum(['status', 'preview', 'started', 'advanced']), scope: z.literal(GROUND_SCOPE),
  checkpoint: head, currentCheckpoint: head.optional(), exists: z.boolean().optional(), duplicate: z.boolean().optional(), noop: z.boolean().optional(),
  worldBorn: z.string().datetime({ offset: true }).optional(), cursorSimMs: count.optional(), sequence: count.optional(), arrivals: count.optional(),
  eligibleForReward: z.literal(false), eligibleForP2P: z.literal(false), steps: count.max(600).optional(), backlogMs: count.optional(), paused: z.boolean().optional(),
  actors: z.array(z.object({ id: actor, position: point, status: z.enum(['baseline', 'idle', 'walking', 'arrived', 'expired', 'unsupported', 'unreachable', 'blocked']), stepIndex: z.number().int().min(-1).max(7), planSha256: hash }).strict()).length(3).optional(),
  batchArrivals: z.array(z.object({ authority: z.literal(GROUND_SCOPE), actorId: actor, planSha256: hash, sourceRevision: count, stepIndex: count.max(7), location: z.string().min(1).max(100), position: point, simMs: count, planObservedSimMs: count, geometrySha256: hash, eligibleForReward: z.literal(false), eligibleForP2P: z.literal(false) }).strict()).max(24).optional(),
}).strict();
export async function groundTimelineCommand(options, send = fetch) {
  const origin = new URL(options.origin ?? process.env.XOM_ORIGIN ?? 'http://127.0.0.1:5173');
  if (!['http:', 'https:'].includes(origin.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw Error('loopback-origin-required');
  const input = groundRequestSchema.parse({ sessionId: options.sessionId, action: options.action ?? 'status', expectedCheckpoint: options.expectedCheckpoint ?? 'new', ...(options.operationId ? { operationId: options.operationId } : {}) });
  const response = await send(new URL('/api/living/ground', origin), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('ground-request-failed');
  const reader = response.body?.getReader(); const chunks = []; let size = 0;
  if (reader) for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 32768) { await reader.cancel(); throw Error('ground-response-budget'); } chunks.push(value); }
  const value = replySchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))));
  const mode = { status: 'status', preview: 'preview', start: 'started', advance: 'advanced' }[input.action];
  if (value.mode !== mode || value.actors && value.actors.map(a => a.id).join(',') !== 'an,binh,chi' ||
      (value.mode !== 'status' || value.exists) && (!value.actors || value.worldBorn === undefined || value.cursorSimMs === undefined || value.sequence === undefined || value.arrivals === undefined) ||
      ['started', 'advanced'].includes(value.mode) && (!hash.safeParse(value.checkpoint).success || value.sequence < 1 || value.duplicate === undefined || !value.batchArrivals)) throw Error('unconfirmed-ground-response');
  return value;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { origin: { type: 'string' }, session: { type: 'string' }, action: { type: 'string', default: 'status' }, 'expected-checkpoint': { type: 'string', default: 'new' }, operation: { type: 'string' } }, strict: true, allowPositionals: false });
    console.log(JSON.stringify(await groundTimelineCommand({ origin: values.origin, sessionId: values.session, action: values.action, expectedCheckpoint: values['expected-checkpoint'], operationId: values.operation })));
  } catch { console.error('Local ground timeline failed or ACK was not confirmed. Inspect status/checkpoint before retrying; no automatic retry.'); process.exitCode = 1; }
}
