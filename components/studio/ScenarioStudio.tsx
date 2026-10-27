"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Pause, RotateCcw, Clapperboard } from "lucide-react";
import { scenarioDefinitions, scenarioFrame, type ScenarioId } from "@/lib/city/scenarios";
import type { StudioRuntime } from "./runtime";

export function ScenarioStudio() {
  const [id, setId] = useState<ScenarioId>("wallet-return"), [time, setTime] = useState(0), [playing, setPlaying] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState("");
  const host = useRef<HTMLDivElement>(null), input = useRef({ id, time }), runtime = useRef<StudioRuntime | null>(null);
  useEffect(() => { input.current = { id, time }; }, [id, time]);
  useEffect(() => {
    let cancelled = false;
    import("./runtime").then(async ({ createStudio }) => {
      if (!host.current || cancelled) return;
      const view = await createStudio(host.current, () => input.current);
      if (cancelled) view.dispose(); else { runtime.current = view; setReady(true); }
    }).catch(() => setError("Chưa mở được trường quay 3D. Hãy tải lại hoặc dùng thiết bị hỗ trợ WebGL2."));
    return () => { cancelled = true; runtime.current?.dispose(); runtime.current = null; };
  }, []);
  useEffect(() => {
    if (!playing || !ready) return;
    let last = performance.now(), handle = 0;
    const tick = (now: number) => { const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now; if (!document.hidden) setTime(t => Math.min(120, t + dt)); handle = requestAnimationFrame(tick); };
    handle = requestAnimationFrame(tick); return () => cancelAnimationFrame(handle);
  }, [playing, ready]);
  const definition = scenarioDefinitions.find(s => s.id === id)!, frame = scenarioFrame(id, time), line = frame.dialogue[0];
  const stamp = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  return <main className="scenario-studio">
    <div ref={host} className="studio-canvas" aria-label="Trường quay kịch bản 3D" />
    <header className="studio-top"><Link href="/" aria-label="Trở về xóm"><ArrowLeft size={19} /></Link><div><b><Clapperboard size={16} />Chuyện trong xóm</b><small>Trường quay mô phỏng · Không thay đổi cuộc sống đang chạy</small></div><label><span className="sr-only">Chọn kịch bản</span><select aria-label="Chọn kịch bản" value={id} onChange={e => { setPlaying(false); setTime(0); setId(e.target.value as ScenarioId); }}>{scenarioDefinitions.map(s => <option value={s.id} key={s.id}>{s.title}</option>)}</select></label></header>
    {!ready && <p className="studio-loading">{error || "Đang dựng trường quay và tải model…"}</p>}
    <aside className="studio-cast"><strong>{definition.subtitle}</strong><div>{definition.cast.map(a => <span key={a.id}><b>{a.name}</b><small>{a.age} {a.ageUnit === "months" ? "tháng" : "tuổi"} · {a.role}</small></span>)}</div></aside>
    {line && <div className="studio-dialogue"><b>{frame.actors.find(a => a.id === line.speaker)?.name}</b><span>{line.text}</span></div>}
    <section className="studio-timeline" aria-label="Điều khiển kịch bản"><div><button disabled={!ready} aria-label={playing && time < 120 ? "Tạm dừng kịch bản" : "Phát kịch bản"} onClick={() => { if (time >= 120) setTime(0); setPlaying(!playing || time >= 120); }}>{playing && time < 120 ? <Pause size={19} /> : <Play size={19} />}</button><button aria-label="Xem lại từ đầu" onClick={() => { setTime(0); setPlaying(false); }}><RotateCcw size={17} /></button><b>{frame.beat.label}</b><small>{frame.camera.lensMm.toFixed(0)}mm</small><output>{stamp(time)} / 2:00</output></div><input type="range" aria-label="Thời gian kịch bản" min="0" max="120" step="0.1" value={time} onChange={e => { setPlaying(false); setTime(Number(e.target.value)); }} /><div className="studio-beats">{definition.shots.map((shot, i) => <button key={shot.at} onClick={() => { setPlaying(false); setTime(shot.at + .1); }} aria-label={`Phân cảnh ${i + 1}`} className={frame.beat.index === i ? "active" : ""}>{String(i + 1).padStart(2, "0")}<span>{shot.label}</span></button>)}</div></section>
    <details className="studio-notes"><summary>Bối cảnh & nguồn</summary><p>{frame.theme.phase} · {frame.theme.atmosphere}</p><p>Model Kenney CC0. Clip hoạt động, tỷ lệ và chuyển cảnh được dựng từ timeline. Chi tiết ngón tay, da vi mô và khẩu độ xóa phông chưa được mô phỏng đầy đủ.</p>{definition.notes.map(n => <p key={n}>{n}</p>)}</details>
  </main>;
}
