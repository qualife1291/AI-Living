export type Diagnostic = { id: string; at: number; kind: string; data: Record<string, string | number | boolean> };
const LIMIT = 512;
const buffer: Diagnostic[] = [];
const cooldown = new Map<string, number>();
let sequence = 0;
export function logClient(kind: string, data: Diagnostic["data"] = {}) {
  if (typeof window === "undefined") return;
  const now = Date.now(), key = `${kind}:${data.actor ?? ""}`;
  if (now - (cooldown.get(key) ?? 0) < 5000) return;
  cooldown.set(key, now);
  if (cooldown.size > 1024) cooldown.delete(cooldown.keys().next().value!);
  buffer.push({ id: `${now}-${++sequence}`, at: now, kind, data });
  if (buffer.length > LIMIT) buffer.shift();
}
export const clientLogs = () => buffer.map(row => ({ ...row, data: { ...row.data } }));
let sending = false;
export async function flushClientLogs() {
  if (sending || !buffer.length) return;
  sending = true;
  const batch = buffer.slice(0, 32), ids = new Set(batch.map(r => r.id));
  try {
    const response = await fetch("/api/diagnostics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logs: batch }), signal: AbortSignal.timeout(5000) });
    if (response.ok) for (let i = buffer.length - 1; i >= 0; i--) if (ids.has(buffer[i].id)) buffer.splice(i, 1);
  } catch { /* Keep bounded pending logs for retry. */ }
  finally { sending = false; }
}
const frameTimes: number[] = [];
export function recordFrame(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  frameTimes.push(ms); if (frameTimes.length > 1800) frameTimes.shift();
  if (ms > 50) logClient("frame_slow", { ms });
  logClient("frame_sample", { ms });
}
export function diagnosticSummary() {
  const frames = [...frameTimes].sort((a,b) => a-b);
  return { pending: buffer.length, frameP95: frames.length ? frames[Math.min(frames.length-1, Math.ceil(frames.length*.95)-1)] : null };
}
