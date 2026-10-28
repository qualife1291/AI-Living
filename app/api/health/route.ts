import { readWorld, database, json } from "@/lib/store";
import { worldTime, weatherAt } from "@/lib/clock";

export const dynamic = "force-dynamic";

type TickRunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  model: string | null;
  event_id: string | null;
  neurons_est: number | null;
};

export async function GET() {
  try { return await health(); }
  catch { return json({ ok: false, database: "unavailable", error: "Không đọc được trạng thái cơ sở dữ liệu." }, 503); }
}
async function health() {
  const { world, revision, serverNow, events } = await readWorld();
  const nowMs = Date.parse(serverNow);
  const wt = worldTime(world, nowMs);
  const weather = weatherAt(
    world.born || "xom-ai",
    wt,
    world.clock?.weatherOverride,
  );

  let lastTick: TickRunRow | null = null;
  let databaseReady = true;
  try {
    const db = database();
    const checks = await db.batch([
      ...['context_cache','living_turns','agent_experiences','site_metrics','visitor_exchanges','client_logs','memory_backfill_jobs','memory_backfill_batches']
        .map(table => db.prepare(`SELECT id FROM ${table} LIMIT 1`)),
      db.prepare("SELECT id, started_at, finished_at, status, model, event_id, neurons_est FROM tick_runs ORDER BY started_at DESC LIMIT 1"),
    ]);
    lastTick = (checks.at(-1)?.results[0] as TickRunRow | undefined) ?? null;
  } catch {
    // Table tick_runs may not be migrated yet on older local databases
    databaseReady = false;
    lastTick = null;
  }

  return json({
    ok: databaseReady,
    database: databaseReady ? "ready" : "schema_or_query_error",
    serverNow,
    revision,
    paused: world.paused,
    lastAI: world.lastAI,
    episodeCountRecent: events.length,
    worldTime: wt,
    weather,
    weatherSource:
      "simulation (diagnostic clock); use /api/world realContext for observed HCMC data",
    lastTick,
    liveness: { lastTurnAt: world.living?.lastTickAt ?? null, hasPersistedLiving: !!world.living, stale: !world.living || nowMs-Date.parse(world.living.lastTickAt)>75*60000 },
    learning: {
      agents: Object.keys(world.living?.learning ?? {}).length,
      samples: Object.values(world.living?.learning ?? {}).reduce(
        (sum, agent) => sum + agent.samples,
        0,
      ),
      animalPolicies: Object.keys(world.living?.animalLearning ?? {}).length,
      animalSamples: Object.values(world.living?.animalLearning ?? {}).reduce(
        (sum, agent) => sum + agent.samples,
        0,
      ),
    },
  }, databaseReady ? 200 : 503);
}
