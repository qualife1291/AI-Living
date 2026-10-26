"use client";
import { useEffect, useRef, useState } from "react";
import { Building2, LocateFixed, Minus, Plus, Scan, MessageCircle, Footprints, Coffee } from "lucide-react";
import { UrbanMap } from "./UrbanMap";
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
  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    if (failed) return;
    let cancelled = false;
    import("./three/runtime")
      .then(({ createCity }) => {
        if (cancelled || !host.current) return;
        try {
          runtime.current = createCity(host.current, () => latest.current, {
            select: (id) => latest.current.onSelect(id),
            venue: (v) => latest.current.onVenue(v),
            status: setStatus,
            fatal: () => setFailed(true),
          });
        } catch {
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
  if (failed)
    return (
      <>
        <UrbanMap {...props} />
        <div className="three-notice">
          Thiết bị chưa mở được 3D · Đang dùng 2D
        </div>
      </>
    );
  return (
    <div className="urban-map-host city-three">
      <div ref={host} className="three-canvas" />
      {!status && <div className="three-notice">Đang dựng thành phố 3D…</div>}
      {status?.visible && status.speech && (
        <div
          className="three-speech live-speech"
          style={{ left: status.x, top: status.y }}
        >
          <strong>{status.speaker} <span aria-hidden="true">→</span> {status.listener} <em title={status.conversationSource === "ai" ? "Hội thoại do model sinh và đã lưu" : "Cảnh biên soạn bởi agent, phát theo mô phỏng"}>{status.conversationSource === "ai" ? "AI" : "Kịch bản"}</em></strong>
          <span>{status.speech}</span>
        </div>
      )}
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
        Cuộn để zoom
      </div>
    </div>
  );
}
