import {env} from 'cloudflare:workers';
import {database,json} from '@/lib/store';
import {PROGRESS_SQL,progressSnapshot} from '@/lib/ops/progress-watch';

/** Worker owner gate protects this route; additionally keep it QA/loopback-only. */
export async function GET(request:Request){
  const settings=env as unknown as Record<string,unknown>,url=new URL(request.url);
  const qa=settings.XOM_QA_HOSTNAME==='ai-living-qa.hoanglonglea1mtl.workers.dev'&&url.hostname===settings.XOM_QA_HOSTNAME&&url.protocol==='https:';
  const local=settings.XOM_LOCAL_ADMIN==='true'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if(!qa&&!local)return json({error:'Chỉ dành cho QA hoặc preview của chủ sở hữu.'},403);
  try{
    const row=await database().prepare(PROGRESS_SQL).first();
    if(!row)return json({error:'Chưa có world; kiểm tra này không tạo seed.'},503);
    const metadata=settings.CF_VERSION_METADATA;
    const version=metadata&&typeof metadata==='object'&&'id' in metadata?metadata.id:null;
    return json(progressSnapshot(row,qa?'qa':'local',new Date().toISOString(),version));
  }catch{return json({error:'Chưa đọc được snapshot tiến độ.'},503);}
}
