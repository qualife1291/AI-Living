"use client";
import { useEffect, useRef, useState } from "react";
import type { World } from "@/lib/world";
import { actorsAt } from "@/lib/life";
import { useLifeClock } from "@/components/world/useLife";
import { crowdAt } from "@/lib/living/engine";

export function InteriorView({ world, venue, clockOffset = 0 }: { world: World; venue: string; clockOffset?: number }) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(world);
  const [floor, setFloor] = useState(0), [failed, setFailed] = useState(false);
  useEffect(() => { latest.current = world; }, [world]);
  useEffect(() => {
    let stop: (() => void) | undefined, cancelled = false;
    import("./three/interior").then(({ createInterior }) => {
      if (cancelled || !host.current) return;
      try { stop = createInterior(host.current, venue, floor, () => latest.current, clockOffset); }
      catch { setFailed(true); }
    }).catch(() => setFailed(true));
    return () => { cancelled = true; stop?.(); };
  }, [venue, floor, clockOffset]);
  const clock = useLifeClock(world.paused, clockOffset);
  const now = clock ?? Date.parse(world.born);
  const present = [...actorsAt(world, now), ...(world.living ? crowdAt(world.living, world, now) : [])].filter((p) => !p.walking && p.location === venue);
  return <section className="interior-view">
    <div className="interior-heading"><div><small>GÓC QUAN SÁT NỘI THẤT</small><h3>{venue}</h3></div><span>{present.length} người đang ở đây</span></div>
    <div className="scene-choice" aria-label="Tầng quan sát">{[0, 1, 2].map((f) => <button key={f} aria-pressed={floor === f} onClick={() => setFloor(f)}>{f === 0 ? "Tầng trệt" : `Tầng ${f + 1}`}</button>)}</div>
    <div ref={host} className="interior-canvas" role="img" aria-label={`Nội thất ${venue}, tầng ${floor + 1}`} />
    {failed && <p>Thiết bị chưa mở được góc nhìn 3D. Hoạt động cư dân vẫn hiển thị bên dưới.</p>}
    <p className="muted">Mặt cắt hư cấu · Kéo để xoay, cuộn để zoom. Thang máy là hoạt cảnh kiến trúc; chưa điều khiển lộ trình cư dân giữa các tầng.</p>
    <ul>{present.length ? present.map((p) => <li key={p.id}><b>{p.name}</b> · {p.activity}</li>) : <li>Không có cư dân được ghi nhận đang sinh hoạt tại đây.</li>}</ul>
  </section>;
}
