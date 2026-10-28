import {env} from 'cloudflare:workers';
import {database,json,validOrigin} from '@/lib/store';
import {BACKFILL_LIMITS,MemoryBackfillError} from '@/lib/memory-backfill';
import {memoryBackfillRequest,runMemoryBackfill} from '@/lib/memory-backfill-store';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const local=(env as unknown as Record<string,string|undefined>).XOM_LOCAL_ADMIN==='true'&&['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname);
 if(!local||!validOrigin(request))return json({error:'Backfill chỉ dành cho bảo trì local đã xác thực.'},403);
 if(Number(request.headers.get('content-length')||0)>BACKFILL_LIMITS.requestBytes)return json({error:'Dữ liệu quá lớn.'},413);
 let raw='';const reader=request.body?.getReader();let size=0;
 try{if(reader){const chunks:Uint8Array[]=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>BACKFILL_LIMITS.requestBytes){await reader.cancel();return json({error:'Dữ liệu quá lớn.'},413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}}catch{return json({error:'Không đọc được JSON.'},400);}
 let input:unknown;try{input=JSON.parse(raw);}catch{return json({error:'JSON không hợp lệ.'},400);}
 const parsed=memoryBackfillRequest.safeParse(input);if(!parsed.success)return json({error:'Yêu cầu backfill không hợp lệ.'},400);
 try{return json(await runMemoryBackfill(database(),parsed.data));}
 catch(error){if(error instanceof MemoryBackfillError)return json({error:error.message},error.status);return json({error:'Backfill chưa sẵn sàng hoặc batch đã bị hủy; kiểm tra schema0008 và checkpoint.'},503);}
}
