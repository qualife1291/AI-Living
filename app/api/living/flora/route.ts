import {z} from "zod";
import {database,readWorld,json,validOrigin} from "@/lib/store";
import {initializeLiving} from "@/lib/living/engine";
import {waterGarden} from "@/lib/living/flora";
import {gardenPlot} from "@/lib/city/garden-plots";
import {computeSimMs} from "@/lib/clock";
const schema=z.object({id:z.string().min(1).max(100),revision:z.number().int().nonnegative()}).strict();
export async function POST(req:Request) {
  if(!validOrigin(req))return json({error:"Origin không hợp lệ"},403);
  const reader=req.body?.getReader();if(!reader)return json({error:"Thiếu dữ liệu"},400);
  const chunks:Uint8Array[]=[];let bytes=0;
  while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2048){await reader.cancel();return json({error:"Dữ liệu quá lớn"},413);}chunks.push(value);}
  const data=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  let body:unknown;try{body=JSON.parse(new TextDecoder().decode(data));}catch{return json({error:"JSON không hợp lệ"},400);}
  const parsed=schema.safeParse(body);if(!parsed.success)return json({error:"Khóm cây không hợp lệ"},400);
  if(!gardenPlot(parsed.data.id))return json({error:"Không tìm thấy khóm cây"},404);
  const current=await readWorld(),now=Date.now();
  if(current.revision!==parsed.data.revision)return json({error:"Thành phố vừa cập nhật. Hãy thử lại."},409);
  if(current.world.paused)return json({error:"Xóm đang tạm nghỉ"},409);
  let watered:ReturnType<typeof waterGarden>;
  try{watered=waterGarden(current.world.living?.flora,parsed.data.id,computeSimMs(current.world.born,current.world.clock,now));}
  catch{return json({error:"Chưa đọc được trạng thái vườn. Dữ liệu đã lưu được giữ nguyên."},409);}
  if(!watered.changed)return json({ok:true,changed:false});
  current.world.living??=initializeLiving(now);current.world.living.flora=watered.state;
  const result=await database().prepare("UPDATE worlds SET data=?,revision=revision+1 WHERE id='home' AND revision=?")
    .bind(JSON.stringify(current.world),current.revision).run();
  return result.meta.changes?json({ok:true,changed:true}):json({error:"Thành phố vừa cập nhật. Hãy thử lại."},409);
}
