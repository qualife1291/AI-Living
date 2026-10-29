import { saveVisitorExchange, readVisitorExchange } from '@/lib/living/interaction-store';
import { readBoundedJson } from '@/lib/bounded-json';
import { z } from 'zod';
import { database,readWorld,json,validOrigin } from '@/lib/store';
import { replyToVisitor } from '@/lib/living/interaction';
import {systemLog,safeErrorType} from '@/lib/system-log';
const schema=z.object({id:z.string().uuid(),actorId:z.string().min(1).max(100),message:z.string().trim().min(1).max(280)}).strict();
export async function POST(req:Request){
 if(!validOrigin(req))return json({error:'Origin không hợp lệ'},403);
 const body=await readBoundedJson(req,2000);
 if(!body.ok)return json({error:body.error},body.status);
 const parsed=schema.safeParse(body.value);if(!parsed.success)return json({error:'Tin nhắn không hợp lệ'},400);
 const db=database(),{id,actorId,message}=parsed.data;
 try{const exists=await readVisitorExchange(db,id);if(exists)return json({...exists,duplicate:true});}
 catch(error){systemLog('chat_storage_failed',{stage:'read',status:503,errorType:safeErrorType(error)});return json({error:'Chưa đọc được lời nhắn đã lưu. Hãy thử lại.'},503);}
 const current=await readWorld();
 if(current.world.paused)return json({error:'Xóm đang tạm nghỉ. Nhấn Tiếp tục để trò chuyện.'},409);
 const reply=replyToVisitor(current.world,actorId,message,Date.now());if(!reply)return json({error:'Không tìm thấy cư dân'},404);
 const exchange={id,actorId,message,reply:reply.text,name:reply.name,source:reply.source,createdAt:new Date().toISOString()};
 let saved;
 try{saved=await saveVisitorExchange(db,exchange);}catch(error){systemLog('chat_storage_failed',{stage:'write',status:503,errorType:safeErrorType(error)});return json({error:'Chưa lưu được lời nhắn. Hãy thử lại.'},503);}
 if(!saved.ok){
  systemLog('chat_throttled',{status:429,retryAfter:saved.retryAfter});
  const response=json({error:'Bạn gửi lời nhắn hơi nhanh. Hãy chờ một chút rồi thử lại.',retryAfter:saved.retryAfter},429);
  response.headers.set('Retry-After',String(saved.retryAfter));return response;
 }
 return json(saved.exchange);
}
