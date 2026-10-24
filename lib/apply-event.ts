import type { World } from './world';
import type { EventInput } from './event-schema';
import { resolveTransitionOrigin } from './life';

export type ApplyEventOutcome =
  | {
      ok: true;
      world: World;
      episodePayload: Record<string, unknown>;
      nowIso: string;
    }
  | {
      ok: false;
      status: 400 | 409;
      error: string;
    };

/**
 * Pure deterministic state transition for applying a validated EventInput to a World snapshot.
 * - Fixes L1: Resolves each actor's simulated position at `nowMs` (`resolveTransitionOrigin`)
 *   before mutating `p.location`, preventing instant teleports when a plan starts mid-routine.
 * - Fixes L2: Preserves `relationship`, `contextId`, and `revisionBefore/After` in `episodePayload`.
 */
export function applyEventToWorld(
  currentWorld: World,
  currentRevision: number,
  input: EventInput,
  nowMs = Date.now(),
): ApplyEventOutcome {
  if (currentWorld.paused) {
    return { ok: false, status: 409, error: 'Xóm đang tạm nghỉ' };
  }
  if (currentRevision !== input.revision) {
    return { ok: false, status: 409, error: 'Revision conflict' };
  }
  if (
    new Set(input.changes.map((c) => c.id)).size !== input.changes.length
  ) {
    return { ok: false, status: 400, error: 'Nhân vật bị lặp' };
  }

  const world: World = JSON.parse(JSON.stringify(currentWorld));
  const nowIso = new Date(nowMs).toISOString();

  for (const c of input.changes) {
    const p = world.people.find((person) => person.id === c.id);
    if (!p) {
      return { ok: false, status: 400, error: 'Nhân vật không hợp lệ' };
    }
    if (p.money + c.moneyDelta < 0) {
      return { ok: false, status: 400, error: 'Không đủ tiền mô phỏng' };
    }

    // Resolve simulated location BEFORE mutating p.location (Fixes L1)
    const transitionFrom = resolveTransitionOrigin(currentWorld, p.id, nowMs);

    p.money += c.moneyDelta;
    p.energy = Math.max(0, Math.min(100, p.energy + c.energyDelta));
    p.hunger = Math.max(0, Math.min(100, p.hunger + c.hungerDelta));
    p.skill = Math.min(100, p.skill + c.skillDelta);

    if (c.plan) {
      p.plan = {
        createdAt: nowIso,
        pausedMs: world.clock?.pausedMs ?? 0,
        from: transitionFrom,
        steps: c.plan,
      };
    }

    p.activity = c.activity;
    p.location = c.location;
    p.memories = [...p.memories, c.memory].slice(-60);
  }

  if (input.relationship) {
    const c = input.relationship;
    const r = world.relationships.find(
      (rel) =>
        (rel.a === c.a && rel.b === c.b) || (rel.a === c.b && rel.b === c.a),
    );
    if (!r) {
      return { ok: false, status: 400, error: 'Quan hệ không hợp lệ' };
    }
    r.trust = Math.max(0, Math.min(100, r.trust + c.delta));
    r.note = c.note;
  }

  if (input.source === 'ai') {
    world.lastAI = nowIso;
  }

  const episodePayload: Record<string, unknown> = {
    title: input.title,
    summary: input.summary,
    dialogue: input.dialogue,
    changes: input.changes,
    ...(input.relationship ? { relationship: input.relationship } : {}),
    ...(input.contextId ? { contextId: input.contextId } : {}),
    revisionBefore: currentRevision,
    revisionAfter: currentRevision + 1,
  };

  return {
    ok: true,
    world,
    episodePayload,
    nowIso,
  };
}
