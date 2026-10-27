"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Box,
  Clapperboard,
  CloudSun,
  Compass,
  EyeOff,
  GraduationCap,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  Eye,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Conversation } from "@/components/city/Conversation";
import type { Quality } from "@/lib/city/scale";
import { Osm3D } from "@/components/city/Osm3D";
import { InteriorView } from "@/components/city/InteriorView";
import { householdFor } from "@/lib/living/households";
import { lifeStory } from "@/lib/city/lifestory";
import { PetCare } from "@/components/characters/PetCare";
import { Wardrobe } from "@/components/characters/Wardrobe";
import { City3D } from "@/components/city/City3D";
import { LivingPanel } from "@/components/living/LivingPanel";
import { venues, type Venue } from "@/lib/city/world";
import sources from "@/data/city/sources.json";
import { scenarios } from "@/lib/living/learning";
import type { World, EpisodeEvent } from "@/lib/world";
import type { WeatherState } from "@/lib/clock";

type Snapshot = {
  revision: number;
  serverNow: string;
  world: World;
  events: EpisodeEvent[];
  weatherState: WeatherState;
};
type Panel = "people" | "context" | "places" | "learning" | "sources" | null;
export default function Page() {
  const router = useRouter();
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [selected, setSelected] = useState("an"),
    [panel, setPanel] = useState<Panel>(null),
    [mode, setMode] = useState<"city" | "osm">("city"),
    [hidden, setHidden] = useState(false),
    [venue, setVenue] = useState<Venue | null>(null),
    [busy, setBusy] = useState(false),
    [clockOffset, setClockOffset] = useState(0),
    [quality, setQuality] = useState<Quality>("balanced"),
    [views, setViews] = useState<number | null>(null),
    [pulseError, setPulseError] = useState(""),
    [navigation, setNavigation] = useState<{
      x: number;
      y: number;
      key: number;
    } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    restoreFocus = useRef<HTMLElement | null>(null);
  const loading = useRef(0);
  const newest = useRef({revision:-1,serverMs:0});
  const load = useCallback(async (force = false) => {
    if (loading.current > 0 && !force) return;
    loading.current++;
    try {
      const sentAt = Date.now();
      const response = await fetch("/api/world?compact=1", { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error("Chưa kết nối được với thành phố.");
      const snapshot = (await response.json()) as Snapshot;
      const serverMs=Date.parse(snapshot.serverNow);
      if(snapshot.revision < newest.current.revision || (snapshot.revision === newest.current.revision && serverMs < newest.current.serverMs))return;
      newest.current={revision:snapshot.revision,serverMs};
      const measuredOffset = serverMs - (sentAt + Date.now()) / 2;
      setClockOffset(previous => Math.abs(measuredOffset - previous) > 5000 ? measuredOffset : previous * .85 + measuredOffset * .15);
      setData(snapshot);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally { loading.current--; }
  }, []);
  useEffect(() => {
    let cancelled=false, pulsing=false;
    async function pulse(){
      if(document.hidden||pulsing)return;
      pulsing=true;
      try{
        const r=await fetch('/api/living/pulse',{method:'POST',headers:{'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(12000)});
        if(!cancelled){if(!r.ok&&r.status!==409)setPulseError('Nhịp sống chưa cập nhật. Thử kết nối lại.');else setPulseError('');await load();}
      }catch{if(!cancelled)setPulseError('Mất kết nối nhịp sống. Thành phố vẫn giữ trạng thái đã lưu.');}finally{pulsing=false;}
    }
    async function visit(){
      let session=crypto.randomUUID();
      try{const old=JSON.parse(sessionStorage.getItem('xom-view')??'null');if(old&&Date.now()-old.at<1800000)session=old.id;else sessionStorage.setItem('xom-view',JSON.stringify({id:session,at:Date.now()}));}catch{/* storage is optional */}
      try{const r=await fetch('/api/visits',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session})});if(r.ok&&!cancelled)setViews(((await r.json()) as {views:number}).views);}catch{/* counter does not block viewing */}
    }
    const initial=setTimeout(()=>{void pulse();void visit();},0),timer=setInterval(()=>void pulse(),10000);
    return()=>{cancelled=true;clearTimeout(initial);clearInterval(timer);};
  },[load]);
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0),
      timer = setInterval(() => { if(!document.hidden) void load(); }, 15000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);
  useEffect(() => {
    if (!panel) return;
    restoreFocus.current = document.activeElement as HTMLElement;
    const frame = requestAnimationFrame(() => dialog.current?.showModal());
    return () => {
      cancelAnimationFrame(frame);
      restoreFocus.current?.focus();
    };
  }, [panel]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as Element)?.closest("input,textarea,select")) return;
      if (e.key.toLowerCase() === "h" && !panel) setHidden((v) => !v);
      if (e.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [panel]);
  async function pause() {
    if (!data || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/world", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          revision: data.revision,
          paused: !data.world.paused,
        }),
      });
      if (!r.ok) throw Error("Trạng thái vừa đổi, hãy thử lại.");
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi thao tác");
    } finally {
      setBusy(false);
    }
  }
  const world = data?.world;
  const people = world
    ? [
        ...world.people.map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          memories: p.memories,
        })),
        ...(world.living?.residents.map((p) => ({
          id: p.id,
          name: p.name,
          role:
            world.living?.catalog.roles.find((r) => r.id === p.roleId)?.label ??
            "Hàng xóm",
          memories: p.memories,
        })) ?? []),
      ]
    : [];
  const story = world ? lifeStory(world, selected, Date.parse(data!.serverNow)) : null;
  const person = people.find((p) => p.id === selected) ?? people[0],
    agent = world?.living?.learning?.[selected];
  const homeGroup = householdFor(world?.living,person?.id ?? selected);
  const titles: Record<Exclude<Panel, null>, string> = {
    people: "Cư dân trong thành phố",
    context: "Nhịp sống & bối cảnh",
    places: "Những nơi có thể đến",
    learning: "Trải nghiệm & thói quen",
    sources: "Nguồn mở cho thế giới",
  };
  const CityView = mode === "osm" ? Osm3D : City3D;
  return (
    <main className={`live-world ${hidden ? "hud-hidden" : ""}`}>
      {world ? (
        <CityView
          world={world}
          quality={quality}
          events={data?.events ?? []}
          selected={selected}
          onSelect={(id) => {
            setSelected(id);
            setVenue(null);
          }}
          onVenue={(v) => {
            setVenue(v);
            setPanel("places");
          }}
          onInspect={() => setPanel("people")}
          target={navigation}
          clockOffsetMs={clockOffset}
        />
      ) : (
        <div className="live-loading">
          <span className="live-dot" /> Đang mở thành phố của An…
        </div>
      )}
      <header className="live-hud live-top">
        <div className="live-brand">
          <span className="live-dot" />
          <div>
            <b>Xóm AI</b>
            <small>
              {mode === "osm"
                ? "Khảo sát bản đồ TP.HCM"
                : "Một thành phố, nhiều cuộc đời."}
            </small>
          </div>
        </div>
        {views!==null&&<div className="view-count" title="Lượt mở theo phiên 30 phút, không phải số người duy nhất"><Eye size={15}/><span>{views.toLocaleString('vi-VN')}</span></div>}
        <div className="live-status">
          <CloudSun size={16} />
          <span>{data?.weatherState.label ?? "TP.HCM"}</span>
          <time>
            {data
              ? new Date(data.serverNow).toLocaleTimeString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </time>
        </div>
        <button
          className="live-icon"
          aria-label={world?.paused ? "Tiếp tục" : "Tạm nghỉ"}
          disabled={busy || !world}
          onClick={() => void pause()}
        >
          {world?.paused ? <Play size={17} /> : <Pause size={17} />}
        </button>
      </header>
      {(error || pulseError) && (
        <div className="live-alert" role="alert">
          {error || pulseError}
          <button onClick={() => void load()} aria-label="Thử kết nối lại">
            <RefreshCw size={15} />
          </button>
        </div>
      )}
      <nav
        className="live-hud live-dock"
        aria-label="Điều khiển không gian sống"
      >
        <button aria-label="Cư dân" onClick={() => setPanel("people")}>
          <Users size={19} />
          <span>Cư dân</span>
        </button>
        <button
          aria-label="Địa điểm"
          onClick={() => {
            setVenue(null);
            setPanel("places");
          }}
        >
          <Compass size={19} />
          <span>Địa điểm</span>
        </button>
        <button aria-label="Bối cảnh" onClick={() => setPanel("context")}>
          <BookOpen size={19} />
          <span>Bối cảnh</span>
        </button>
        <button aria-label="Chất lượng đồ họa" title={`Đồ họa: ${quality === 'sharp' ? 'Nét' : quality === 'eco' ? 'Nhẹ' : 'Cân bằng'}`} onClick={()=>setQuality(q=>q==='balanced'?'sharp':q==='sharp'?'eco':'balanced')}><Sparkles size={19}/><span>{quality==='sharp'?'Nét':quality==='eco'?'Nhẹ':'Đồ họa'}</span></button>
        <button aria-label="Học hỏi" onClick={() => setPanel("learning")}>
          <GraduationCap size={19} />
          <span>Học hỏi</span>
        </button>
        <button aria-label="Kịch bản mô phỏng" title="Bốn câu chuyện trong trường quay riêng" onClick={() => { router.push("/studio"); }}><Clapperboard size={19} /><span>Kịch bản</span></button>
        <button aria-label="Ẩn giao diện" onClick={() => setHidden(true)}>
          <EyeOff size={18} />
          <span>Ẩn</span>
        </button>
        <button
          aria-label="Toàn màn hình"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else
              void document.documentElement.requestFullscreen().catch(() => {});
          }}
        >
          <Maximize2 size={18} />
          <span>Toàn màn hình</span>
        </button>
      </nav>
      <button
        className="live-reveal"
        onClick={() => setHidden(false)}
        aria-label="Hiện giao diện"
      >
        Hiện giao diện · H
      </button>
      {panel && (
        <dialog
          ref={dialog}
          className="live-drawer"
          onCancel={() => setPanel(null)}
          onClose={() => setPanel(null)}
        >
          <div className="drawer-heading">
            <div>
              <small>XÓM AI · {person?.name ?? "An"}</small>
              <h2>{titles[panel]}</h2>
            </div>
            <button
              autoFocus
              aria-label="Đóng bảng thông tin"
              onClick={() => {
                dialog.current?.close();
                setPanel(null);
              }}
            >
              <X size={20} />
            </button>
          </div>
          {panel === "context" && <><button className="asset-library-link" onClick={()=>router.push('/assets')}><Box size={18}/>Khám phá model & chuyển động 3D</button><LivingPanel onUpdated={load} /></>}
          {panel === "people" && (
            <>
              <p>Hỏi chuyện, xem ký ức hoặc chọn một cư dân để theo dõi.</p>
              {world && <PetCare world={world} refresh={load} />}
              {story && <details className="life-story"><summary><b>{person?.name} · {story.age} tuổi mô phỏng</b><small>{story.chapter} · {story.samples} trải nghiệm</small></summary><p>Đến xóm ngày {story.arrivedOn} · {story.days} ngày mô phỏng · {story.samples} trải nghiệm đã học.</p><p className="muted">Tuổi khởi đầu hư cấu {story.baseline}; mỗi năm mô phỏng tăng một tuổi. Không suy ra tuổi từ số lượt học.</p><h4>Những điều còn nhớ</h4><ol>{story.memories.slice(-5).map((m, i) => <li key={i}>{m}</li>)}</ol>{!story.memories.length && <p>Chưa có ký ức được lưu.</p>}</details>}
              {homeGroup && <div className="resident-home"><b>{homeGroup.home.label}</b><span>{homeGroup.home.place} · {homeGroup.members.length} người ở chung</span><small>{homeGroup.members.map(r => r.name).join(" · ")}</small></div>}
              {person && world && <Conversation key={person.id} actorId={person.id} name={person.name} paused={world.paused}/>}
              <details className="wardrobe-details">
                <summary>Tạo hình của {person?.name ?? "An"}</summary>
                {person && (
                  <Wardrobe
                    key={person.id}
                    id={person.id}
                    role={person.role}
                    initial={world?.living?.appearances?.[person.id]}
                    onSaved={load}
                  />
                )}
              </details>
              <div className="people-grid">
                {people.map((p) => (
                  <button
                    className={p.id === selected ? "active" : ""}
                    key={p.id}
                    onClick={() => {
                      setSelected(p.id);
                      setMode("city");
                      setPanel(null);
                    }}
                  >
                    <span>{p.name.slice(0, 1)}</span>
                    <div>
                      <b>{p.name}</b>
                      <small>{p.role}</small>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          {panel === "places" && (
            <>
              <div className="scene-choice">
                <button
                  className={mode === "city" ? "active" : ""}
                  onClick={() => {
                    setMode("city");
                    setPanel(null);
                  }}
                >
                  Thành phố sống
                </button>
                <button
                  className={mode === "osm" ? "active" : ""}
                  onClick={() => {
                    setMode("osm");
                    setPanel(null);
                  }}
                >
                  Tái dựng từ OpenStreetMap
                </button>
              </div>
              {venue && (
                <p className="venue-detail">
                  <b>{venue.name}</b> ·{" "}
                  {scenarios
                    .filter((s) => s.place === venue.name)
                    .map((s) => s.title)
                    .join(" · ") || "Sinh hoạt và gặp gỡ trong thành phố."}
                </p>
              )}
              {venue && world && <InteriorView key={venue.name} world={world} venue={venue.name} clockOffset={clockOffset} />}
              <div className="venue-grid">
                {venues.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => {
                      setVenue(v);
                      setNavigation((old) => ({
                        x: v.x,
                        y: v.y,
                        key: (old?.key ?? 0) + 1,
                      }));
                      setMode("city");
                    }}
                  >
                    <b>{v.name}</b>
                    <small>
                      {scenarios.filter((s) => s.place === v.name).length || 1}{" "}
                      hoạt động
                    </small>
                  </button>
                ))}
              </div>
              <p className="muted">
                Chế độ OpenStreetMap tái dựng đường/công trình từ dữ liệu thật;
                không phải nguồn giao thông hay lịch chuyến xe trực tiếp.
              </p>
            </>
          )}
          {panel === "learning" && (
            <>
              <p>
                Mỗi cư dân có mô hình lựa chọn hoạt động riêng. Sau trải nghiệm
                đã hoàn tất, phản hồi điều chỉnh thói quen cho lần tiếp theo.
              </p>
              <div className="learning-summary">
                <strong>
                  {Object.keys(world?.living?.learning ?? {}).length}
                </strong>
                <span>mô hình cư dân</span>
                <strong>
                  {Object.values(world?.living?.learning ?? {}).reduce(
                    (s, a) => s + a.samples,
                    0,
                  )}
                </strong>
                <span>trải nghiệm đã học</span>
              </div>
              <p>
                {Object.keys(world?.living?.animalLearning ?? {}).length} mô
                hình tập tính động vật ·{" "}
                {Object.values(world?.living?.animalLearning ?? {}).reduce(
                  (sum, a) => sum + a.samples,
                  0,
                )}{" "}
                phản hồi. Động vật giữ hành vi theo loài, không nói tiếng người.
              </p>
              <h3>{person?.name} đang học gì?</h3>
              {agent ? (
                <>
                  <p>
                    Năng lượng {Math.round(agent.energy)}/100 · Sức khỏe mô
                    phỏng {agent.health}/100 · Kỹ năng {agent.skill}/100
                  </p>
                  <p>
                    {agent.samples} phản hồi hoàn tất ·{" "}
                    {agent.employment === "seeking"
                      ? "Đang tìm việc"
                      : agent.employment === "studying"
                        ? "Đang học thêm"
                        : "Có nhịp công việc"}
                  </p>
                  <ul>
                    {agent.memories
                      .slice(-8)
                      .reverse()
                      .map((memory, i) => (
                        <li key={i}>{memory.split("; phản hồi")[0]}</li>
                      ))}
                  </ul>
                </>
              ) : (
                <p>
                  Đang chờ lượt sinh hoạt đầu tiên để bắt đầu lưu trải nghiệm.
                </p>
              )}
              <details>
                <summary>Phạm vi học và dữ liệu</summary>
                <p>
                  Hiện đã có mô hình lựa chọn hoạt động học từ phản hồi. Mô hình
                  ngôn ngữ Qwen sinh hội thoại; trọng số Qwen chưa được
                  fine-tune tự động. Dữ liệu tự sinh cần đánh giá trước khi dùng
                  huấn luyện lớn.
                </p>
                <a href="/api/living/learning?format=jsonl" download>
                  Xuất trải nghiệm gần đây
                </a>
              </details>
            </>
          )}
          {panel === "sources" && (
            <>
              <div className="source-registry">
                {sources.map((source) => (
                  <article key={source.name}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.name}
                    </a>
                    <small> · {source.license}</small>
                    <p>{source.use}</p>
                  </article>
                ))}
              </div>
              <p>
                Bản đồ:{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenStreetMap contributors · ODbL
                </a>
                .
              </p>
              <p>
                Tham khảo tài sản:{" "}
                <a
                  href="https://kenney.nl/assets/city-kit-commercial"
                  target="_blank"
                  rel="noreferrer"
                >
                  Kenney City Kit · CC0
                </a>
                ;{" "}
                <a
                  href="https://docs.ambientcg.com/license/"
                  target="_blank"
                  rel="noreferrer"
                >
                  ambientCG · CC0
                </a>
                .
              </p>
              <p>
                Các công trình và phương tiện đang hiển thị được vẽ bằng thư
                viện SVG của dự án. Nguồn bản đồ/tài sản và phạm vi sử dụng được
                ghi trong tài liệu.
              </p>
            </>
          )}
          <footer className="drawer-footer">
            <button onClick={() => setPanel("sources")}>
              Nguồn & giấy phép
            </button>
            <a href="/dashboard">Bảng chi tiết</a>
          </footer>
        </dialog>
      )}
    </main>
  );
}
