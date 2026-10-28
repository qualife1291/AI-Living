import { env } from 'cloudflare:workers';
import { database, json, validOrigin } from '@/lib/store';
import { GROUND_LIMITS, GroundTimelineError } from '@/lib/living/ground-timeline';
import { groundRequestSchema, runGroundAuthority } from '@/lib/living/ground-store';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const local = (env as unknown as Record<string, string | undefined>).XOM_LOCAL_ADMIN === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
  if (!local || !validOrigin(request)) return json({ error: 'Ground timeline chỉ dành cho owner local.' }, 403);
  if (Number(request.headers.get('content-length') || 0) > GROUND_LIMITS.requestBytes) return json({ error: 'Dữ liệu quá lớn.' }, 413);
  const reader = request.body?.getReader(); let size = 0; const chunks: Uint8Array[] = [];
  try {
    if (reader) for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > GROUND_LIMITS.requestBytes) { await reader.cancel(); return json({ error: 'Dữ liệu quá lớn.' }, 413); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const c of chunks) { bytes.set(c, offset); offset += c.byteLength; }
    const input = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes));
    const parsed = groundRequestSchema.safeParse(input);
    if (!parsed.success) return json({ error: 'Yêu cầu ground không hợp lệ.' }, 400);
    try { return json(await runGroundAuthority(database(), parsed.data)); }
    catch (error) {
      if (error instanceof GroundTimelineError) return json({ error: error.message }, error.status);
      return json({ error: 'Ground chưa sẵn sàng hoặc batch bị hủy; kiểm schema0009/checkpoint.' }, 503);
    }
  } catch { return json({ error: 'JSON không hợp lệ.' }, 400); }
}
