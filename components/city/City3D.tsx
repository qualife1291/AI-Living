"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, LocateFixed, Minus, Plus, Scan, MessageCircle, Footprints, Coffee } from "lucide-react";
import { WorldOverlays } from "./WorldOverlays";
import { WebGLUnavailable } from "./WebGLUnavailable";
import type { CityRuntime, SceneInput, SceneStatus } from "./three/runtime";
import type { Venue } from "@/lib/city/world";

type Props = SceneInput & {
  onSelect: (id: string) => void;
  onVenue: (v: Venue) => void;
  onInspect: () => void;
};
export function City3D(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    runtime = useRef<CityRuntime | null>(null),
    latest = useRef(props);
  const [failed, setFailed] = useState(false),
    [status, setStatus] = useState<SceneStatus | null>(null);
  const presented = useCallback((key: string) => runtime.current?.presentSpeech(key), []);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    if (failed) return;
    let cancelled = false;
    const startedAt = performance.now();
    import("./three/runtime")
      .then(async ({ createCity }) => {
        if (cancelled || !host.current) return;
        const { AssetLibrary } = await import("./three/assets");
        const assets = await new AssetLibrary().preload();
        if (cancelled || !host.current) { assets.dispose(); return; }
        host.current.dataset.startedAt = String(startedAt);
        try {
          runtime.current = createCity(host.current, () => latest.current, {
            select: (id) => latest.current.onSelect(id),
            venue: (v) => latest.current.onVenue(v),
            status: setStatus,
            fatal: () => setFailed(true),
          }, assets);
        } catch {
          assets.dispose();
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      runtime.current?.dispose();
      runtime.current = null;
    };
  }, [failed]);
  if (failed) return <WebGLUnavailable retry={() => { setStatus(null); setFailed(false); }} />;
  return (
    <div className="urban-map-host city-three">
      <div ref={host} className="three-canvas" />
      {!status && <div className="three-notice">Đang dựng thành phố 3D…</div>}
      {status && <WorldOverlays status={status} onSelect={props.onSelect} onPresented={presented} />}
      <div className="live-hud live-person">
        <span className="person-indicator">{status?.walking ? <Footprints size={16}/> : <Coffee size={16}/>}</span>
        <button onClick={props.onInspect}>
          <b>{status?.name ?? "An"}</b>
          <small>{props.world.paused ? "Đang tạm nghỉ · Nhấn ▶ để tiếp tục" : status?.activity ?? "Đang mở không gian 3D"}</small>
        </button>
        <button className="person-talk" aria-label={`Trò chuyện với ${status?.name ?? "An"}`} title="Trò chuyện" onClick={props.onInspect}><MessageCircle size={20}/></button>
        <span className="live-person-count">
          {props.world.people.length +
            (props.world.living?.residents.length ?? 0)}{" "}
          cư dân
        </span>
      </div>
      <div className="urban-camera" aria-label="Điều khiển không gian 3D">
        <button
          aria-label="Phóng to"
          onClick={() => runtime.current?.zoom(0.8)}
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="Thu nhỏ"
          onClick={() => runtime.current?.zoom(1.25)}
        >
          <Minus size={17} />
        </button>
        <button
          aria-label="Theo nhân vật"
          title="Góc điện ảnh · theo An"
          aria-pressed={status?.following ?? true}
          onClick={() => runtime.current?.follow()}
        >
          <LocateFixed size={17} />
        </button>
        <button
          aria-label="Khu cao ốc"
          onClick={() => runtime.current?.skyline()}
        >
          <Building2 size={17} />
        </button>
        <button
          aria-label="Toàn cảnh thành phố"
          onClick={() => runtime.current?.overview()}
        >
          <Scan size={17} />
        </button>
      </div>
      <div className="map-credit">
        Thành phố 3D mô phỏng · Kéo để xoay · Chuột phải / hai ngón để dịch ·
        Cuộn để zoom · Phím mũi tên khi chọn khung 3D
      </div>
    </div>
  );
}
