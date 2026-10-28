import { database,json,validOrigin } from '@/lib/store';
import { learnCompleted,tickLiving,advanceResidentSocial } from '@/lib/living/service';
import { runCoalescedPulse } from '@/lib/living/pulse-gate';
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
 return json(result.data,result.status);
}
