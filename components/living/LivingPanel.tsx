"use client";
import { useCallback, useEffect, useState } from "react";
import type { LivingState, LivingTurn, RealContext } from "@/lib/living/schema";
import { PLACES, STEP_KINDS } from "@/lib/event-schema";

type View = {
  revision: number;
  living: LivingState;
  context: RealContext;
  turns: LivingTurn[];
  world: { paused: boolean };
};
export function LivingPanel({ onUpdated }: { onUpdated: () => Promise<void> }) {
  const [view, setView] = useState<View | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [role, setRole] = useState(""),
    [place, setPlace] = useState<string>("Quán cà phê"),
    [activity, setActivity] = useState("Gặp gỡ và học hỏi"),
    [greeting, setGreeting] = useState("Bạn ngồi đây với mình một lát nhé."),
    [kind, setKind] = useState<string>("social");
  const load = useCallback(async () => {
    const r = await fetch("/api/living");
    if (!r.ok) throw Error("Chưa đọc được bối cảnh. Kiểm tra migration local.");
    const data = (await r.json()) as View;
    setView(data);
    setError("");
    return data;
  }, []);
  const tick = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/living/tick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!r.ok)
        throw Error(
          r.status === 409
            ? "Xóm đang tạm nghỉ hoặc vừa thay đổi."
            : "Chưa ghi được lượt sinh hoạt.",
        );
      await load();
      await onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi sinh hoạt");
    } finally {
      setBusy(false);
    }
  }, [load, onUpdated]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        await load();
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Lỗi kết nối");
      }
    };
    const timer = setTimeout(() => void refresh(), 0),
      interval = setInterval(() => void refresh(), 60000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [load, onUpdated]);
  async function addRole(e: React.FormEvent) {
    e.preventDefault();
    if (!view) return;
    setBusy(true);
    try {
      const catalog = {
        ...view.living.catalog,
        roles: [
          ...view.living.catalog.roles,
          {
            id: `role-${Date.now().toString(36)}`,
            label: role,
            place,
            activity,
            kind,
            greeting,
          },
        ],
      };
      const response = await fetch("/api/living/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revision: view.revision, catalog }),
      });
      if (!response.ok)
        throw Error(
          "Chưa lưu được vai trò; hãy tải lại nếu trạng thái vừa đổi.",
        );
      await load();
      setRole("");
      await onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi lưu vai trò");
    } finally {
      setBusy(false);
    }
  }
  const turn = view?.turns[0],
    weather = view?.context.weather;
  return (
    <section className="living-panel">
      <div className="living-heading">
        <div>
          <span className="section-caption">AN VÀ THÀNH PHỐ ĐANG SỐNG</span>
          <h2>Mỗi ngày, thêm một người quen.</h2>
          <p>
            {view
              ? `${view.context.date} · TP.HCM · ${view.living.residents.length + 3} cư dân · Ngày trải nghiệm ${view.living.daysExperienced}`
              : "Đang lắng nghe nhịp thành phố…"}
          </p>
        </div>
        <button
          className="secondary"
          disabled={busy || view?.world.paused}
          onClick={() => void tick()}
        >
          {busy ? "Đang cập nhật…" : "Tiếp nhịp sinh hoạt"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {view && (
        <>
          <div className="living-context-grid">
            <article>
              <b>Thời tiết TP.HCM</b>
              <strong>
                {weather?.temperature !== null
                  ? `${weather?.temperature}°C`
                  : "Chưa có dữ liệu"}
              </strong>
              <p>
                {weather?.status === "fresh"
                  ? "Dữ liệu cập nhật"
                  : weather?.status === "stale"
                    ? "Dữ liệu đã cũ"
                    : "Nguồn đang không khả dụng"}{" "}
                · {weather?.precipitation ?? "—"} mm mưa
              </p>
              <small>
                {weather?.observedAt
                  ? new Date(weather.observedAt).toLocaleTimeString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Chưa có mốc cập nhật"}{" "}
                ·{" "}
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open-Meteo
                </a>{" "}
                · Dữ liệu mô hình
              </small>
            </article>
            <article>
              <b>Lịch thành phố</b>
              <strong>
                {view.context.calendar.holidays.join(", ") ||
                  (view.context.calendar.weekend
                    ? "Cuối tuần"
                    : "Ngày trong tuần")}
              </strong>
              <p>
                {view.context.calendar.status === "fresh"
                  ? "Đã đọc lịch ngày lễ"
                  : "Nguồn lịch chưa cập nhật"}
              </p>
              <small>{view.context.calendar.coverage}</small>
            </article>
            <article>
              <b>Giao thông & lễ hội</b>
              <p>{view.context.traffic.label}.</p>
              <p>{view.context.festivals.label}.</p>
              {view.context.festivals.source && (
                <small>
                  <a
                    href="https://visithcmc.vn/festivals-events/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    VisitHCMC · lịch sự kiện
                  </a>{" "}
                  ·{" "}
                  {view.context.festivals.status === "fresh"
                    ? "Đã kiểm tra nguồn"
                    : view.context.festivals.status === "stale"
                      ? "Dữ liệu đã cũ"
                      : "Nguồn chưa khả dụng"}
                </small>
              )}
              {view.context.festivals.items
                ?.filter(
                  (item) =>
                    item.startDate <= view.context.date &&
                    item.endDate >= view.context.date,
                )
                .slice(0, 3)
                .map((item) => (
                  <p key={item.url}>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                    <small>
                      {" "}
                      · {item.startDate} – {item.endDate}, theo lịch của nguồn
                    </small>
                  </p>
                ))}
              <small>
                Xe trên bản đồ là mô phỏng, không phải báo cáo kẹt xe.
              </small>
            </article>
          </div>
          <div className="living-needs" aria-label="Nhu cầu mô phỏng của An">
            {[
              ["Năng lượng", view.living.energy],
              ["Độ đói", view.living.hunger],
              ["Kết nối", view.living.social],
            ].map(([label, value]) => (
              <label key={String(label)}>
                {label}
                <meter min="0" max="100" value={Number(value)} />
                <span>{Math.round(Number(value))}/100</span>
              </label>
            ))}
            <small>
              Học hỏi: {view.living.skills.read ?? 0}/100 · Thực hành:{" "}
              {view.living.skills.work ?? 0}/100. Nhu cầu của An được mô phỏng
              theo thời gian; không phải dữ liệu sức khỏe người thật.
            </small>
          </div>
          {turn && (
            <article className="living-turn">
              <span className="section-caption">
                {turn.generator === "local-llm"
                  ? "HỘI THOẠI TỪ MÔ HÌNH LOCAL"
                  : "TÌNH HUỐNG SINH TỪ QUY TẮC"}
              </span>
              <h3>{turn.title}</h3>
              <p>{turn.summary}</p>
              <p className="muted">
                Dự định tại {turn.location} · Hội thoại dự kiến, chỉ phát trên
                bản đồ khi các nhân vật đã gặp.
              </p>
              {turn.dialogue.map((line, i) => (
                <p key={i}>
                  <b>
                    {line.speaker === "an"
                      ? "An"
                      : (view.living.residents.find(
                          (r) => r.id === line.speaker,
                        )?.name ?? "Hàng xóm")}
                    :
                  </b>{" "}
                  {line.text}
                </p>
              ))}
            </article>
          )}
          <details>
            <summary>
              Những người đang sống quanh An ({view.living.residents.length})
            </summary>
            <div className="living-roster">
              {view.living.residents.map((r) => (
                <article key={r.id}>
                  <b style={{ color: r.color }}>{r.name}</b>
                  <p>
                    {
                      view.living.catalog.roles.find((x) => x.id === r.roleId)
                        ?.label
                    }
                  </p>
                  <small>
                    Quen thuộc {r.familiarity}/100 · {r.memories.length} trải
                    nghiệm
                  </small>
                </article>
              ))}
            </div>
          </details>
          <details>
            <summary>Mở thêm một vai trò trong xóm</summary>
            <p>
              Thêm nghề nghiệp, nơi sinh hoạt và cách trò chuyện. Cư dân mới sẽ
              được tạo trong các lượt tiếp theo; không cần sửa mã nguồn.
            </p>
            <form className="living-role-form" onSubmit={addRole}>
              <label>
                Tên vai trò
                <input
                  required
                  maxLength={80}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Ví dụ: Người hướng dẫn vẽ"
                />
              </label>
              <label>
                Nơi sinh hoạt
                <select
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                >
                  {PLACES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                Hoạt động
                <input
                  required
                  maxLength={80}
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                />
              </label>
              <label>
                Nhịp hoạt động
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  {STEP_KINDS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Lời chào
                <textarea
                  required
                  maxLength={240}
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                />
              </label>
              <button className="secondary" disabled={busy}>
                Đón vai trò mới
              </button>
            </form>
          </details>
          <p className="living-footnote">
            Mỗi khung 15 phút có tối đa một lượt được lưu. Khi trang đóng, cần
            tiến trình sinh hoạt riêng tiếp tục chạy; giao diện mở không đồng
            nghĩa AI hoạt động 24/7.
          </p>
        </>
      )}
    </section>
  );
}
