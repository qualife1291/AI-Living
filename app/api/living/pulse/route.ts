import { json,validOrigin } from '@/lib/store';
import { learnCompleted,tickLiving,advanceResidentSocial } from '@/lib/living/service';
export async function POST(req:Request){
 if(!validOrigin(req))return json({error:'Origin không hợp lệ'},403);
 const learned=await learnCompleted();
 if(learned.status!==200)return json(learned.data,learned.status);
 const social=await advanceResidentSocial();
 if(social.status!==200)return json(social.data,social.status);
 const tick=await tickLiving();
 return json({...tick.data,learning:learned.data},tick.status);
}
