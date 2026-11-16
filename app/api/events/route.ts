import { readBoundedJson } from "@/lib/bounded-json";
import { eventSchema as schema } from '@/lib/event-schema';
import { applyEventToWorld } from '@/lib/apply-event';
import { readWorld, database, json, validOrigin } from '@/lib/store';
import { eventMemories, memoryInsert } from '@/lib/memory-records';

const MAX_BODY_BYTES = 20_000;

export async function POST(req: Request) {
  if (!validOrigin(req)) {
    return json({ error: 'Origin không hợp lệ' }, 403);
  }
  if (Number(req.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
    return json({ error: 'Dữ liệu quá lớn' }, 413);
  }

  const decoded = await readBoundedJson(req, 20000);
  if (!decoded.ok) return json({ error: decoded.error }, decoded.status);
  const parsedJson = decoded.value;
  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    return json(
      {
        error: 'Sự kiện không đúng cấu trúc',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      400,
    );
  }

  const input = parsed.data;
  const db = database();

  const exists = await db
    .prepare('SELECT id FROM episodes WHERE id = ?')
    .bind(input.id)
    .first();
  if (exists) {
    return json({ ok: true, duplicate: true, id: input.id });
  }

  const { world, revision } = await readWorld();
  const outcome = applyEventToWorld(world, revision, input, Date.now());
  if (!outcome.ok) {
    return json({ error: outcome.error }, outcome.status);
  }

  try {
    // D1 batches execute transactionally. Conditional insert and update share the same revision guard.
    const results = await db.batch([
      db
        .prepare(
          'INSERT INTO episodes (id, created_at, source, data) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM worlds WHERE id = ? AND revision = ?)',
        )
        .bind(
          input.id,
          outcome.nowIso,
          input.source,
          JSON.stringify(outcome.episodePayload),
          'home',
          revision,
        ),
      ...memoryInsert(db, eventMemories(input, outcome.nowIso), revision),
      db
        .prepare(
          'UPDATE worlds SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
        )
        .bind(JSON.stringify(outcome.world), 'home', revision),
    ]);

    if (results.at(-1)!.meta.changes) return json({ ok: true, id: input.id, revision: revision + 1 });
    const duplicate = await db.prepare('SELECT id FROM episodes WHERE id = ?').bind(input.id).first();
    return duplicate ? json({ ok: true, duplicate: true, id: input.id }) : json({ error: 'Revision conflict' }, 409);
  } catch (err: unknown) {
    // Fixes L3: Handle concurrent duplicate ID race cleanly as idempotent success
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('UNIQUE') || message.includes('PRIMARY KEY')) {
      const checkAgain = await db
        .prepare('SELECT id FROM episodes WHERE id = ?')
        .bind(input.id)
        .first();
      if (checkAgain) {
        return json({ ok: true, duplicate: true, id: input.id });
      }
    }
    throw err;
  }
}
