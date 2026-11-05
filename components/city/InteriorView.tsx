"use client";
import { useEffect, useRef, useState } from "react";
import type { World } from "@/lib/world";
import { actorsAt } from "@/lib/life";
import { useLifeClock } from "@/components/hooks/useLifeClock";
import { crowdAt } from "@/lib/living/engine";
import type { InteriorCamera } from "./three/interior";
import type { Quality } from "@/lib/city/scale";

export function InteriorView({ world, venue, clockOffset = 0, focusActorId = "", quality }: {
  world: World; venue: string; clockOffset?: number; focusActorId?: string; quality?: Quality;
}) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(world);
  const latestOffset=useRef(clockOffset);
  const [floor, setFloor] = useState(0), [failed, setFailed] = useState(false);
  const [camera, setCamera] = useState<InteriorCamera>("wide"), [selected, setSelected] = useState("");
  const focus = selected || focusActorId;
  const view = useRef({camera,focusId:focus,quality,floor});
  useEffect(()=>{view.current={camera,focusId:focus,quality,floor};},[camera,focus,quality,floor]);
  useEffect(() => { latest.current = world; }, [world]);
  useEffect(() => { latestOffset.current = clockOffset; }, [clockOffset]);
  useEffect(() => {
    if(failed)return;
    let stop: (() => void) | undefined, cancelled = false;
    import("./three/interior").then(({ createInterior }) => {
      if (cancelled || !host.current) return;
      try {
        stop = createInterior(host.current, venue, () => view.current.floor, () => latest.current, () => latestOffset.current, () => view.current, ()=>setFailed(true));
      } catch { setFailed(true); }
    }).catch(() => { if(!cancelled)setFailed(true); });
    return () => { cancelled = true; stop?.(); };
  }, [venue, failed]);
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
      <button disabled={floor>0||!present.length} aria-pressed={camera === "follow"} onClick={()=>setCamera("follow")}>Theo cư dân</button>
      <button aria-pressed={camera === "overhead"} onClick={()=>setCamera("overhead")}>Góc trên cao</button>
    </div>
    <div className="scene-choice" aria-label="Tầng quan sát">
      {[0, 1, 2].map((f) => <button key={f} aria-pressed={floor === f} onClick={() => {setFloor(f);if(f>0&&camera==='follow')setCamera('wide');}}>{f === 0 ? "Tầng trệt" : `Tầng ${f + 1}`}</button>)}
    </div>
    <div ref={host} className="interior-canvas" role="img" aria-label={`Nội thất ${venue}, tầng ${floor + 1}, góc ${camera}`} />
    {failed && <div role="alert"><p>Góc nhìn 3D bị gián đoạn. Hoạt động của cư dân vẫn hiển thị bên dưới.</p><button onClick={()=>setFailed(false)}>Thử lại 3D nội thất</button></div>}
    <p className="muted">
      Góc nhìn minh họa sinh hoạt tại địa điểm. Các tầng trên hiện chỉ có kiến trúc,
      chưa có thông tin vị trí cư dân trong từng phòng.
    </p>
    <div className="scene-choice interior-residents" aria-label="Chọn cư dân để xem bên trong">
      {(floor===0?present:[]).slice(0,24).map(p=><button key={p.id} aria-pressed={focus===p.id&&camera==="follow"}
        onClick={()=>{setSelected(p.id);setCamera("follow");}}>
        <b>{p.name}</b><small>{p.activity}</small>
      </button>)}
    </div>
    {!present.length && <p>Chưa có cư dân sinh hoạt tại địa điểm này.</p>}
  </section>;
}
