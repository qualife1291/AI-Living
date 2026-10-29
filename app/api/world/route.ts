import { realContext, observedWeather } from "@/lib/living/realtime";
import { contextCache, fetchContext } from "@/lib/living/service";
import { initializeLiving } from "@/lib/living/engine";
import { z } from "zod";
import { readWorld, database, json, validOrigin } from "@/lib/store";
import { selectActiveContexts } from "@/lib/training";
import { worldTime, weatherAt, updateClock } from "@/lib/clock";
import {env} from 'cloudflare:workers';
import {readSharedGround} from '@/lib/living/shared-ground-store';

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

export async function GET(req: Request) {
  if(new URL(req.url).searchParams.get('ground')==='shared'){
    if((env as unknown as Record<string,string>).XOM_LOCAL_ADMIN!=='true'||!['localhost','127.0.0.1','[::1]'].includes(new URL(req.url).hostname)||!validOrigin(req))return json({error:'Timeline chung chỉ dành cho owner local.'},403);
    try{
      const shared=await readSharedGround(database());if(!shared)return json({error:'Chưa khởi tạo timeline chung.'},409);
      const revision=await database().prepare("SELECT revision FROM worlds WHERE id='home'").first<{revision:number}>();
      const wt=worldTime(shared.world,0);
      return json({revision:revision?.revision??shared.view.sourceRevision,serverNow:new Date().toISOString(),world:shared.world,events:[],worldTime:wt,weatherState:weatherAt(shared.world.born,wt,shared.world.clock?.weatherOverride),sharedGround:shared.view,...(shared.authorityView?{sharedAuthority:shared.authorityView}:{})});
    }catch{return json({error:'Timeline chung chưa sẵn sàng.'},503);}
  }
  const data = await readWorld({eventLimit: new URL(req.url).searchParams.get("compact") === "1" ? 8 : 80});
  const nowMs = Date.parse(data.serverNow);
  const wt = worldTime(data.world, nowMs);
  const context = await realContext(nowMs, contextCache(), fetchContext, true);
  data.world.realContext = context;
  data.world.living ??= initializeLiving(nowMs);
  const weather =
    (!data.world.clock?.weatherOverride && observedWeather(context)) ||
    weatherAt(
      data.world.born || "xom-ai",
      wt,
      data.world.clock?.weatherOverride,
    );
  if (data.world.clock?.weatherOverride) weather.label += " · thử nghiệm";
  else if (context.weather.status !== "fresh") weather.label += " · mô phỏng";
  const activeContexts = selectActiveContexts(data.world, nowMs, 2,{weather:weather.kind,context});

  return json({
    ...data,
    worldTime: wt,
    weatherState: weather,
    activeContexts,
    realContext: context,
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
