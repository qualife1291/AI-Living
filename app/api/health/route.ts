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
  const { world, revision, serverNow, events } = await readWorld();
  const nowMs = Date.parse(serverNow);
  const wt = worldTime(world, nowMs);
  const weather = weatherAt(
    world.born || "xom-ai",
    wt,
    world.clock?.weatherOverride,
  );

  let lastTick: TickRunRow | null = null;
  try {
    lastTick = await database()
      .prepare(
        "SELECT id, started_at, finished_at, status, model, event_id, neurons_est FROM tick_runs ORDER BY started_at DESC LIMIT 1",
      )
      .first<TickRunRow>();
  } catch {
    // Table tick_runs may not be migrated yet on older local databases
    lastTick = null;
  }

  return json({
    ok: true,
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
  });
}
