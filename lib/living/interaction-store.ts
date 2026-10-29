import {z} from 'zod';
/** Disposable, site-wide coordination data; visitor_exchanges remains durable history. */
export const CHAT_GATE_KEY = 'internal:visitor-chat:v1';
export const CHAT_WINDOW_MS = 60_000;
export const CHAT_WINDOW_LIMIT = 30;
const exchangeSchema=z.object({id:z.string().uuid(),actorId:z.string().min(1).max(100),message:z.string().min(1).max(280),reply:z.string().min(1),name:z.string().min(1),source:z.literal('rules'),createdAt:z.string().datetime({offset:true})}).strict();
export type VisitorExchange=z.infer<typeof exchangeSchema>;
type StoredRow={data:string;actor_id:string;created_at:string};
type Admission={data:string|null;actor_id:string|null;created_at:string|null;retryAfter:number;verified:number};
function decode(row:StoredRow,id:string):VisitorExchange{
 const value=exchangeSchema.parse(JSON.parse(row.data));
 if(value.id!==id||value.actorId!==row.actor_id||value.createdAt!==row.created_at)throw Error('Chat record unavailable');
 return value;
}
export async function readVisitorExchange(db:D1Database,id:string){
 const row=await db.prepare('SELECT data,actor_id,created_at FROM visitor_exchanges WHERE id=?').bind(id).first<StoredRow>();
 return row?decode(row,id):null;
}
// Accept the prior two-field format during its short TTL; new writes carry a
// batch nonce and previousCount. No history scan, migration or cleanup deletion.
const validCounter=`typeof(context_cache.expires_at)='integer' AND CASE WHEN json_valid(context_cache.data) THEN
 json_type(context_cache.data,'$.count')='integer' AND json_extract(context_cache.data,'$.count') BETWEEN 1 AND ${CHAT_WINDOW_LIMIT}
 AND json_type(context_cache.data,'$.lastId')='text' AND length(json_extract(context_cache.data,'$.lastId'))=36
 AND (json_type(context_cache.data,'$.nonce') IS NULL OR (json_type(context_cache.data,'$.nonce')='text' AND length(json_extract(context_cache.data,'$.nonce'))=36))
 AND (json_type(context_cache.data,'$.previousCount') IS NULL OR (json_type(context_cache.data,'$.previousCount')='integer' AND json_extract(context_cache.data,'$.count')=json_extract(context_cache.data,'$.previousCount')+1))
 ELSE 0 END`;
/** One D1 batch couples a fresh admission to the exact stored exchange. The
 * postassert rolls back ignored/altered writes, not just a missing exchange. */
export async function saveVisitorExchange(db:D1Database,exchange:VisitorExchange,now=Date.now()):Promise<
 {ok:true;exchange:VisitorExchange}|{ok:false;retryAfter:number}
>{
 if(!Number.isSafeInteger(now)||now<0||now>Number.MAX_SAFE_INTEGER-CHAT_WINDOW_MS)throw Error('Chat admission time unavailable');
 const value=exchangeSchema.parse(exchange),{id,actorId,createdAt}=value,encoded=JSON.stringify(value),nonce=crypto.randomUUID();
 const result=await db.batch([
  db.prepare(`INSERT INTO context_cache(id,data,expires_at)
   SELECT ?,json_object('count',1,'previousCount',0,'lastId',?,'nonce',?),?
   WHERE NOT EXISTS(SELECT 1 FROM visitor_exchanges WHERE id=?)
   ON CONFLICT(id) DO UPDATE SET
    data=json_object('count',CASE WHEN context_cache.expires_at<=? THEN 1 ELSE json_extract(context_cache.data,'$.count')+1 END,
     'previousCount',CASE WHEN context_cache.expires_at<=? THEN 0 ELSE json_extract(context_cache.data,'$.count') END,'lastId',?,'nonce',?),
    expires_at=CASE WHEN context_cache.expires_at<=? THEN excluded.expires_at ELSE context_cache.expires_at END
   WHERE NOT EXISTS(SELECT 1 FROM visitor_exchanges WHERE id=?)
    AND (context_cache.expires_at<=? OR ((${validCounter}) AND json_extract(context_cache.data,'$.count')<?))`)
   .bind(CHAT_GATE_KEY,id,nonce,now+CHAT_WINDOW_MS,id,now,now,id,nonce,now,id,now,CHAT_WINDOW_LIMIT),
  db.prepare(`INSERT OR IGNORE INTO visitor_exchanges(id,actor_id,created_at,data)
   SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM context_cache WHERE id=? AND expires_at>?
    AND (${validCounter}) AND json_extract(data,'$.lastId')=? AND json_extract(data,'$.nonce')=?)`)
   .bind(id,actorId,createdAt,encoded,CHAT_GATE_KEY,now,id,nonce),
  db.prepare(`SELECT CASE
   WHEN changes()=1 THEN CASE WHEN
    EXISTS(SELECT 1 FROM visitor_exchanges WHERE id=? AND actor_id=? AND created_at=? AND data=?)
    AND EXISTS(SELECT 1 FROM context_cache WHERE id=? AND expires_at>? AND (${validCounter})
     AND json_extract(data,'$.lastId')=? AND json_extract(data,'$.nonce')=?)
    THEN 1 ELSE json('chat-admission-invariant-failed') END
   WHEN EXISTS(SELECT 1 FROM visitor_exchanges WHERE id=?)
    AND NOT EXISTS(SELECT 1 FROM context_cache WHERE id=? AND json_extract(data,'$.nonce')=?) THEN 1
   WHEN EXISTS(SELECT 1 FROM context_cache WHERE id=? AND expires_at>? AND (${validCounter})
    AND json_extract(data,'$.count')=? AND json_extract(data,'$.lastId')<>? AND COALESCE(json_extract(data,'$.nonce'),'')<>?) THEN 1
   ELSE json('chat-admission-invariant-failed') END AS verified,
   (SELECT data FROM visitor_exchanges WHERE id=?) AS data,
   (SELECT actor_id FROM visitor_exchanges WHERE id=?) AS actor_id,
   (SELECT created_at FROM visitor_exchanges WHERE id=?) AS created_at,
   COALESCE((SELECT expires_at FROM context_cache WHERE id=?),?)-? AS retryAfter`)
   .bind(id,actorId,createdAt,encoded,CHAT_GATE_KEY,now,id,nonce,id,CHAT_GATE_KEY,nonce,CHAT_GATE_KEY,now,CHAT_WINDOW_LIMIT,id,nonce,id,id,id,CHAT_GATE_KEY,now+CHAT_WINDOW_MS,now),
 ]);
 const saved=result[2].results[0] as Admission|undefined;
 if(!saved||saved.verified!==1)throw Error('Chat admission unavailable');
 if(saved.data!==null&&saved.actor_id!==null&&saved.created_at!==null)return {ok:true,exchange:decode({data:saved.data,actor_id:saved.actor_id,created_at:saved.created_at},id)};
 return {ok:false,retryAfter:Math.max(1,Math.ceil(saved.retryAfter/1000))};
}
