"use client";
import {useState} from "react";
import {Droplets,Sprout} from "lucide-react";
import {gardenViews,type GardenView} from "@/lib/living/flora";
import {computeSimMs} from "@/lib/clock";
import type {World} from "@/lib/world";
export function GardenCare({world,revision,now,venue,refresh,onView}:{world:World;revision:number;now:number;venue?:string;refresh:()=>Promise<void>;onView:(plot:GardenView)=>void}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  let plots:GardenView[];
  try{plots=gardenViews(world.living?.flora,computeSimMs(world.born,world.clock,now)).filter(p=>!venue||p.venue===venue);}
  catch{return <p role="status">Chưa đọc được trạng thái vườn. Hãy tải lại thành phố.</p>;}
  if(!plots.length)return null;
  async function water(id:string){
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/living/flora",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,revision})});
      const result=await response.json() as {error?:string;changed?:boolean};
      if(!response.ok){if(response.status===409)await refresh();throw Error(result.error??"Chưa tưới được cây. Hãy thử lại.");}
      await refresh();setMessage(result.changed?"Đã bổ sung nước cho khóm hoa.":"Đất vẫn đủ ẩm.");
    }catch(error){setMessage(error instanceof Error?error.message:"Chưa tưới được cây. Hãy thử lại.");}
    finally{setBusy(false);}
  }
  return <section className="garden-care" aria-label="Vườn cây">
    <h3><Sprout size={18}/>Vườn cây</h3><p>Cây phát triển theo thời gian của xóm. Tưới khi đất khô để cây lớn đều hơn.</p>
    <div className="garden-grid">{plots.map(plot=><article key={plot.id} className="garden-card" data-garden-id={plot.id}>
      <b>{plot.label}</b><span className="garden-phase">{plot.phaseLabel}</span>
      <label>Độ ẩm {Math.round(plot.moisture)}%<meter min={0} max={100} value={plot.moisture} aria-label={`Độ ẩm tại ${plot.venue}`}/></label>
      <small>{plot.moisture<25?"Cần thêm nước":plot.moisture<60?"Độ ẩm vừa":"Đất còn ẩm"}</small>
      <div className="garden-actions"><button aria-label={`Tưới cây tại ${plot.venue}`} disabled={busy||world.paused||plot.moisture>=99.5} onClick={()=>void water(plot.id)}><Droplets size={15}/>{plot.moisture>=99.5?"Đủ nước":"Tưới cây"}</button><button aria-label={`Xem cây ở ${plot.venue}`} onClick={()=>onView(plot)}>Xem cây</button></div>
    </article>)}</div>
    {message&&<p className="garden-message" role="status">{message}</p>}
    {world.paused&&<small>Tiếp tục nhịp sống để chăm cây.</small>}
  </section>;
}
