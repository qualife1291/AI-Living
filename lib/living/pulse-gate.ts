// Shared D1 admission, independent of Worker isolates or the number of open tabs.
// This cache entry is disposable coordination data, never simulation history.
export const PULSE_GATE_KEY = 'internal:living-pulse:v1';
export const PULSE_COOLDOWN_MS = 9_000;
export const PULSE_LEASE_MS = 30_000;

type PulseResult = { status: number; data: Record<string, unknown> };
const pausedResult = (): PulseResult => ({ status: 409, data: { error: 'Xóm đang tạm nghỉ' } });
const coalescedResult = (): PulseResult => ({ status: 200, data: { ok: true, coalesced: true } });

async function inspect(db: D1Database) {
  // SQLite inspects the flag without transferring/parsing the world or policies
  // in JS. A paused world must still return 409 during an active cooldown.
  return db.prepare(`SELECT
    EXISTS(SELECT 1 FROM worlds WHERE id='home' AND json_extract(data,'$.paused')=1) AS paused,
    COALESCE((SELECT expires_at FROM context_cache WHERE id=?),0) AS expiresAt`)
    .bind(PULSE_GATE_KEY).first<{ paused: number; expiresAt: number }>();
}

/** Coalesced means a pulse is already running/recent, not that its work completed.
 * Existing world/policy CAS remains the correctness boundary, including the
 * daemon and explicit tick/learning endpoints which do not use this gate.
 */
export async function runCoalescedPulse(
  db: D1Database,
  pipeline: () => Promise<PulseResult>,
  now = Date.now(),
  nonce = crypto.randomUUID(),
): Promise<PulseResult> {
  const state = await inspect(db);
  if (state?.paused) return pausedResult();
  if (state && state.expiresAt > now) return coalescedResult();

  const lease = await db.prepare(`INSERT INTO context_cache(id,data,expires_at)
    SELECT ?,?,? WHERE NOT EXISTS(
      SELECT 1 FROM worlds WHERE id='home' AND json_extract(data,'$.paused')=1)
    ON CONFLICT(id) DO UPDATE SET data=excluded.data,expires_at=excluded.expires_at
    WHERE context_cache.expires_at<=?`)
    .bind(PULSE_GATE_KEY, JSON.stringify({ nonce }), now + PULSE_LEASE_MS, now).run();
  if (!lease.meta.changes) {
    return (await inspect(db))?.paused ? pausedResult() : coalescedResult();
  }

  let succeeded = false;
  try {
    const result = await pipeline();
    succeeded = result.status === 200;
    return result;
  } finally {
    // Cooldown is relative to admission, so a 10s client timer isn't slowed to
    // every other tick. Failure is retryable immediately. An expired worker
    // cannot release/shorten a newer worker's lease (nonce ownership).
    await db.prepare(`UPDATE context_cache SET expires_at=?
      WHERE id=? AND json_extract(data,'$.nonce')=?`)
      .bind(succeeded ? now + PULSE_COOLDOWN_MS : 0, PULSE_GATE_KEY, nonce).run();
  }
}
