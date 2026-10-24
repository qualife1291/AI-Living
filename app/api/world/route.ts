import { readWorld, database, json, validOrigin } from '@/lib/store';
import { selectActiveContexts } from '@/lib/training';
import { worldTime, weatherAt, type WeatherKind } from '@/lib/clock';

export const dynamic = 'force-dynamic';

type WorldPostBody = {
  revision?: number;
  paused?: boolean;
  schedule?: string;
  speedScale?: number;
  weatherOverride?: WeatherKind | null;
};

export async function GET() {
  const data = await readWorld();
  const nowMs = Date.parse(data.serverNow);
  const wt = worldTime(data.world, nowMs);
  const weather = weatherAt(
    data.world.born || 'xom-ai',
    wt,
    data.world.clock?.weatherOverride,
  );
  const activeContexts = selectActiveContexts(data.world, nowMs, 2);

  return json({
    ...data,
    worldTime: wt,
    weatherState: weather,
    activeContexts,
  });
}

export async function POST(req: Request) {
  if (!validOrigin(req)) {
    return json({ error: 'Origin không hợp lệ' }, 403);
  }

  let body: WorldPostBody;
  try {
    body = (await req.json()) as WorldPostBody;
  } catch {
    return json({ error: 'JSON không hợp lệ' }, 400);
  }

  const current = await readWorld();
  if (body.revision !== current.revision) {
    return json({ error: 'Trạng thái vừa thay đổi. Hãy thử lại.' }, 409);
  }

  const hasPaused = typeof body.paused === 'boolean';
  const hasSchedule = typeof body.schedule === 'string';
  const hasSpeed = typeof body.speedScale === 'number';
  const hasWeather = body.weatherOverride !== undefined;

  if (!hasPaused && !hasSchedule && !hasSpeed && !hasWeather) {
    return json({ error: 'Thiếu thao tác' }, 400);
  }

  const c = current.world.clock ?? { pausedAt: null, pausedMs: 0 };

  if (hasPaused) {
    if (body.paused && !current.world.paused) {
      c.pausedAt = Date.now();
    }
    if (!body.paused && current.world.paused) {
      if (c.pausedAt) {
        c.pausedMs += Date.now() - c.pausedAt;
      }
      c.pausedAt = null;
    }
    current.world.paused = Boolean(body.paused);
  }

  if (hasSpeed && typeof body.speedScale === 'number') {
    c.scale = Math.max(1, Math.min(60, body.speedScale));
  }

  if (hasWeather) {
    c.weatherOverride = body.weatherOverride ?? null;
  }

  current.world.clock = c;

  if (hasSchedule && typeof body.schedule === 'string') {
    current.world.schedule = body.schedule.slice(0, 150);
  }

  const result = await database()
    .prepare(
      'UPDATE worlds SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
    )
    .bind(JSON.stringify(current.world), 'home', current.revision)
    .run();

  return result.meta.changes
    ? json({ ok: true })
    : json({ error: 'Xung đột cập nhật' }, 409);
}
