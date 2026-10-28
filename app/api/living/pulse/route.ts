import { database,json,validOrigin } from '@/lib/store';
import { learnCompleted,tickLiving,advanceResidentSocial } from '@/lib/living/service';
import { runCoalescedPulse } from '@/lib/living/pulse-gate';
import {env} from 'cloudflare:workers';
import {pulseSharedGround} from '@/lib/living/shared-ground-store';
export async function POST(req:Request){
 if(!validOrigin(req))return json({error:'Origin không hợp lệ'},403);
 const result=await runCoalescedPulse(database(),async()=>{
  const learned=await learnCompleted();
  if(learned.status!==200)return learned;
  const social=await advanceResidentSocial();
  if(social.status!==200)return social;
  const tick=await tickLiving();
  return {status:tick.status,data:{...tick.data,learning:learned.data}};
 });
 const local=(env as unknown as Record<string,string>).XOM_LOCAL_ADMIN==='true'&&['localhost','127.0.0.1','[::1]'].includes(new URL(req.url).hostname);
 if(local){try{const shared=await pulseSharedGround(database());if(shared)return json({...result.data,sharedGround:shared},result.status);}catch{return json({error:'Timeline chung chưa cập nhật; checkpoint đã lưu được giữ nguyên.'},503);}}
 return json(result.data,result.status);
}
