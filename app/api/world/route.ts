import { z } from "zod";
import { readWorld, database, json, validOrigin } from "@/lib/store";
import { selectActiveContexts } from "@/lib/training";
import { worldTime, weatherAt, updateClock } from "@/lib/clock";

export const dynamic = "force-dynamic";

const controlsSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    paused: z.boolean().optional(),
    schedule: z.string().max(150).optional(),
    speedScale: z.number().finite().min(1).max(60).optional(),
    weatherOverride: z
      .enum(["clear", "cloudy", "rain", "fog", "windy"])
      .nullable()
      .optional(),
  })
  .strict();

export async function GET() {
  const data = await readWorld();
  const nowMs = Date.parse(data.serverNow);
  const wt = worldTime(data.world, nowMs);
  const weather = weatherAt(
    data.world.born || "xom-ai",
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
    return json({ error: "Origin không hợp lệ" }, 403);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "JSON không hợp lệ" }, 400);
  }

  const parsed = controlsSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Điều khiển không hợp lệ" }, 400);
  const body = parsed.data;
  const current = await readWorld();
  if (body.revision !== current.revision) {
    return json({ error: "Trạng thái vừa thay đổi. Hãy thử lại." }, 409);
  }

  const hasPaused = typeof body.paused === "boolean";
  const hasSchedule = typeof body.schedule === "string";
  const hasSpeed = typeof body.speedScale === "number";
  const hasWeather = body.weatherOverride !== undefined;

  if (!hasPaused && !hasSchedule && !hasSpeed && !hasWeather) {
    return json({ error: "Thiếu thao tác" }, 400);
  }

  const c = updateClock(current.world, Date.now(), body);
  if (hasPaused) current.world.paused = body.paused!;

  if (hasWeather) {
    c.weatherOverride = body.weatherOverride ?? null;
  }

  current.world.clock = c;

  if (hasSchedule && typeof body.schedule === "string") {
    current.world.schedule = body.schedule.slice(0, 150);
  }

  const result = await database()
    .prepare(
      "UPDATE worlds SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?",
    )
    .bind(JSON.stringify(current.world), "home", current.revision)
    .run();

  return result.meta.changes
    ? json({ ok: true })
    : json({ error: "Xung đột cập nhật" }, 409);
}
