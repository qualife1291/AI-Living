import {readWorld,database,json} from '@/lib/store';
import {relevantMemories} from '@/lib/memory-records';
export async function GET(request:Request) {
  const url=new URL(request.url),actorId=url.searchParams.get('actor')??'',topic=(url.searchParams.get('topic')??'').slice(0,240);
  const {world}=await readWorld();
  if(!world.people.some(p=>p.id===actorId)&&!world.living?.residents.some(p=>p.id===actorId))return json({error:'Không tìm thấy cư dân'},404);
  return json({actorId,records:await relevantMemories(database(),actorId,topic),scope:'Event reports and simulation plan outcomes belonging to this actor; not physical occupancy proof'});
}
