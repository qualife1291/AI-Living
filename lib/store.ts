import { env } from 'cloudflare:workers';
import { seed, type World, type EpisodeEvent } from './world';
import { hydratePolicies, PolicyRevisionConflict } from './living/policy-store';

type EpisodeRow = {
  id: string;
  created_at: string;
  source: string;
  data: string;
};

export function database() {
  return env.DB!;
}

/**
 * Reads the current world snapshot and latest 80 episodes.
 * Fixes L5: Only runs seed INSERT or 1970 epoch repair when needed instead of every read.
 * Fixes L7: Returns `serverNow` so clients can align their simulation clock.
 */
export async function readWorld(options: {eventLimit?: number; includePolicies?: boolean} = {}, policyRetry = true): Promise<{
  revision: number;
  serverNow: string;
  world: World;
  events: EpisodeEvent[];
}> {
  const db = database();
  let row = await db
    .prepare('SELECT revision, data FROM worlds WHERE id = ?')
    .bind('home')
    .first<{ revision: number; data: string }>();

  const nowIso = new Date().toISOString();

  if (!row) {
    await db
      .prepare('INSERT OR IGNORE INTO worlds (id, revision, data) VALUES (?, ?, ?)')
      .bind('home', 0, JSON.stringify({ ...seed, born: nowIso }))
      .run();
    row = await db
      .prepare('SELECT revision, data FROM worlds WHERE id = ?')
      .bind('home')
      .first<{ revision: number; data: string }>();
  }

  let world = JSON.parse(row!.data) as World;
  if (!world.born || world.born === '1970-01-01T00:00:00.000Z') {
    world = { ...world, born: nowIso };
    await db
      .prepare("UPDATE worlds SET data = json_set(data, '$.born', ?) WHERE id = ?")
      .bind(nowIso, 'home')
      .run();
  }

  const eventsQuery = await db
    .prepare(
      'SELECT id, created_at, source, data FROM episodes ORDER BY created_at DESC LIMIT ?',
    )
    .bind(Math.max(1, Math.min(80, options.eventLimit ?? 80)))
    .all<EpisodeRow>();

  const events: EpisodeEvent[] = (eventsQuery.results ?? []).map((e) => {
    const parsed = JSON.parse(e.data) as Omit<
      EpisodeEvent,
      'id' | 'createdAt' | 'source'
    >;
    return {
      id: e.id,
      createdAt: e.created_at,
      source: e.source,
      ...parsed,
    };
  });

  if (options.includePolicies) {
    try { await hydratePolicies(db, world, row!.revision); }
    catch (error) {
      if (error instanceof PolicyRevisionConflict && policyRetry) return readWorld(options, false);
      throw error;
    }
  }

  return {
    revision: row!.revision,
    serverNow: nowIso,
    world,
    events,
  };
}

export const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export function validOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return !origin || origin === new URL(req.url).origin;
}
