"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CloudSun,
  Compass,
  EyeOff,
  GraduationCap,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { InteriorView } from "@/components/city/InteriorView";
import { lifeStory } from "@/lib/city/lifestory";
import { Wardrobe } from "@/components/characters/Wardrobe";
import { UrbanMap } from "@/components/city/UrbanMap";
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
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [selected, setSelected] = useState("an"),
    [panel, setPanel] = useState<Panel>(null),
    [mode, setMode] = useState<"city" | "osm">("city"),
    [renderer, setRenderer] = useState<"3d" | "2d">("3d"),
    [hidden, setHidden] = useState(false),
    [venue, setVenue] = useState<Venue | null>(null),
    [busy, setBusy] = useState(false),
    [clockOffset, setClockOffset] = useState(0),
    [navigation, setNavigation] = useState<{
      x: number;
      y: number;
      key: number;
    } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    restoreFocus = useRef<HTMLElement | null>(null);
  const loading = useRef(false);
  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const response = await fetch("/api/world", { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error("Chưa kết nối được với thành phố.");
      const snapshot = (await response.json()) as Snapshot;
      setClockOffset(Date.parse(snapshot.serverNow) - Date.now());
      setData(snapshot);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally { loading.current = false; }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0),
      timer = setInterval(() => void load(), 15000);
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
      await load();
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
  const story = world ? lifeStory(world, selected, Date.now() + clockOffset) : null;
  const person = people.find((p) => p.id === selected) ?? people[0],
    agent = world?.living?.learning?.[selected];
  const titles: Record<Exclude<Panel, null>, string> = {
    people: "Cư dân trong thành phố",
    context: "Nhịp sống & bối cảnh",
    places: "Những nơi có thể đến",
    learning: "Trải nghiệm & thói quen",
    sources: "Nguồn mở cho thế giới",
  };
  const CityView = mode === "city" && renderer === "3d" ? City3D : UrbanMap;
  return (
    <main className={`live-world ${hidden ? "hud-hidden" : ""}`}>
      {world ? (
        <CityView
          world={world}
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
          mode={mode}
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
      {error && (
        <div className="live-alert" role="alert">
          {error}
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
        <button aria-label="Học hỏi" onClick={() => setPanel("learning")}>
          <GraduationCap size={19} />
          <span>Học hỏi</span>
        </button>
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
          {panel === "context" && <LivingPanel onUpdated={load} />}
          {panel === "people" && (
            <>
              <p>
                Chọn một người để theo dõi trong không gian sống. Nhân vật trong
                mô phỏng này đều là người trưởng thành.
              </p>
              {story && <article className="life-story"><small>HỒ SƠ CUỘC ĐỜI · {story.chapter}</small><h3>{person?.name} · {story.age} tuổi mô phỏng</h3><p>Đến xóm ngày {story.arrivedOn} · {story.days} ngày mô phỏng · {story.samples} trải nghiệm đã học.</p><p className="muted">Tuổi khởi đầu hư cấu {story.baseline}; mỗi năm mô phỏng tăng một tuổi. Không suy ra tuổi từ số lượt học.</p><h4>Những điều còn nhớ</h4><ol>{story.memories.slice(-5).map((m, i) => <li key={i}>{m}</li>)}</ol>{!story.memories.length && <p>Chưa có ký ức được lưu.</p>}</article>}
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
              <div
                className="scene-choice"
                aria-label="Cách hiển thị thành phố"
              >
                <button
                  className={renderer === "3d" ? "active" : ""}
                  onClick={() => {
                    setRenderer("3d");
                    setMode("city");
                    setPanel(null);
                  }}
                >
                  Không gian 3D
                </button>
                <button
                  className={renderer === "2d" ? "active" : ""}
                  onClick={() => {
                    setRenderer("2d");
                    setMode("city");
                    setPanel(null);
                  }}
                >
                  Bản đồ 2D · nhẹ
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
