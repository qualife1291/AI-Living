"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Play, Pause, RotateCcw, Clapperboard, Volume2, VolumeX } from "lucide-react";
import { scenarioDefinitions, scenarioFrame, type ScenarioId } from "@/lib/city/scenarios";
import {StudioSound} from "./sound";
import type { StudioRuntime } from "./runtime";

export function ScenarioStudio() {
  const [id, setId] = useState<ScenarioId>("wallet-return"), [time, setTime] = useState(0), [playing, setPlaying] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState("");
  const [soundOn,setSoundOn]=useState(false),[soundStatus,setSoundStatus]=useState("off");
  const sound=useRef<StudioSound|null>(null);
  const host = useRef<HTMLDivElement>(null), input = useRef({ id, time }), runtime = useRef<StudioRuntime | null>(null);
  useEffect(() => { input.current = { id, time }; }, [id, time]);
  useEffect(() => {
    let cancelled = false;
    sound.current=new StudioSound(state=>{if(host.current)host.current.dataset.audio=JSON.stringify(state);if(!cancelled)setSoundStatus(state.status);});
    const abort = new AbortController();
    import("./runtime").then(async ({ createStudio }) => {
      if (!host.current || cancelled) return;
      const view = await createStudio(host.current, () => input.current, abort.signal);
      if (cancelled) view.dispose(); else { runtime.current = view; setReady(true); }
    }).catch(() => { if (!cancelled) setError("Chưa mở được trường quay 3D. Hãy tải lại hoặc dùng thiết bị hỗ trợ WebGL2."); });
    return () => { cancelled = true; sound.current?.dispose();sound.current=null; abort.abort(); runtime.current?.dispose(); runtime.current = null; };
  }, []);
  useEffect(() => {
    if (!playing || !ready) return;
    let last = performance.now(), handle = 0;
    const resetAnchor = () => { last = performance.now(); };
    const tick = (now: number) => { const dt = Math.max(0, (now - last) / 1000); last = now; if (!document.hidden) setTime(t => Math.min(120, t + dt)); handle = requestAnimationFrame(tick); };
    document.addEventListener("visibilitychange", resetAnchor);
    handle = requestAnimationFrame(tick); return () => { cancelAnimationFrame(handle); document.removeEventListener("visibilitychange", resetAnchor); };
  }, [playing, ready]);
  useEffect(()=>{const leave=(event:PageTransitionEvent)=>{setPlaying(false);setSoundOn(false);if(event.persisted)sound.current?.mute();else{sound.current?.dispose();runtime.current?.dispose();sound.current=null;runtime.current=null;}};window.addEventListener('pagehide',leave);return()=>window.removeEventListener('pagehide',leave);},[]);
  const definition = scenarioDefinitions.find(s => s.id === id)!, frame = scenarioFrame(id, time), line = frame.dialogue[0];
  useEffect(()=>{sound.current?.sync(frame,playing&&time<120);});
  useEffect(()=>{const hidden=()=>{if(document.hidden)sound.current?.sync(scenarioFrame(input.current.id,input.current.time),false);};document.addEventListener("visibilitychange",hidden);return()=>document.removeEventListener("visibilitychange",hidden);},[]);
  const stamp = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  return <main className="scenario-studio">
    <div ref={host} className="studio-canvas" aria-label="Trường quay kịch bản 3D" />
    <header className="studio-top"><a href="/" aria-label="Trở về xóm"><ArrowLeft size={19} /></a><div><b><Clapperboard size={16} />Chuyện trong xóm</b><small>Trường quay mô phỏng · Không thay đổi cuộc sống đang chạy</small></div><label><span className="sr-only">Chọn kịch bản</span><select aria-label="Chọn kịch bản" value={id} onChange={e => { setPlaying(false); setTime(0); setId(e.target.value as ScenarioId); }}>{scenarioDefinitions.map(s => <option value={s.id} key={s.id}>{s.title}</option>)}</select></label></header>
    {!ready && <p className="studio-loading">{error || "Đang dựng trường quay và tải model…"}</p>}
    <aside className="studio-cast"><strong>{definition.subtitle}</strong><div>{definition.cast.map(a => <span key={a.id}><b>{a.name}</b><small>{a.age} {a.ageUnit === "months" ? "tháng" : "tuổi"} · {a.role}</small></span>)}</div></aside>
    {line && <div className="studio-dialogue"><b>{frame.actors.find(a => a.id === line.speaker)?.name}</b><span>{line.text}</span></div>}
    <section className="studio-timeline" aria-label="Điều khiển kịch bản"><div><button disabled={!ready} aria-label={playing && time < 120 ? "Tạm dừng kịch bản" : "Phát kịch bản"} onClick={() => { if (time >= 120) setTime(0); setPlaying(!playing || time >= 120); }}>{playing && time < 120 ? <Pause size={19} /> : <Play size={19} />}</button><button aria-label="Xem lại từ đầu" onClick={() => { setTime(0); setPlaying(false); }}><RotateCcw size={17} /></button><button aria-label={soundOn?"Tắt âm thanh":"Bật âm thanh"} aria-pressed={soundOn} title={soundOn?"Tắt âm thanh":"Bật lời thoại và âm thanh"} onClick={async()=>{if(soundOn){sound.current?.mute();setSoundOn(false);}else{setSoundOn(true);if(!await sound.current?.enable())setSoundOn(false);}}}>{soundOn?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><b>{frame.beat.label}</b><small>{frame.camera.lensMm.toFixed(0)}mm</small><output>{stamp(time)} / 2:00</output></div><input type="range" aria-label="Thời gian kịch bản" min="0" max="120" step="0.1" value={time} onChange={e => { setPlaying(false); setTime(Number(e.target.value)); }} /><div className="studio-beats">{definition.shots.map((shot, i) => <button key={shot.at} onClick={() => { setPlaying(false); setTime(shot.at + .1); }} aria-label={`Phân cảnh ${i + 1}`} className={frame.beat.index === i ? "active" : ""}>{String(i + 1).padStart(2, "0")}<span>{shot.label}</span></button>)}</div></section>
    <details className="studio-notes"><summary>Bối cảnh & nguồn</summary><p>{frame.theme.phase} · {frame.theme.atmosphere}</p><p>Nhân vật rig CC0 cùng phong cách với xóm; chuyển động và đạo cụ theo timeline. Lời thoại là giọng Việt tổng hợp, bật bằng nút loa. <a href="/audio/studio/LICENSE.txt" target="_blank" rel="noreferrer">Nguồn âm thanh CC BY 4.0</a>.</p>{soundStatus==="unavailable"&&<p role="status">Thiết bị chưa mở được âm thanh. Phụ đề vẫn hiển thị.</p>}{soundStatus==="partial"&&<p role="status">Một số lời thoại chưa tải được. Âm nền và phụ đề vẫn hoạt động.</p>}{definition.notes.map(n => <p key={n}>{n}</p>)}</details>
  </main>;
}
