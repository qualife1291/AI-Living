/** Read at most maxBytes into memory, including when Content-Length is absent or false. */
export async function readBoundedJson(req: Request, maxBytes: number): Promise<
  { ok: true; value: unknown } | { ok: false; status: 400 | 413; error: string }
> {
  const reader = req.body?.getReader();
  if (!reader) return { ok: false, status: 400, error: 'JSON không hợp lệ' };
  try {
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        // A broken upstream cancellation must not turn the intended 413 into a 500.
        void reader.cancel().catch(() => { /* upstream already failed */ });
        return { ok: false, status: 413, error: 'Dữ liệu quá lớn' };
      }
      chunks.push(value);
    }
    const raw = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength; }
    return { ok: true, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)) };
  } catch {
    return { ok: false, status: 400, error: 'JSON không hợp lệ' };
  } finally {
    reader.releaseLock();
  }
}
