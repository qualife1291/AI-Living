/** Disposable, site-wide coordination data; visitor_exchanges remains durable history. */
export const CHAT_GATE_KEY = 'internal:visitor-chat:v1';
export const CHAT_WINDOW_MS = 60_000;
export const CHAT_WINDOW_LIMIT = 30;

export type VisitorExchange = {
  id: string; actorId: string; message: string; reply: string; name: string;
  source: 'rules'; createdAt: string;
};
type Admission = { data: string | null; retryAfter: number; verified: number };

/** Fixed window beginning at the first admitted message. A single D1 batch owns
 * the counter and exchange write: duplicates do not consume capacity, storage
 * failures roll back, and different Worker isolates cannot oversubscribe it.
 * All lookups use primary keys; no chat history scan or retention deletion.
 */
export async function saveVisitorExchange(db: D1Database, exchange: VisitorExchange, now = Date.now()): Promise<
  { ok: true; exchange: VisitorExchange } | { ok: false; retryAfter: number }
> {
  const { id, actorId, createdAt } = exchange;
  const result = await db.batch([
    db.prepare(`INSERT INTO context_cache(id,data,expires_at)
      SELECT ?,json_object('count',1,'lastId',?),?
      WHERE NOT EXISTS(SELECT 1 FROM visitor_exchanges WHERE id=?)
      ON CONFLICT(id) DO UPDATE SET
        data=json_object('count',CASE WHEN context_cache.expires_at<=? THEN 1
          ELSE json_extract(context_cache.data,'$.count')+1 END,'lastId',?),
        expires_at=CASE WHEN context_cache.expires_at<=? THEN excluded.expires_at
          ELSE context_cache.expires_at END
      WHERE NOT EXISTS(SELECT 1 FROM visitor_exchanges WHERE id=?)
        AND (context_cache.expires_at<=? OR json_extract(context_cache.data,'$.count')<?)`)
      .bind(CHAT_GATE_KEY,id,now+CHAT_WINDOW_MS,id,now,id,now,id,now,CHAT_WINDOW_LIMIT),
    db.prepare(`INSERT OR IGNORE INTO visitor_exchanges(id,actor_id,created_at,data)
      SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM context_cache WHERE id=?
        AND expires_at>? AND json_extract(data,'$.lastId')=?
        AND json_extract(data,'$.count') BETWEEN 1 AND ?)`)
      .bind(id,actorId,createdAt,JSON.stringify(exchange),CHAT_GATE_KEY,now,id,CHAT_WINDOW_LIMIT),
    // D1 rolls back the entire batch if admission succeeded but the exchange
    // vanished (e.g. a silent trigger ignore). A quota rejection writes neither.
    db.prepare(`SELECT
      CASE WHEN EXISTS(SELECT 1 FROM visitor_exchanges WHERE id=?)
        OR EXISTS(SELECT 1 FROM context_cache WHERE id=? AND expires_at>?
          AND json_extract(data,'$.count')>=? AND json_extract(data,'$.lastId')<>?)
        THEN 1 ELSE json('chat-admission-invariant-failed') END AS verified,
      (SELECT data FROM visitor_exchanges WHERE id=?) AS data,
      COALESCE((SELECT expires_at FROM context_cache WHERE id=?),?)-? AS retryAfter`)
      .bind(id,CHAT_GATE_KEY,now,CHAT_WINDOW_LIMIT,id,id,CHAT_GATE_KEY,now+CHAT_WINDOW_MS,now),
  ]);
  const saved = result[2].results[0] as Admission | undefined;
  if (!saved || saved.verified !== 1) throw new Error('Chat admission unavailable');
  if (saved.data !== null) return { ok: true, exchange: JSON.parse(saved.data) as VisitorExchange };
  return { ok: false, retryAfter: Math.max(1, Math.ceil(saved.retryAfter / 1000)) };
}
