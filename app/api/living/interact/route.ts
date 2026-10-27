import { z } from 'zod';
import { database,readWorld,json,validOrigin } from '@/lib/store';
import { replyToVisitor } from '@/lib/living/interaction';
const schema=z.object({id:z.string().uuid(),actorId:z.string().min(1).max(100),message:z.string().trim().min(1).max(280)}).strict();
export async function POST(req:Request){
 if(!validOrigin(req))return json({error:'Origin không hợp lệ'},403);
 const raw=await req.text();if(new TextEncoder().encode(raw).length>2000)return json({error:'Dữ liệu quá lớn'},413);
 let body:unknown;try{body=JSON.parse(raw);}catch{return json({error:'JSON không hợp lệ'},400);}
 const parsed=schema.safeParse(body);if(!parsed.success)return json({error:'Tin nhắn không hợp lệ'},400);
 const db=database(),{id,actorId,message}=parsed.data;
 const exists=await db.prepare('SELECT data FROM visitor_exchanges WHERE id=?').bind(id).first<{data:string}>();
 if(exists)return json({...JSON.parse(exists.data),duplicate:true});
 const current=await readWorld();
 if(current.world.paused)return json({error:'Xóm đang tạm nghỉ. Nhấn Tiếp tục để trò chuyện.'},409);
 const reply=replyToVisitor(current.world,actorId,message,Date.now());if(!reply)return json({error:'Không tìm thấy cư dân'},404);
 const exchange={id,actorId,message,reply:reply.text,name:reply.name,source:reply.source,createdAt:new Date().toISOString()};
 await db.prepare('INSERT OR IGNORE INTO visitor_exchanges(id,actor_id,created_at,data) VALUES(?,?,?,?)').bind(id,actorId,exchange.createdAt,JSON.stringify(exchange)).run();
 const saved=await db.prepare('SELECT data FROM visitor_exchanges WHERE id=?').bind(id).first<{data:string}>();
 return json(JSON.parse(saved!.data));
}
