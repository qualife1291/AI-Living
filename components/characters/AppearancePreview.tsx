"use client";
import { useEffect, useRef, useState } from "react";
import type { Appearance } from "@/lib/city/appearance";

/** Draw only on appearance/size changes; no second animation loop in a drawer. */
export function AppearancePreview({ appearance,modelId }: { appearance: Appearance;modelId:string }) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(appearance), update = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { latest.current = appearance; update.current?.(); }, [appearance]);
  useEffect(() => {
    const abort=new AbortController();
    let cancelled = false, dispose: (() => void) | undefined;
    import("../city/three/appearance-preview").then(async({ createAppearancePreview }) => {
      if (cancelled || !host.current) return;
      setFailed(false);
      try {
        const preview = await createAppearancePreview(host.current, () => latest.current,modelId,abort.signal);
        if(cancelled){preview.dispose();return;}
        update.current = preview.draw; dispose = preview.dispose;
      } catch { if(!cancelled)setFailed(true); }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true;abort.abort(); update.current = null; dispose?.(); };
  }, [modelId]);
  return <div className="appearance-preview" ref={host} role="img" aria-label="Xem trước trang phục 3D">
    {failed && <p>Chưa mở được xem trước 3D. Bạn vẫn có thể chọn và lưu màu trang phục.</p>}
  </div>;
}
