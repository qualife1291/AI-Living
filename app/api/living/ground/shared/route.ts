import {env} from 'cloudflare:workers';
import {database,json,validOrigin} from '@/lib/store';
import {GroundTimelineError} from '@/lib/living/ground-timeline';
import {sharedRequestSchema,runSharedGround} from '@/lib/living/shared-ground-store';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 const local=(env as unknown as Record<string,string>).XOM_LOCAL_ADMIN==='true'&&['localhost','127.0.0.1','[::1]'].includes(new URL(req.url).hostname);
 if(!local||!validOrigin(req))return json({error:'Timeline chung chỉ dành cho owner local.'},403);
 if(Number(req.headers.get('content-length')||0)>2048)return json({error:'Dữ liệu quá lớn.'},413);
 const reader=req.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{if(reader)for(;;){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();return json({error:'Dữ liệu quá lớn.'},413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 const parsed=sharedRequestSchema.safeParse(JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes)));if(!parsed.success)return json({error:'Yêu cầu không hợp lệ.'},400);
 try{return json(await runSharedGround(database(),parsed.data));}catch(error){if(error instanceof GroundTimelineError)return json({error:error.message},error.status);return json({error:'Timeline chưa sẵn sàng; kiểm schema0010/checkpoint.'},503);}
 }catch{return json({error:'JSON không hợp lệ.'},400);}
}
