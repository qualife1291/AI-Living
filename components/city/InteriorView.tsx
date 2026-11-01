"use client";
import { useEffect, useRef, useState } from "react";
import type { World } from "@/lib/world";
import { actorsAt } from "@/lib/life";
import { useLifeClock } from "@/components/hooks/useLifeClock";
import { crowdAt } from "@/lib/living/engine";
import { interiorAction } from "@/lib/city/interior-actions";
import type { InteriorCamera } from "./three/interior";

export function InteriorView({ world, venue, clockOffset = 0, focusActorId = "" }: {
  world: World; venue: string; clockOffset?: number; focusActorId?: string;
}) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(world);
  const [floor, setFloor] = useState(0), [failed, setFailed] = useState(false);
  const [camera, setCamera] = useState<InteriorCamera>("wide"), [selected, setSelected] = useState("");
  const focus = selected || focusActorId;
  useEffect(() => { latest.current = world; }, [world]);
  useEffect(() => {
    let stop: (() => void) | undefined, cancelled = false;
    import("./three/interior").then(({ createInterior }) => {
      if (cancelled || !host.current) return;
      try {
        stop = createInterior(host.current, venue, floor, () => latest.current, clockOffset, {camera,focusId:focus});
      } catch { setFailed(true); }
    }).catch(() => { if(!cancelled)setFailed(true); });
    return () => { cancelled = true; stop?.(); };
  }, [venue, floor, clockOffset, camera, focus]);
  const clock = useLifeClock(world.paused, clockOffset);
  const now = clock ?? Date.parse(world.born);
  const present = [...actorsAt(world, now), ...(world.living ? crowdAt(world.living, world, now) : [])]
    .filter((p) => !p.walking && p.location === venue);
  return <section className="interior-view">
    <div className="interior-heading">
      <div><small>GÓC QUAN SÁT NỘI THẤT</small><h3>{venue}</h3></div>
      <span>{present.length} người đang ở địa điểm</span>
    </div>
    <div className="scene-choice" aria-label="Góc camera nội thất">
      <button aria-pressed={camera === "wide"} onClick={()=>setCamera("wide")}>Toàn phòng</button>
      <button aria-pressed={camera === "follow"} onClick={()=>setCamera("follow")}>Theo cư dân</button>
      <button aria-pressed={camera === "overhead"} onClick={()=>setCamera("overhead")}>Góc trên cao</button>
    </div>
    <div className="scene-choice" aria-label="Tầng quan sát">
      {[0, 1, 2].map((f) => <button key={f} aria-pressed={floor === f} onClick={() => setFloor(f)}>{f === 0 ? "Tầng trệt" : `Tầng ${f + 1}`}</button>)}
    </div>
    <div ref={host} className="interior-canvas" role="img" aria-label={`Nội thất ${venue}, tầng ${floor + 1}, góc ${camera}`} />
    {failed && <p role="alert">Thiết bị chưa mở được góc nhìn 3D. Hoạt động thực của cư dân vẫn hiển thị bên dưới.</p>}
    <p className="muted">
      Đây là góc cắt mô phỏng tại địa điểm, không phải vị trí phòng/tầng được xác nhận.
      Người và loại hoạt động lấy từ trạng thái thế giới; cử động và đạo cụ chỉ minh họa,
      không chứng minh đã hoàn thành nhiệm vụ, sở hữu đồ hoặc nhận reward.
    </p>
    <div className="scene-choice" aria-label="Chọn cư dân để xem bên trong">
      {present.slice(0,24).map(p=><button key={p.id} aria-pressed={focus===p.id&&camera==="follow"}
        onClick={()=>{setSelected(p.id);setCamera("follow");}}>
        {p.name} · {interiorAction(p.kind,p.activity)}
      </button>)}
    </div>
    <ul>{present.length
      ? present.map((p) => <li key={p.id}><b>{p.name}</b> · {p.activity} <small>({interiorAction(p.kind,p.activity)})</small></li>)
      : <li>Không có cư dân được ghi nhận sinh hoạt trong địa điểm này.</li>}
    </ul>
  </section>;
}
