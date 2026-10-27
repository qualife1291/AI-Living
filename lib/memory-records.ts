import type { EventInput } from './event-schema';
import type { Experience } from './living/learning';
export type MemoryRecord = { id: string; personId: string; eventId: string; text: string; kind: 'event-report' | 'simulation-plan-outcome' | 'legacy-record'; importance: number; witnessedWith: string[]; createdAt: string };
export function eventMemories(input: EventInput, now: string): MemoryRecord[] {
  return input.changes.map(change => ({ id: `event:${input.id}:${change.id}`, personId: change.id, eventId: input.id, text: change.memory, kind: 'event-report', importance: change.skillDelta > 0 ? 4 : 3,
    // Only the explicitly assigned recipient knows this report. Do not infer
    // physical presence or shared knowledge from a future dialogue/plan.
    witnessedWith: [change.id], createdAt: now }));
}
export function outcomeMemory(experience: Experience, text: string): MemoryRecord {
  return { id: `outcome:${experience.id}`, personId: experience.actorId, eventId: experience.id, text, kind: 'simulation-plan-outcome', importance: 2, witnessedWith: [experience.actorId], createdAt: experience.at };
}
export function memoryInsert(db: D1Database, records: MemoryRecord[], revision: number, nonce?: string) {
  if (!records.length) return [];
  const guard = nonce ? " AND json_extract(data,'$.living.learningCommit')=?" : '';
  const statement = db.prepare(`INSERT OR IGNORE INTO memories(id,person_id,event_id,text,kind,importance,witnessed_with,created_at)
    SELECT json_extract(value,'$.id'),json_extract(value,'$.personId'),json_extract(value,'$.eventId'),json_extract(value,'$.text'),json_extract(value,'$.kind'),json_extract(value,'$.importance'),json_extract(value,'$.witnessedWith'),json_extract(value,'$.createdAt')
    FROM json_each(?) WHERE EXISTS(SELECT 1 FROM worlds WHERE id='home' AND revision=?${guard})`);
  return [nonce ? statement.bind(JSON.stringify(records), revision, nonce) : statement.bind(JSON.stringify(records), revision)];
}
export function rankMemories(records: MemoryRecord[], actorId: string, topic: string, limit = 6) {
  const words = topic.normalize('NFC').toLocaleLowerCase('vi-VN').replace(/[\p{P}\p{S}]/gu, ' ').split(/\s+/).filter(w => w.length > 1);
  return records.filter(r => r.personId === actorId && r.witnessedWith.includes(actorId)).map(r => ({ record: r, relevance: words.filter(w => r.text.toLocaleLowerCase('vi-VN').includes(w)).length }))
    .sort((a, b) => b.relevance - a.relevance || b.record.importance - a.record.importance || b.record.createdAt.localeCompare(a.record.createdAt) || a.record.id.localeCompare(b.record.id))
    .slice(0, Math.max(1, Math.min(12, limit))).map(r => r.record);
}
type MemoryRow = {id:string;person_id:string;event_id:string;text:string;kind:string;importance:number;witnessed_with:string|null;created_at:string};
export async function relevantMemories(db: D1Database, actorId: string, topic = '', limit = 6) {
  const rows = await db.prepare('SELECT id,person_id,event_id,text,kind,importance,witnessed_with,created_at FROM memories WHERE person_id=? ORDER BY created_at DESC LIMIT 100').bind(actorId).all<MemoryRow>();
  const records = rows.results.map(row => {
    const legacy = !['event-report','simulation-plan-outcome'].includes(row.kind);
    let witnesses: unknown; try { witnesses = JSON.parse(row.witnessed_with ?? '[]'); } catch { witnesses = []; }
    if (legacy) witnesses = [...new Set([row.person_id, ...(Array.isArray(witnesses) ? witnesses : [])])];
    return { id: row.id, personId: row.person_id, eventId: row.event_id, text: row.text, kind: (legacy ? 'legacy-record' : row.kind) as MemoryRecord['kind'], importance: row.importance, witnessedWith: Array.isArray(witnesses) ? witnesses.filter((w):w is string=>typeof w==='string') : [], createdAt: row.created_at };
  });
  return rankMemories(records, actorId, topic, limit);
}
