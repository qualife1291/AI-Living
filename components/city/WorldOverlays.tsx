"use client";
import { useEffect, useRef, useState } from "react";
import { nameLabels, speechRect } from "@/lib/city/overlay-layout";
import type { SceneStatus } from "./three/runtime";

export function WorldOverlays({ status, onSelect, onPresented }: { status: SceneStatus; onSelect: (id: string) => void; onPresented: (key: string) => void }) {
  const bubble = useRef<HTMLDivElement>(null), [size,setSize] = useState({ width: 292, height: 140 });
  const visible = status.visible && !!status.speech;
  useEffect(() => {
    if (!bubble.current) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0].target.getBoundingClientRect();
      setSize(old => old.width === rect.width && old.height === rect.height ? old : { width: rect.width, height: rect.height });
    });
    observer.observe(bubble.current); return () => observer.disconnect();
  }, [visible]);
  useEffect(() => { if (visible && status.speechKey) onPresented(status.speechKey); }, [visible,status.speechKey,onPresented]);
  const viewport = { width: status.viewportWidth, height: status.viewportHeight };
  const rect = visible ? speechRect(status,size,viewport) : undefined;
  const labels = nameLabels(status.labels,viewport,rect);
  return <div className="world-overlays">
    {labels.map(label => <button key={label.id} className={`actor-name${label.selected ? " is-selected" : ""}${label.speaking ? " is-speaking" : ""}`} title={label.name} aria-label={`Theo dõi ${label.name}`} aria-pressed={label.selected}
      style={{ width: label.width, transform: `translate3d(${label.x}px,${label.y}px,0)` }} onClick={() => onSelect(label.id)}>
      <span className="actor-name-dot" aria-hidden="true"/><span>{label.name}</span>
    </button>)}
    {visible && rect && <div ref={bubble} className={`three-speech${rect.y > status.y ? " is-below" : ""}`} style={{ left: rect.x, top: rect.y, '--speech-pointer': `${Math.max(20,Math.min(rect.width-20,status.x-rect.x))}px` } as React.CSSProperties}>
      <div className="speech-heading"><strong>{status.speaker} <span aria-hidden="true">→</span> {status.listener}</strong><em title={status.conversationSource === "ai" ? "Hội thoại do model sinh và đã lưu" : "Cảnh biên soạn, phát theo luật mô phỏng"}>{status.conversationSource === "ai" ? "AI" : "Kịch bản"}</em></div>
      <p>{status.speech}</p>
    </div>}
  </div>;
}
