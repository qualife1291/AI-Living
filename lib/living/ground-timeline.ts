/** Independent local static-core simulation. Never authorizes rewards or shared-world encounters. */
import { z } from 'zod';
import { computeSimMs } from '../clock.ts';
import { places, distance, type Point } from '../life.ts';
import { RESIDENT_IDS, stepSchema } from '../event-schema.ts';
import { WALK_RADIUS, groundObstacles, bodyWalkable, bodySegmentWalkable, nearestBodyPoint } from '../city/walk-ground.ts';
import { computeWalkPath } from '../city/walk-path.ts';
import type { World } from '../world';

export const GROUND_SCOPE = 'server-ground-core-static-v1';
export const GROUND_LIMITS = Object.freeze({ requestBytes: 2048, worldBytes: 2097152, stateBytes: 131072, actors: 3, planSteps: 8, pathPoints: 512, fixedStepMs: 100, stepsPerBatch: 600, walkSpeed: 16, arrivalsPerBatch: 24 });
const n = z.number().finite(), sim = n.int().nonnegative().safe(), hash = z.string().regex(/^[a-f0-9]{64}$/);
const point = z.tuple([n.min(-5000).max(5000), n.min(-5000).max(5000)]);
export class GroundTimelineError extends Error {
  status: number;
  constructor(code: string, status = 409) { super(code); this.status = status; }
}
const fail = (code: string): never => { throw new GroundTimelineError(code); };
function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable((value as Record<string, unknown>)[k])).join(',') + '}';
}
export async function groundHash(value: unknown) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stable(value)));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const planSchema = z.object({
  createdAt: z.string().datetime({ offset: true }), pausedMs: sim, from: z.string().max(100), originPath: z.array(point).max(512).optional(),
  transport: z.enum(['walk', 'bicycle', 'motorbike', 'bus', 'metro']).optional(), simStartedAt: sim,
  generator: z.enum(['rules', 'local-llm']).optional(), steps: z.array(stepSchema.strict()).min(1).max(8),
}).strict();
const walkerSchema = z.object({
  id: z.enum(RESIDENT_IDS), position: point, baselinePlanSha256: hash, planSha256: hash,
  observedSimMs: sim, sourceRevision: sim, plan: planSchema.nullable(),
  status: z.enum(['baseline', 'idle', 'walking', 'arrived', 'expired', 'unsupported', 'unreachable', 'blocked']),
  stepIndex: z.number().int().min(-1).max(7), path: z.array(point).max(512), next: sim.max(512), goal: point.nullable(),
  arrivedSteps: z.array(z.number().int().min(0).max(7)).max(8),
}).strict();
export const groundStateSchema = z.object({
  version: z.literal(1), scope: z.literal(GROUND_SCOPE), sessionId: z.string().uuid(), worldBorn: z.string().datetime({ offset: true }),
  geometrySha256: hash, cursorSimMs: sim, startedSimMs: sim, observedServerSimMs: sim,
  sequence: sim, sourceRevision: sim, actors: z.array(walkerSchema).length(3),
  arrivals: sim, lastBatchDigest: hash.nullable(), nonce: z.string().uuid(),
}).strict();
export type GroundState = z.infer<typeof groundStateSchema>;
type Walker = GroundState['actors'][number];
export type GroundArrival = {
  authority: typeof GROUND_SCOPE; actorId: string; planSha256: string; sourceRevision: number; stepIndex: number;
  location: string; position: Point; simMs: number; planObservedSimMs: number; geometrySha256: string;
  eligibleForReward: false; eligibleForP2P: false;
};
let geometryDigest: Promise<string> | undefined;
export function groundGeometrySha256() {
  return geometryDigest ??= groundHash({ version: 'static-core-fixed-step-v1', limits: GROUND_LIMITS, radius: WALK_RADIUS, footprints: groundObstacles });
}
const clearance = WALK_RADIUS * 2 + 0.35;
const samePoint = (a: Point, b: Point) => distance(a, b) < 1e-7;
function goalFor(id: Walker['id'], location: string): Point {
  const base = places[location], index = RESIDENT_IDS.indexOf(id);
  return nearestBodyPoint([base[0] + (index - 1) * (clearance + 1), base[1] + index * 2], WALK_RADIUS);
}

export function serverGroundTime(world: World, nowMs: number) {
  if (!Number.isFinite(Date.parse(world.born)) || !Number.isFinite(nowMs)) fail('invalid-world-clock');
  const clock = world.clock;
  if (clock && (!Number.isFinite(clock.pausedMs) || clock.pausedMs < 0 || clock.scale !== undefined && (!Number.isFinite(clock.scale) || clock.scale <= 0 || clock.scale > 60) ||
    clock.pausedAt !== null && !Number.isFinite(clock.pausedAt) || clock.anchors?.some(a => ![a.realMs, a.simMs, a.scale].every(Number.isFinite) || a.simMs < 0 || a.scale <= 0 || a.scale > 60))) fail('invalid-world-clock');
  const time = Math.floor(computeSimMs(world.born, world.clock, nowMs) / GROUND_LIMITS.fixedStepMs) * GROUND_LIMITS.fixedStepMs;
  if (!Number.isSafeInteger(time) || time < 0) fail('invalid-world-clock');
  return time;
}
function people(world: World) {
  if (!Array.isArray(world.people)) return fail('invalid-core-roster');
  return RESIDENT_IDS.map(id => {
    const rows = world.people.filter(p => p.id === id);
    if (rows.length !== 1 || !places[rows[0].location]) fail('invalid-core-roster');
    return rows[0];
  });
}
function seedPoint(location: string, reserved: Point[]): Point {
  const center = nearestBodyPoint(places[location], WALK_RADIUS);
  for (let ring = 0; ring <= 20; ring++) for (let i = 0; i < (ring ? 24 : 1); i++) {
    const angle = i / 24 * Math.PI * 2;
    const p: Point = [center[0] + Math.cos(angle) * ring * clearance, center[1] + Math.sin(angle) * ring * clearance];
    if (bodyWalkable(p, WALK_RADIUS) && reserved.every(other => distance(p, other) >= clearance)) return p;
  }
  return fail('bootstrap-position-unavailable');
}
export async function startGroundTimeline(world: World, revision: number, sessionId: string, nowMs: number): Promise<GroundState> {
  const time = serverGroundTime(world, nowMs), reserved: Point[] = [], actors: Walker[] = [];
  for (const p of people(world)) {
    const position = seedPoint(p.location, reserved); reserved.push(position);
    const baselinePlanSha256 = await groundHash(p.plan ?? null);
    actors.push({ id: p.id as Walker['id'], position, baselinePlanSha256, planSha256: baselinePlanSha256, observedSimMs: time, sourceRevision: revision, plan: null, status: 'baseline', stepIndex: -1, path: [], next: 0, goal: null, arrivedSteps: [] });
  }
  return groundStateSchema.parse({ version: 1, scope: GROUND_SCOPE, sessionId, worldBorn: world.born, geometrySha256: await groundGeometrySha256(), cursorSimMs: time, startedSimMs: time, observedServerSimMs: time, sequence: 0, sourceRevision: revision, actors, arrivals: 0, lastBatchDigest: null, nonce: crypto.randomUUID() });
}
export async function validateGroundState(value: unknown): Promise<GroundState> {
  const s = groundStateSchema.parse(value);
  if (s.geometrySha256 !== await groundGeometrySha256()) fail('geometry-version-mismatch');
  if (s.actors.map(a => a.id).join(',') !== RESIDENT_IDS.join(',') || s.cursorSimMs < s.startedSimMs || s.observedServerSimMs < s.cursorSimMs || s.cursorSimMs % 100 || s.startedSimMs % 100) fail('invalid-ground-state');
  for (let i = 0; i < s.actors.length; i++) {
    const a = s.actors[i];
    if (!bodyWalkable(a.position, WALK_RADIUS) || s.actors.slice(0, i).some(b => distance(a.position, b.position) < clearance - 1e-7)) fail('invalid-ground-position');
    if (a.observedSimMs < s.startedSimMs || a.observedSimMs > s.observedServerSimMs || a.sourceRevision > s.sourceRevision || a.next > a.path.length || new Set(a.arrivedSteps).size !== a.arrivedSteps.length) fail('invalid-ground-state');
    if (a.plan && await groundHash(a.plan) !== a.planSha256) fail('plan-state-sha');
    if (a.path.length && (!a.goal || !a.plan || a.stepIndex < 0 || !samePoint(a.goal, goalFor(a.id, a.plan.steps[a.stepIndex].location)) || !samePoint(a.path.at(-1)!, a.goal) || !a.path.every((p, j) => bodyWalkable(p, WALK_RADIUS) && (!j || bodySegmentWalkable(a.path[j - 1], p, WALK_RADIUS))))) fail('invalid-ground-route');
  }
  return s;
}
function stepAt(plan: NonNullable<Walker['plan']>, time: number) {
  let start = plan.simStartedAt;
  for (let index = 0; index < plan.steps.length; index++) { const end = start + plan.steps[index].duration * 1000; if (time < end) return time < start ? null : { index, start, end, step: plan.steps[index] }; start = end; }
  return null;
}
/** Exact closest approach of both moving discs over the same fixed interval. */
function peerClear(a: Point, b: Point, peerStart: Point, peerEnd: Point) {
  const x = a[0] - peerStart[0], z = a[1] - peerStart[1];
  const dx = b[0] - a[0] - peerEnd[0] + peerStart[0], dz = b[1] - a[1] - peerEnd[1] + peerStart[1], den = dx * dx + dz * dz;
  const t = den ? Math.max(0, Math.min(1, -(x * dx + z * dz) / den)) : 0;
  return Math.hypot(x + t * dx, z + t * dz) >= clearance - 1e-7;
}
function prepareRoute(a: Walker, goal: Point) {
  const path = computeWalkPath(a.position, goal);
  // Navigation may project endpoints for presentation; authority must never teleport them.
  if (path.length > GROUND_LIMITS.pathPoints || !path.length || !samePoint(path[0], a.position) || !samePoint(path.at(-1)!, goal) || !path.every((p, i) => bodyWalkable(p, WALK_RADIUS) && (!i || bodySegmentWalkable(path[i - 1], p, WALK_RADIUS)))) {
    a.path = []; a.next = 0; a.status = 'unreachable'; return;
  }
  a.path = path; a.next = path.length > 1 ? 1 : 0;
}
export async function advanceGroundTimeline(previous: GroundState, world: World, revision: number, nowMs: number) {
  const s = await validateGroundState(previous), time = serverGroundTime(world, nowMs);
  if (world.born !== s.worldBorn) fail('world-identity-mismatch');
  if (time < s.observedServerSimMs || revision < s.sourceRevision) fail('clock-or-revision-rewind');
  if (world.paused) return { state: s, arrivals: [] as GroundArrival[], steps: 0, paused: true, backlogMs: time - s.cursorSimMs };
  const roster = people(world);
  s.sourceRevision = revision; s.observedServerSimMs = time;
  for (let i = 0; i < s.actors.length; i++) {
    const a = s.actors[i], rawPlan = roster[i].plan, sha = await groundHash(rawPlan ?? null);
    if (sha === a.planSha256) continue;
    a.planSha256 = sha; a.observedSimMs = time; a.sourceRevision = revision; a.plan = null; a.path = []; a.next = 0; a.goal = null; a.stepIndex = -1; a.arrivedSteps = [];
    const parsed = planSchema.safeParse(rawPlan);
    if (!parsed.success || rawPlan?.transport && rawPlan.transport !== 'walk' || rawPlan?.steps.some(step => ['cycle', 'tag', 'walk-pet', 'jump', 'run'].includes(step.kind))) { a.status = rawPlan ? 'unsupported' : 'idle'; continue; }
    // Baseline/reverted historical plans can never manufacture an arrival after bootstrap.
    if (sha === a.baselinePlanSha256 || parsed.data.simStartedAt < s.startedSimMs || parsed.data.simStartedAt + parsed.data.steps.reduce((sum, step) => sum + step.duration * 1000, 0) <= time) { a.status = 'expired'; continue; }
    a.plan = parsed.data; a.status = 'idle';
  }
  const arrivals: GroundArrival[] = [];
  const end = Math.min(time, s.cursorSimMs + GROUND_LIMITS.fixedStepMs * GROUND_LIMITS.stepsPerBatch);
  for (let at = s.cursorSimMs; at < end; at += GROUND_LIMITS.fixedStepMs) {
   const starts = new Map(s.actors.map(a => [a.id, [...a.position] as Point]));
   for (const a of s.actors) {
    if (!a.plan || at < a.observedSimMs) continue;
    const current = stepAt(a.plan, at);
    if (!current) { a.status = 'expired'; continue; }
    if (a.stepIndex !== current.index) {
      a.stepIndex = current.index; a.path = []; a.next = 0;
      // Each actor owns a deterministic disjoint slot at the declared venue, not an invented place.
      a.goal = goalFor(a.id, current.step.location);
      prepareRoute(a, a.goal);
    }
    if (a.arrivedSteps.includes(current.index) || a.status === 'unreachable') continue;
    let blocked = false;
    while (a.next < a.path.length && distance(a.position, a.path[a.next]) < 1e-8) a.next++;
    if (a.next < a.path.length) {
      const target = a.path[a.next], length = distance(a.position, target);
      const step = Math.min(GROUND_LIMITS.walkSpeed * GROUND_LIMITS.fixedStepMs / 1000, length), next: Point = [a.position[0] + (target[0] - a.position[0]) * step / length, a.position[1] + (target[1] - a.position[1]) * step / length];
      if (!bodySegmentWalkable(a.position, next, WALK_RADIUS) || s.actors.some(peer => peer.id !== a.id && !peerClear(a.position, next, starts.get(peer.id)!, peer.position))) blocked = true;
      else { a.position = next; if (step >= length - 1e-9) { a.position = [...target]; a.next++; } }
    }
    a.status = blocked ? 'blocked' : 'walking';
    if (a.goal && samePoint(a.position, a.goal) && at + GROUND_LIMITS.fixedStepMs <= current.end) {
      a.status = 'arrived'; a.arrivedSteps.push(current.index);
      arrivals.push({ authority: GROUND_SCOPE, actorId: a.id, planSha256: a.planSha256, sourceRevision: a.sourceRevision, stepIndex: current.index, location: current.step.location, position: [...a.position], simMs: at + GROUND_LIMITS.fixedStepMs, planObservedSimMs: a.observedSimMs, geometrySha256: s.geometrySha256, eligibleForReward: false, eligibleForP2P: false });
    }
   }
  }
  const steps = (end - s.cursorSimMs) / GROUND_LIMITS.fixedStepMs;
  s.cursorSimMs = end; s.arrivals += arrivals.length;
  if (arrivals.length > GROUND_LIMITS.arrivalsPerBatch) fail('arrival-budget');
  return { state: await validateGroundState(s), arrivals, steps, paused: false, backlogMs: time - end };
}

export function groundSummary(s: GroundState) {
  return { scope: GROUND_SCOPE, cursorSimMs: s.cursorSimMs, sequence: s.sequence, arrivals: s.arrivals,
    actors: s.actors.map(a => ({ id: a.id, position: a.position, status: a.status, stepIndex: a.stepIndex, planSha256: a.planSha256 })),
    eligibleForReward: false as const, eligibleForP2P: false as const };
}
