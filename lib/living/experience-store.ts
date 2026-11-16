import type { Experience } from './learning';

/** Filter existing IDs before INSERT, rather than consuming AUTOINCREMENT IDs
 * for up to200 retained duplicates on every world commit. OR IGNORE remains a
 * final uniqueness fence; the world revision/nonce owns the entire batch. */
export function archiveExperienceStatements(db:D1Database, experiences:readonly Experience[], revision:number, nonce:string) {
  const entries=[...new Map(experiences.map(e=>[e.id,e])).values()];
  if(!entries.length)return [];
  return [db.prepare(`INSERT OR IGNORE INTO agent_experiences(id,actor_id,created_at,data)
    SELECT json_extract(value,'$.id'),json_extract(value,'$.actorId'),json_extract(value,'$.at'),json_extract(value,'$.data')
    FROM json_each(?) WHERE EXISTS(SELECT 1 FROM worlds WHERE id='home' AND revision=? AND json_extract(data,'$.living.learningCommit')=?)
    AND NOT EXISTS(SELECT 1 FROM agent_experiences WHERE id=json_extract(value,'$.id'))`)
    .bind(JSON.stringify(entries.map(e=>({id:e.id,actorId:e.actorId,at:e.at,data:JSON.stringify(e)}))),revision,nonce)];
}
