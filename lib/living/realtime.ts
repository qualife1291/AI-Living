import { festivalFeedSchema, fetchFestivalMonth } from "./festivals.ts";
import { z } from "zod";
import type { RealContext } from "./schema.ts";
import { localDate } from "./engine.ts";

const weatherSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number().min(-20).max(60),
    relative_humidity_2m: z.number().min(0).max(100),
    precipitation: z.number().min(0).max(500),
    weather_code: z.number().int().min(0).max(99),
    wind_speed_10m: z.number().min(0).max(500),
  }),
});
const holidaySchema = z.array(
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    localName: z.string().max(200),
    global: z.boolean(),
    types: z.array(z.string()),
  }),
);
type CacheRow = { data: string; expires_at: number };
export type ContextCache = {
  read(key: string): Promise<CacheRow | null>;
  write(key: string, data: string, expiresAt: number): Promise<void>;
};
export const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=10.7769&longitude=106.7009&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FHo_Chi_Minh";
function safeJson(value: string): unknown { try { return JSON.parse(value); } catch { return null; } }
async function resource<T>(
  key: string,
  url: string,
  ttl: number,
  now: number,
  cache: ContextCache,
  schema: z.ZodType<T>,
  fetcher: typeof fetch,
) {
  const old = await cache.read(key);
  if (old && old.expires_at > now) {
    const parsed = schema.safeParse(safeJson(old.data));
    if (parsed.success) return { data: parsed.data, status: "fresh" as const };
  }
  try {
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(2500),
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("upstream HTTP " + response.status);
    const data = schema.parse(await response.json());
    await cache.write(key, JSON.stringify(data), now + ttl);
    return { data, status: "fresh" as const };
  } catch (error) {
    void error;
    if (old && now - old.expires_at < 86400000) {
      const parsed = schema.safeParse(safeJson(old.data));
      if (parsed.success)
        return { data: parsed.data, status: "stale" as const };
    }
    return { data: null, status: "unavailable" as const };
  }
}
export async function realContext(
  now: number,
  cache: ContextCache,
  fetcher: typeof fetch = fetchProviders,
): Promise<RealContext> {
  const date = localDate(now),
    vn = new Date(now + 7 * 3600000);
  const [weather, calendar, festivals] = await Promise.all([
    resource(
      "hcm-weather",
      WEATHER_URL,
      15 * 60000,
      now,
      cache,
      weatherSchema,
      fetcher,
    ),
    resource(
      `vn-holidays-${date.slice(0, 4)}`,
      `https://date.nager.at/api/v3/PublicHolidays/${date.slice(0, 4)}/VN`,
      86400000,
      now,
      cache,
      holidaySchema,
      fetcher,
    ),
    resource(
      `hcm-events-${date.slice(0, 7)}`,
      `https://visithcmc.vn/festivals-events/?year=${date.slice(0, 4)}&month=${Number(date.slice(5, 7))}`,
      6 * 3600000,
      now,
      cache,
      festivalFeedSchema,
      fetcher,
    ),
  ]);
  const current = weather.data?.current;
  const observedAt = current
    ? new Date(current.time + "+07:00").toISOString()
    : null;
  const age = observedAt ? now - Date.parse(observedAt) : Infinity;
  const status = !current
    ? "unavailable"
    : age > 90 * 60000 || age < -15 * 60000
      ? "stale"
      : weather.status;
  return {
    date,
    hour: vn.getUTCHours() + vn.getUTCMinutes() / 60,
    weekday: vn.getUTCDay(),
    timezone: "Asia/Ho_Chi_Minh",
    fetchedAt: new Date(now).toISOString(),
    weather: {
      status,
      source:
        "Open-Meteo · dữ liệu mô hình thời tiết cập nhật, không phải cảm biến tại nhà",
      observedAt,
      temperature: current?.temperature_2m ?? null,
      humidity: current?.relative_humidity_2m ?? null,
      precipitation: current?.precipitation ?? null,
      code: current?.weather_code ?? null,
      windKph: current?.wind_speed_10m ?? null,
    },
    calendar: {
      weekend: [0, 6].includes(vn.getUTCDay()),
      holidays:
        calendar.data
          ?.filter(
            (h) => h.date === date && h.global && h.types.includes("Public"),
          )
          .map((h) => h.localName) ?? [],
      source: "Nager.Date",
      status: calendar.status,
      coverage:
        "Chỉ ngày lễ do nguồn cung cấp; chưa đầy đủ Tết âm lịch, nghỉ bù và lịch riêng của từng nơi.",
    },
    traffic: {
      status: "unavailable",
      label: "Chưa kết nối nguồn giao thông TP.HCM trực tiếp",
    },
    festivals: {
      status: festivals.status,
      source: "VisitHCMC · Trung tâm Xúc tiến Du lịch TP.HCM",
      label: festivals.data
        ? festivals.data.items.length
          ? "Đã đọc lịch sự kiện VisitHCMC"
          : festivals.data.unparsed
            ? "Nguồn có mục chưa đọc được ngày"
            : "Lịch VisitHCMC chưa có sự kiện trong tháng này"
        : "Chưa đọc được lịch sự kiện VisitHCMC",
      items: festivals.data?.items ?? [],
      unparsed: festivals.data?.unparsed ?? 0,
    },
  };
}

export function observedWeather(
  context: RealContext,
): import("../clock").WeatherState | null {
  const w = context.weather;
  if (w.status !== "fresh" || w.code === null || w.temperature === null)
    return null;
  const kind =
    w.code >= 51
      ? "rain"
      : w.code === 45 || w.code === 48
        ? "fog"
        : w.code >= 2
          ? "cloudy"
          : (w.windKph ?? 0) > 25
            ? "windy"
            : "clear";
  return {
    kind,
    label:
      kind === "rain"
        ? "Mưa tại TP.HCM"
        : kind === "fog"
          ? "Có sương tại TP.HCM"
          : kind === "cloudy"
            ? "TP.HCM nhiều mây"
            : kind === "windy"
              ? "TP.HCM có gió"
              : "TP.HCM trời quang",
    intensity:
      kind === "rain" ? Math.min(1, 0.3 + (w.precipitation ?? 0) / 10) : 0.4,
    tempC: w.temperature,
  };
}

export function fetchProviders(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = new URL(String(input));
  if (url.hostname === "visithcmc.vn" && url.pathname === "/festivals-events/")
    return fetchFestivalMonth(
      Number(url.searchParams.get("year")),
      Number(url.searchParams.get("month")),
    ).then((data) => Response.json(data));
  return fetch(input, init);
}
