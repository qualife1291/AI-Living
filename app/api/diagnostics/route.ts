import { database, json, validOrigin } from "@/lib/store";
const MAX_BYTES = 16384;
export async function POST(req: Request) {
  if (!validOrigin(req)) return json({ error: "Origin không hợp lệ" }, 403);
  const reader = req.body?.getReader(); if (!reader) return json({ error: "Thiếu dữ liệu" }, 400);
  let bytes = 0; const chunks: Uint8Array[] = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > MAX_BYTES) { await reader.cancel(); return json({ error: "Dữ liệu quá lớn" }, 413); } chunks.push(value); }
  const raw = new Uint8Array(bytes); let at = 0; for (const c of chunks) { raw.set(c, at); at += c.length; }
  let logs: unknown; try { logs = JSON.parse(new TextDecoder().decode(raw)).logs; } catch { return json({ error: "JSON không hợp lệ" }, 400); }
  if (!Array.isArray(logs) || !logs.length || logs.length > 32) return json({ error: "Tối đa 32 log" }, 400);
  const allowed = new Set(["frame_sample", "frame_slow", "longtask", "route_slow", "route_miss", "actor_stuck", "position_nan", "footprint_overlap", "webgl_lost", "render_error"]);
  for (const row of logs) if (!row || typeof row !== "object" || !allowed.has(row.kind) || !Number.isFinite(row.at) || !row.data || typeof row.data !== "object" || Array.isArray(row.data) || Object.keys(row.data).length > 8 || Object.entries(row.data).some(([k,v]) => k.length > 32 || !["string", "number", "boolean"].includes(typeof v) || (typeof v === "string" && v.length > 100) || (typeof v === "number" && !Number.isFinite(v)))) return json({ error: "Log không hợp lệ" }, 400);
  const now = Date.now(), db = database();
  // One atomic admission statement, bounded globally even across worker isolates.
  const result = await db.prepare("INSERT INTO client_logs(id,created_at,data) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM client_logs WHERE created_at>?) < 20").bind(crypto.randomUUID(), now, JSON.stringify(logs), now-60000).run();
  if (!result.meta.changes) return json({ error: "Gửi log quá nhanh" }, 429);
  await db.prepare("DELETE FROM client_logs WHERE created_at < ?").bind(now-7*86400000).run();
  return json({ ok: true });
}
export async function GET() {
  const db = database(), cutoff = Date.now()-7*86400000;
  await db.prepare("DELETE FROM client_logs WHERE created_at < ?").bind(cutoff).run();
  const result = await db.prepare("SELECT data FROM client_logs WHERE created_at >= ? ORDER BY created_at DESC LIMIT 500").bind(cutoff).all<{ data: string }>();
  const ticks = await db.prepare("SELECT id,started_at,status,error FROM tick_runs WHERE error IS NOT NULL AND started_at >= ? ORDER BY started_at DESC LIMIT 500").bind(new Date(cutoff).toISOString()).all<{ id: string; started_at: string; status: string; error: string }>();
  const rows = [...result.results.flatMap(r => JSON.parse(r.data)), ...ticks.results.map(t => ({ kind: "server_tick", id: t.id, at: t.started_at, status: t.status, detail: t.error }))];
  return new Response(rows.map(r => JSON.stringify(r)).join("\n"), { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "private, no-store" } });
}
