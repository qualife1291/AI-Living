import { z } from 'zod';
import { database, json, validOrigin } from '@/lib/store';
const schema=z.object({session:z.string().uuid()}).strict();
export async function GET(){const row=await database().prepare("SELECT total FROM site_metrics WHERE id='views'").first<{total:number}>();return json({views:row?.total??0,definition:'Lượt mở theo phiên 30 phút, không phải số người duy nhất.'});}
export async function POST(req:Request){
 if(!validOrigin(req))return json({error:'Origin không hợp lệ'},403);
 const raw=await req.text();if(raw.length>200)return json({error:'Dữ liệu quá lớn'},413);
 let body:unknown;try{body=JSON.parse(raw);}catch{return json({error:'JSON không hợp lệ'},400);}
 const parsed=schema.safeParse(body);if(!parsed.success)return json({error:'Phiên không hợp lệ'},400);
 const db=database(),nonce=crypto.randomUUID(),now=new Date().toISOString();
 await db.batch([
 db.prepare("INSERT OR IGNORE INTO site_metrics(id,total) VALUES('views',0)"),
 db.prepare("INSERT OR IGNORE INTO view_sessions(id,nonce,created_at) VALUES(?,?,?)").bind(parsed.data.session,nonce,now),
 db.prepare("UPDATE site_metrics SET total=total+1 WHERE id='views' AND EXISTS(SELECT 1 FROM view_sessions WHERE id=? AND nonce=?)").bind(parsed.data.session,nonce),
 // Short-lived random session IDs only; aggregate total survives expiry.
 db.prepare("DELETE FROM view_sessions WHERE created_at < ?").bind(new Date(Date.now()-30*86400000).toISOString()),
 ]);
 return GET();
}
