import { fetchFestivalMonth } from "../lib/living/festivals.ts";
// Local Miniflare cannot use the session HTTPS proxy itself. This bounded relay
// uses Node's supported env-proxy route and returns upstream JSON unchanged.
import { createServer } from "node:http";
import { WEATHER_URL } from "../lib/living/realtime.ts";
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1:8091");
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
    return;
  }
  const eventMonth = /^\/events\/(20\d{2})\/(\d{1,2})$/.exec(url.pathname);
  if (req.method === "GET" && eventMonth) {
    try {
      const data = await fetchFestivalMonth(
        Number(eventMonth[1]),
        Number(eventMonth[2]),
      );
      res.writeHead(200, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify(data));
    } catch {
      res.writeHead(502);
      res.end('{"error":"Calendar source unavailable"}');
    }
    return;
  }
  const year = /^\/holidays\/(20\d{2})$/.exec(url.pathname)?.[1];
  const target =
    url.pathname === "/weather"
      ? WEATHER_URL
      : year
        ? `https://date.nager.at/api/v3/PublicHolidays/${year}/VN`
        : null;
  if (req.method !== "GET" || !target) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const upstream = await fetch(target, {
      signal: AbortSignal.timeout(12000),
      redirect: "error",
      headers: { accept: "application/json" },
    });
    const body = await upstream.text();
    if (body.length > 200000) throw Error("Payload limit");
    res.writeHead(upstream.status, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(502);
    res.end('{"error":"Context source unavailable"}');
  }
});
server.listen(8091, "127.0.0.1", () =>
  console.log("Bounded context relay ready on loopback port 8091."),
);
